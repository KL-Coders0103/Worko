import { jest } from '@jest/globals';
import {
  BadRequestException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from './auth.service';

describe('AuthService security boundaries', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    otpCode: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const jwt = {};
  const delivery = {sendOtp: jest.fn()};
  const config = {
    get: jest.fn().mockReturnValue(
      '0123456789012345678901234567890123456789012345678901234567890123',
    ),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      prisma as never,
      jwt as never,
      delivery as never,
      config as never,
    );
  });

  it('rejects login for an inactive account', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      status: 'SUSPENDED',
    });

    await expect(
      service.verifyOtp({
        identifier: 'worker@example.com',
        otp: '123456',
        purpose: 'LOGIN',
        channel: 'EMAIL',
      } as never),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects expired OTPs and marks them expired', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: false,
    });
    prisma.otpCode.findFirst.mockResolvedValue({
      id: 'otp-1',
      status: 'ACTIVE',
      attempts: 0,
      codeHash: 'hash',
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(
      service.verifyOtp({
        identifier: 'worker@example.com',
        otp: '123456',
        purpose: 'LOGIN',
        channel: 'EMAIL',
      } as never),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.otpCode.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'otp-1',
          status: 'ACTIVE',
        }),
        data: {status: 'EXPIRED'},
      }),
    );
  });

  it('returns too many attempts when the OTP has reached the limit', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: false,
    });
    prisma.otpCode.findFirst.mockResolvedValue({
      id: 'otp-1',
      status: 'ACTIVE',
      attempts: 5,
      codeHash: 'hash',
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      service.verifyOtp({
        identifier: 'worker@example.com',
        otp: '123456',
        purpose: 'LOGIN',
        channel: 'EMAIL',
      } as never),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
