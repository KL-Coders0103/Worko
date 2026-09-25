import {BadRequestException, HttpException, HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import {LoginDto, RegisterDto, SendOtpDto, VerifyOtpDto,
} from './dto/auth.dto';
import { AuthJwtService } from './jwt.service';
import { OtpDeliveryService } from './otp-delivery.service';

@Injectable()
export class AuthService {
  private readonly otpExpiryMinutes = 5;
  private readonly maxOtpAttempts = 5;
  private readonly otpCooldownSeconds = 60;

  constructor(
    private readonly prisma: PrismaService, 
    private readonly authJwtService: AuthJwtService,
    private readonly otpDeliveryService: OtpDeliveryService,
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

    // 1. Create the user
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
          id: true, firstName: true, lastName: true, email: true, phoneNumber: true, role: true, status: true,
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
    } catch (error) {
      await this.prisma.user.delete({ where: { id: user.id } });
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }

    return {
      message: 'Registration successful. OTP sent.',
      user,
    };
  }

  async sendOtp(dto: SendOtpDto) {
  const purpose = dto.purpose ?? 'LOGIN';

  const identifier = dto.identifier
    .trim()
    .toLowerCase();

  const channel =
    dto.channel ??
    (identifier.includes('@') ? 'EMAIL' : 'SMS');

  const user = await this.prisma.user.findFirst({
    where:
      channel === 'EMAIL'
        ? { email: identifier }
        : { phoneNumber: identifier },
  });

  if (!user) {
    throw new NotFoundException(
      'No account found for this login method',
    );
  }

  await this.createOtp(
    user.id,
    purpose,
    channel,
  );

  return {
    message:
      channel === 'EMAIL'
        ? 'OTP sent to your email'
        : 'OTP sent to your mobile number',
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

    if (elapsedSeconds < this.otpCooldownSeconds) {
      throw new BadRequestException(
        `Please wait ${Math.ceil(
          this.otpCooldownSeconds - elapsedSeconds,
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

  const otp = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  const codeHash = createHash('sha256')
    .update(otp)
    .digest('hex');

  const expiresAt = new Date(
    now.getTime() +
      this.otpExpiryMinutes * 60 * 1000,
  );

  await this.prisma.otpCode.create({
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
    throw new NotFoundException(
      'User not found',
    );
  }

  const destination =
    channel === 'EMAIL'
      ? user.email
      : user.phoneNumber;

  if (!destination) {
    throw new BadRequestException(
      channel === 'EMAIL'
        ? 'No email address is available for this account'
        : 'No mobile number is available for this account',
    );
  }

  await this.otpDeliveryService.sendOtp({
    channel,
    destination,
    otp,
    purpose,
  });

  return {
    expiresAt,
    channel,
  };
}

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }
}