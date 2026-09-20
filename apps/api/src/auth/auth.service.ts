import {BadRequestException, HttpException, HttpStatus,
  Injectable,
  UnauthorizedException} from '@nestjs/common';
import { randomInt, createHash } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import {LoginDto, RegisterDto, SendOtpDto, VerifyOtpDto,
} from './dto/auth.dto';
import { AuthJwtService } from './jwt.service';

@Injectable()
export class AuthService {
  private readonly otpExpiryMinutes = 5;
  private readonly maxOtpAttempts = 5;
  private readonly otpCooldownSeconds = 60;

  constructor(
    private readonly prisma: PrismaService, 
    private readonly authJwtService: AuthJwtService
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const phoneNumber = dto.phoneNumber.trim();

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phoneNumber }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName?.trim(),
        email,
        phoneNumber,
        role: 'CLIENT',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        status: true,
      },
    });

    await this.createOtp(user.id, 'REGISTRATION');

    return {
      message: 'Registration successful. OTP sent.',
      user,
    };
  }

  async sendOtp(dto: SendOtpDto) {
    const purpose = dto.purpose ?? 'LOGIN';
    const identifier = dto.identifier.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phoneNumber: identifier }],
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.createOtp(user.id, purpose);

    return {
      message: 'OTP sent successfully',
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const purpose = dto.purpose ?? 'LOGIN';
    const identifier = dto.identifier.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phoneNumber: identifier }],
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        userId: user.id,
        purpose,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (otpRecord.expiresAt <= new Date()) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { status: 'EXPIRED' },
      });

      throw new BadRequestException('OTP has expired');
    }

    if (otpRecord.attempts >= this.maxOtpAttempts) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { status: 'LOCKED' },
      });

     throw new HttpException('Too many OTP attempts',HttpStatus.TOO_MANY_REQUESTS);
    }

    const suppliedHash = this.hashOtp(dto.otp);

    if (suppliedHash !== otpRecord.codeHash) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.$transaction([
      this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified:
            purpose === 'EMAIL_VERIFICATION'
              ? true
              : user.emailVerified,
          phoneVerified:
            purpose === 'PHONE_VERIFICATION'
              ? true
              : user.phoneVerified,
          lastLoginAt:
            purpose === 'LOGIN' ? new Date() : user.lastLoginAt,
        },
      }),
    ]);

    const tokens = await this.authJwtService.issueTokens({
      id: user.id,
      role: user.role,
      status: user.status
    });

    return {
      message: 'OTP verified successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
      },
      tokens
    };
  }

  async login(dto: LoginDto) {
    return this.verifyOtp({
      identifier: dto.identifier,
      otp: dto.otp,
      purpose: 'LOGIN',
    });
  }

  async getCurrentUser(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    throw new UnauthorizedException(
      'User account not found',
    );
  }

  if (user.status !== 'ACTIVE') {
    throw new UnauthorizedException(
      'User account is not active',
    );
  }

  return {
    user,
  };
}

  private async createOtp(
    userId: string,
    purpose:
      | 'LOGIN'
      | 'REGISTRATION'
      | 'PHONE_VERIFICATION'
      | 'EMAIL_VERIFICATION',
  ) {
    const cooldownStart = new Date(
      Date.now() - this.otpCooldownSeconds * 1000,
    );

    const recentOtp = await this.prisma.otpCode.findFirst({
      where: {
        userId,
        purpose,
        createdAt: {
          gte: cooldownStart,
        },
      },
    });

    if (recentOtp) {
      throw new HttpException('Please wait before requesting another OTP', HttpStatus.TOO_MANY_REQUESTS);
    }

    await this.prisma.otpCode.updateMany({
      where: {
        userId,
        purpose,
        status: 'ACTIVE',
      },
      data: {
        status: 'EXPIRED',
      },
    });

    const otp = randomInt(100000, 1000000).toString();

    await this.prisma.otpCode.create({
      data: {
        userId,
        purpose,
        codeHash: this.hashOtp(otp),
        expiresAt: new Date(
          Date.now() + this.otpExpiryMinutes * 60 * 1000,
        ),
      },
    });

    // Development only.
    console.log(`[DEV OTP] user=${userId} purpose=${purpose} otp=${otp}`);
  }

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }
}