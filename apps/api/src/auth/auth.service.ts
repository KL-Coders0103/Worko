import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AuthOtpPurpose,
  UserRole,
  UserStatus,
} from '@prisma/client';
import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { OtpDeliveryService } from './otp-delivery.service';
import { RegisterDto } from './dto/register.dto';
import { PasswordLoginDto } from './dto/password-login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly otpDelivery: OtpDeliveryService,
  ) {}

  private get otpTtlMinutes(): number {
    return this.config.get<number>('AUTH_OTP_TTL_MINUTES', 5);
  }

  private get otpCooldownSeconds(): number {
    return this.config.get<number>('AUTH_OTP_COOLDOWN_SECONDS', 60);
  }

  private get otpMaxAttempts(): number {
    return this.config.get<number>('AUTH_OTP_MAX_ATTEMPTS', 5);
  }

  private normalizeIdentifier(identifier: string): string {
    const value = identifier.trim();

    if (value.includes('@')) {
      return value.toLowerCase();
    }

    return value.replace(/\s+/g, '');
  }

  private async findUserByIdentifier(identifier: string) {
    const normalized = this.normalizeIdentifier(identifier);

    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: normalized },
          { phone: normalized },
        ],
      },
    });
  }

  private hashOtp(userId: string, code: string): string {
    const secret = this.config.getOrThrow<string>('AUTH_OTP_SECRET');

    return createHash('sha256')
      .update(`${userId}:${code}:${secret}`)
      .digest('hex');
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private safeCompareHash(left: string, right: string): boolean {
    const a = Buffer.from(left, 'hex');
    const b = Buffer.from(right, 'hex');

    return a.length === b.length && timingSafeEqual(a, b);
  }

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const phone = this.normalizeIdentifier(dto.phone);

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Email or phone is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    let user;

    try {
      user = await this.prisma.user.create({
        data: {
          email,
          phone,
          passwordHash,
          role: dto.role as UserRole,
          status: UserStatus.PENDING_VERIFICATION,
          ...(dto.role === UserRole.WORKER
            ? { workerProfile: { create: {} } }
            : {}),
        },
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          status: true,
        },
      });
    } catch (error) {
      // Handles a duplicate registration race at the database constraint.
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email or phone is already registered');
      }

      throw error;
    }

    await this.issueOtp(user.id, AuthOtpPurpose.REGISTRATION);

    return {
      message: 'Account created. Verify your OTP to activate it.',
      user,
    };
  }

  async requestOtp(identifier: string, purpose: AuthOtpPurpose) {
    const user = await this.findUserByIdentifier(identifier);

    // Avoid disclosing whether an account exists during login OTP requests.
    if (!user) {
      if (purpose === AuthOtpPurpose.LOGIN) {
        return {
          message: 'If the account exists, an OTP will be sent.',
        };
      }

      throw new BadRequestException('Account not found');
    }

    if (purpose === AuthOtpPurpose.LOGIN && user.status !== UserStatus.ACTIVE) {
      return {
        message: 'If the account exists, an OTP will be sent.',
      };
    }

    if (
      purpose === AuthOtpPurpose.REGISTRATION &&
      user.status === UserStatus.ACTIVE
    ) {
      throw new ConflictException('Account is already verified');
    }

    await this.issueOtp(user.id, purpose);

    return {
      message: 'If the account is eligible, an OTP will be sent.',
    };
  }

  private async issueOtp(userId: string, purpose: AuthOtpPurpose) {
    const now = new Date();

    const latest = await this.prisma.authOtp.findFirst({
      where: {
        userId,
        purpose,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (
      latest &&
      now.getTime() - latest.createdAt.getTime() <
        this.otpCooldownSeconds * 1000
    ) {
      throw new BadRequestException(
        `Please wait ${this.otpCooldownSeconds} seconds before requesting another OTP`,
      );
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, phone: true },
    });

    const destination = user.email ?? user.phone;

    if (!destination) {
      throw new BadRequestException('Account has no verified contact method');
    }

    const code = this.generateOtp();

    await this.prisma.authOtp.create({
      data: {
        userId,
        destination,
        purpose,
        codeHash: this.hashOtp(userId, code),
        expiresAt: new Date(
          now.getTime() + this.otpTtlMinutes * 60 * 1000,
        ),
      },
    });

    await this.otpDelivery.deliver(destination, code);
  }

  private async consumeOtp(
    userId: string,
    purpose: AuthOtpPurpose,
    code: string,
  ): Promise<void> {
    const otp = await this.prisma.authOtp.findFirst({
      where: {
        userId,
        purpose,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    if (otp.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    if (otp.attempts >= this.otpMaxAttempts) {
      throw new UnauthorizedException('OTP attempt limit exceeded');
    }

    const valid = this.safeCompareHash(
      otp.codeHash,
      this.hashOtp(userId, code),
    );

    if (!valid) {
      await this.prisma.authOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });

      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.prisma.authOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
  }

  async verifyRegistration(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new ConflictException('Account is already verified');
    }

    await this.consumeOtp(userId, AuthOtpPurpose.REGISTRATION, code);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
      },
    });

    return {
      message: 'Account verified successfully. You can now log in.',
      user: updatedUser,
    };
  }

  async loginWithPassword(dto: PasswordLoginDto) {
    const user = await this.findUserByIdentifier(dto.identifier);

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.assertAccountCanLogin(user.status);

    return this.createSession(user.id, user.role);
  }

  async loginWithOtp(identifier: string, code: string) {
    const user = await this.findUserByIdentifier(identifier);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.consumeOtp(user.id, AuthOtpPurpose.LOGIN, code);

    return this.createSession(user.id, user.role);
  }

  private assertAccountCanLogin(status: UserStatus): void {
    if (status === UserStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException('Please verify your account first');
    }

    if (status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not allowed to log in');
    }
  }

  private async createSession(userId: string, role: UserRole) {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        role,
        typ: 'access',
      },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m') as never,
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    const refreshTtlDays = this.config.get<number>(
      'JWT_REFRESH_TTL_DAYS',
      30,
    );

    const expiresAt = new Date(
      Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshTokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m'),
    };
  }

  async refreshSession(rawToken: string) {
    const tokenHash = this.hashRefreshToken(rawToken);

    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (
      !existing ||
      existing.revokedAt ||
      existing.expiresAt.getTime() <= Date.now() ||
      existing.user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const nextRawToken = randomBytes(48).toString('hex');
    const nextHash = this.hashRefreshToken(nextRawToken);
    const refreshTtlDays = this.config.get<number>(
      'JWT_REFRESH_TTL_DAYS',
      30,
    );

    const nextExpiresAt = new Date(
      Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000,
    );

    const accessToken = await this.jwtService.signAsync(
      {
        sub: existing.user.id,
        role: existing.user.role,
        typ: 'access',
      },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m') as never,
      },
    );

    await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.updateMany({
        where: {
          id: existing.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          replacedBy: nextHash,
        },
      });

      if (revoked.count !== 1) {
        throw new UnauthorizedException('Refresh token already used');
      }

      await tx.refreshToken.create({
        data: {
          userId: existing.user.id,
          tokenHash: nextHash,
          expiresAt: nextExpiresAt,
        },
      });
    });

    return {
      accessToken,
      refreshToken: nextRawToken,
      tokenType: 'Bearer',
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m'),
    };
  }

  async logout(rawToken: string) {
    const tokenHash = this.hashRefreshToken(rawToken);

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        workerProfile: {
          select: {
            id: true,
            verificationStatus: true,
            availabilityStatus: true,
          },
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    return user;
  }
}