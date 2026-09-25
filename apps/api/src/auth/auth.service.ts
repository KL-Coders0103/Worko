import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  LoginDto,
  RegisterDto,
  SendOtpDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { AuthJwtService } from './jwt.service';
import { OtpDeliveryService } from './otp-delivery.service';
import { AUTH_CONSTANTS } from './auth.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authJwtService: AuthJwtService,
    private readonly otpDeliveryService: OtpDeliveryService,
    private readonly configService: ConfigService,
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

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          firstName: dto.firstName.trim(),
          lastName: dto.lastName?.trim(),
          email,
          phoneNumber,
          role: dto.role,
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

      if (dto.role === 'WORKER') {
        await tx.worker.create({
          data: {
            userId: createdUser.id,
            status: 'DRAFT',
            isAvailable: true,
          },
        });
      }

      return createdUser;
    });

    try {
      await this.createOtp(user.id, 'REGISTRATION', 'EMAIL');
    } catch {
      await this.prisma.user.delete({ where: { id: user.id } });

      throw new BadRequestException(
        'Failed to send OTP. Please try again.',
      );
    }

    return {
      message: 'Registration successful. OTP sent.',
      user,
    };
  }

  async sendOtp(dto: SendOtpDto) {
    const purpose = dto.purpose ?? 'LOGIN';
    const identifier = dto.identifier.trim().toLowerCase();

    const channel =
      dto.channel ??
      (identifier.includes('@') ? 'EMAIL' : 'SMS');

    if (channel === 'EMAIL' && !identifier.includes('@')) {
      throw new BadRequestException(
        'Email channel requires an email identifier',
      );
    }

    if (channel === 'SMS' && identifier.includes('@')) {
      throw new BadRequestException(
        'SMS channel requires a phone identifier',
      );
    }

    const user = await this.prisma.user.findUnique({
      where:
        channel === 'EMAIL'
          ? { email: identifier }
          : { phoneNumber: dto.identifier.trim() },
    });

    if (!user) {
      throw new NotFoundException(
        'No account found for this login method',
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'User account is not active',
      );
    }

    await this.createOtp(user.id, purpose, channel);

    return {
      message:
        channel === 'EMAIL'
          ? 'OTP sent to your email'
          : 'OTP sent to your mobile number',
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const purpose = dto.purpose ?? 'LOGIN';
    const identifier = dto.identifier.trim();
    const normalizedIdentifier = identifier.toLowerCase();

    const channel =
      dto.channel ??
      (normalizedIdentifier.includes('@') ? 'EMAIL' : 'SMS');

    if (channel === 'EMAIL' && !normalizedIdentifier.includes('@')) {
      throw new BadRequestException(
        'Email channel requires an email identifier',
      );
    }

    if (channel === 'SMS' && normalizedIdentifier.includes('@')) {
      throw new BadRequestException(
        'SMS channel requires a phone identifier',
      );
    }

    const user = await this.prisma.user.findUnique({
      where:
        channel === 'EMAIL'
          ? { email: normalizedIdentifier }
          : { phoneNumber: identifier },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'User account is not active',
      );
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

    const now = new Date();

    if (otpRecord.expiresAt <= now) {
      await this.prisma.otpCode.updateMany({
        where: {
          id: otpRecord.id,
          status: 'ACTIVE',
        },
        data: {
          status: 'EXPIRED',
        },
      });

      throw new BadRequestException('OTP has expired');
    }

    if (otpRecord.attempts >= AUTH_CONSTANTS.maxOtpAttempts) {
      await this.prisma.otpCode.updateMany({
        where: {
          id: otpRecord.id,
          status: 'ACTIVE',
        },
        data: {
          status: 'LOCKED',
        },
      });

      throw new HttpException(
        'Too many OTP attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const suppliedHash = this.hashOtp(dto.otp);

    if (suppliedHash !== otpRecord.codeHash) {
      const failedAttempt = await this.prisma.otpCode.updateMany({
        where: {
          id: otpRecord.id,
          status: 'ACTIVE',
          expiresAt: {
            gt: now,
          },
          attempts: {
            lt: AUTH_CONSTANTS.maxOtpAttempts,
          },
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      if (failedAttempt.count === 0) {
        throw new HttpException(
          'Too many OTP attempts',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const updatedOtp = await this.prisma.otpCode.findUnique({
        where: {
          id: otpRecord.id,
        },
        select: {
          attempts: true,
          status: true,
        },
      });

      if (
        updatedOtp &&
        updatedOtp.attempts >= AUTH_CONSTANTS.maxOtpAttempts
      ) {
        await this.prisma.otpCode.updateMany({
          where: {
            id: otpRecord.id,
            status: 'ACTIVE',
          },
          data: {
            status: 'LOCKED',
          },
        });

        throw new HttpException(
          'Too many OTP attempts',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new BadRequestException('Invalid OTP');
    }

    const verifiedAt = new Date();

    const verified = await this.prisma.$transaction(async (tx) => {
      const consumedOtp = await tx.otpCode.updateMany({
        where: {
          id: otpRecord.id,
          status: 'ACTIVE',
          expiresAt: {
            gt: verifiedAt,
          },
          attempts: {
            lt: AUTH_CONSTANTS.maxOtpAttempts,
          },
          codeHash: suppliedHash,
        },
        data: {
          status: 'VERIFIED',
          verifiedAt,
        },
      });

      if (consumedOtp.count !== 1) {
        throw new BadRequestException('Invalid or expired OTP');
      }

      return tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          emailVerified:
            channel === 'EMAIL' &&
            (purpose === 'EMAIL_VERIFICATION' ||
              purpose === 'REGISTRATION')
              ? true
              : user.emailVerified,
          phoneVerified:
            channel === 'SMS' &&
            purpose === 'PHONE_VERIFICATION'
              ? true
              : user.phoneVerified,
          lastLoginAt:
            purpose === 'LOGIN'
              ? verifiedAt
              : user.lastLoginAt,
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
    });

    const tokens = await this.authJwtService.issueTokens({
      id: verified.id,
      role: verified.role,
      status: verified.status,
    });

    return {
      message: 'OTP verified successfully',
      user: verified,
      tokens,
    };
  }

  async login(dto: LoginDto) {
    return this.verifyOtp({
      identifier: dto.identifier,
      otp: dto.otp,
      purpose: 'LOGIN',
      channel: dto.channel,
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

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      message: 'Logged out from all sessions successfully',
    };
  }

  private async createOtp(
    userId: string,
    purpose:
      | 'LOGIN'
      | 'REGISTRATION'
      | 'PHONE_VERIFICATION'
      | 'EMAIL_VERIFICATION',
    channel: 'EMAIL' | 'SMS',
  ) {
    const now = new Date();

    const latestOtp = await this.prisma.otpCode.findFirst({
      where: {
        userId,
        purpose,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (latestOtp) {
      const elapsedSeconds =
        (now.getTime() - latestOtp.createdAt.getTime()) /
        1000;

      if (elapsedSeconds < AUTH_CONSTANTS.otpCooldownSeconds) {
        throw new BadRequestException(
          `Please wait ${Math.ceil(
            AUTH_CONSTANTS.otpCooldownSeconds - elapsedSeconds,
          )} seconds before requesting another OTP`,
        );
      }
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
    const codeHash = this.hashOtp(otp);

    const expiresAt = new Date(
      now.getTime() +
        AUTH_CONSTANTS.otpExpiryMinutes * 60 * 1000,
    );

    const otpRecord = await this.prisma.otpCode.create({
      data: {
        userId,
        purpose,
        status: 'ACTIVE',
        codeHash,
        expiresAt,
        attempts: 0,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        email: true,
        phoneNumber: true,
      },
    });

    if (!user) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { status: 'EXPIRED' },
      });

      throw new NotFoundException('User not found');
    }

    const destination =
      channel === 'EMAIL'
        ? user.email
        : user.phoneNumber;

    if (!destination) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { status: 'EXPIRED' },
      });

      throw new BadRequestException(
        channel === 'EMAIL'
          ? 'No email address is available for this account'
          : 'No mobile number is available for this account',
      );
    }

    try {
      await this.otpDeliveryService.sendOtp({
        channel,
        destination,
        otp,
        purpose,
      });
    } catch (error) {
      await this.prisma.otpCode.updateMany({
        where: {
          id: otpRecord.id,
          status: 'ACTIVE',
        },
        data: {
          status: 'EXPIRED',
        },
      });

      throw error;
    }

    return {
      expiresAt,
      channel,
    };
  }

  private hashOtp(otp: string): string {
    const secret =
      this.configService.get<string>('auth.otpHashSecret');

    if (!secret) {
      throw new InternalServerErrorException(
        'OTP hashing secret is not configured',
      );
    }

    return createHmac('sha256', secret)
      .update(otp)
      .digest('hex');
  }
}
