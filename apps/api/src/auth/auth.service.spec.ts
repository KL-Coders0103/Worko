import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { AuthOtpPurpose, UserRole, UserStatus } from '@prisma/client';

import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import type { AuthService as AuthServiceType } from './auth.service.js';

import { OtpDeliveryService } from './otp-delivery.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrationRole } from './dto/register.dto';

let AuthService: typeof import('./auth.service.js').AuthService;
let bcrypt: typeof import('bcrypt');

const createMockFunction = () => jest.fn<(...args: any[]) => Promise<any>>();

beforeAll(async () => {
  jest.unstable_mockModule('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
  }));

  bcrypt = await import('bcrypt');

  ({ AuthService } = await import('./auth.service.js'));
});

describe('AuthService', () => {
  let service: AuthServiceType;

  const mockPrisma = {
    user: {
      findFirst: createMockFunction(),
      findUnique: createMockFunction(),
      findUniqueOrThrow: createMockFunction(),
      create: createMockFunction(),
      update: createMockFunction(),
    },

    authOtp: {
      findFirst: createMockFunction(),
      create: createMockFunction(),
      update: createMockFunction(),
    },

    refreshToken: {
      create: createMockFunction(),
      findUnique: createMockFunction(),
      updateMany: createMockFunction(),
    },

    $transaction: jest.fn(),
  };

  const mockJwtService = {
    signAsync: createMockFunction(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        JWT_ACCESS_SECRET: 'test-access-secret-at-least-32-characters',
        JWT_ACCESS_TTL: '15m',
        JWT_REFRESH_TTL_DAYS: 30,
        AUTH_OTP_SECRET: 'test-otp-secret-at-least-32-characters',
        AUTH_OTP_TTL_MINUTES: 5,
        AUTH_OTP_COOLDOWN_SECONDS: 60,
        AUTH_OTP_MAX_ATTEMPTS: 5,
        NODE_ENV: 'test',
      };

      return values[key] ?? fallback;
    }),

    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_ACCESS_SECRET: 'test-access-secret-at-least-32-characters',
        AUTH_OTP_SECRET: 'test-otp-secret-at-least-32-characters',
      };

      return values[key];
    }),
  };

  const mockOtpDelivery = {
    deliver: createMockFunction(),
  };

  const activeClient = {
    id: 'user-uuid-1',
    email: 'client@example.com',
    phone: '+919876543210',
    passwordHash: 'hashed-password',
    role: UserRole.CLIENT,
    status: UserStatus.ACTIVE,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: OtpDeliveryService,
          useValue: mockOtpDelivery,
        },
      ],
    }).compile();

    service = module.get<AuthServiceType>(AuthService);

    mockOtpDelivery.deliver.mockResolvedValue(undefined);
    mockJwtService.signAsync.mockResolvedValue('access-token');
  });

  describe('register', () => {
    it('creates a pending client account and requests an OTP', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      (
        bcrypt.hash as unknown as ReturnType<typeof createMockFunction>
      ).mockResolvedValue('hashed-password');

      mockPrisma.user.create.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'client@example.com',
        phone: '+919876543210',
        role: UserRole.CLIENT,
        status: UserStatus.PENDING_VERIFICATION,
      });

      mockPrisma.authOtp.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        email: 'client@example.com',
        phone: '+919876543210',
      });
      mockPrisma.authOtp.create.mockResolvedValue({});

      const result = await service.register({
        email: 'client@example.com',
        phone: '+919876543210',
        password: 'StrongPassword123!',
        role: RegistrationRole.CLIENT,
      });

      expect(result.message).toContain('Verify your OTP');
      expect(result.user.status).toBe(UserStatus.PENDING_VERIFICATION);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'client@example.com',
            role: UserRole.CLIENT,
            status: UserStatus.PENDING_VERIFICATION,
          }),
        }),
      );

      expect(mockPrisma.authOtp.create).toHaveBeenCalledTimes(1);
      expect(mockOtpDelivery.deliver).toHaveBeenCalledTimes(1);
    });

    it('rejects an already registered email or phone', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-user',
      });

      await expect(
        service.register({
          email: 'client@example.com',
          phone: '+919876543210',
          password: 'StrongPassword123!',
          role: RegistrationRole.CLIENT,
        }),
      ).rejects.toThrow('Email or phone is already registered');

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('registration OTP verification', () => {
    it('activates an account when the OTP is valid', async () => {
      const otp = '123456';

      mockPrisma.user.findUnique.mockResolvedValue({
        ...activeClient,
        status: UserStatus.PENDING_VERIFICATION,
      });

      mockPrisma.authOtp.findFirst.mockResolvedValue({
        id: 'otp-uuid-1',
        userId: activeClient.id,
        purpose: AuthOtpPurpose.REGISTRATION,
        codeHash: createHash('sha256')
          .update(
            `${activeClient.id}:${otp}:test-otp-secret-at-least-32-characters`,
          )
          .digest('hex'),
        attempts: 0,
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
      });

      mockPrisma.authOtp.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({
        id: activeClient.id,
        email: activeClient.email,
        phone: activeClient.phone,
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
      });

      const result = await service.verifyRegistration(activeClient.id, otp);

      expect(result.user.status).toBe(UserStatus.ACTIVE);
      expect(mockPrisma.authOtp.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            consumedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('rejects an invalid OTP and increments attempts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...activeClient,
        status: UserStatus.PENDING_VERIFICATION,
      });

      mockPrisma.authOtp.findFirst.mockResolvedValue({
        id: 'otp-uuid-1',
        userId: activeClient.id,
        purpose: AuthOtpPurpose.REGISTRATION,
        codeHash: 'a'.repeat(64),
        attempts: 0,
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
      });

      mockPrisma.authOtp.update.mockResolvedValue({});

      await expect(
        service.verifyRegistration(activeClient.id, '999999'),
      ).rejects.toThrow('Invalid or expired OTP');

      expect(mockPrisma.authOtp.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            attempts: { increment: 1 },
          },
        }),
      );

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects an expired OTP', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...activeClient,
        status: UserStatus.PENDING_VERIFICATION,
      });

      mockPrisma.authOtp.findFirst.mockResolvedValue({
        id: 'otp-uuid-1',
        userId: activeClient.id,
        purpose: AuthOtpPurpose.REGISTRATION,
        codeHash: 'a'.repeat(64),
        attempts: 0,
        expiresAt: new Date(Date.now() - 60_000),
        consumedAt: null,
      });

      await expect(
        service.verifyRegistration(activeClient.id, '123456'),
      ).rejects.toThrow('Invalid or expired OTP');

      expect(mockPrisma.authOtp.update).not.toHaveBeenCalled();
    });

    it('rejects OTP verification after the attempt limit', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...activeClient,
        status: UserStatus.PENDING_VERIFICATION,
      });

      mockPrisma.authOtp.findFirst.mockResolvedValue({
        id: 'otp-uuid-1',
        userId: activeClient.id,
        purpose: AuthOtpPurpose.REGISTRATION,
        codeHash: 'a'.repeat(64),
        attempts: 5,
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
      });

      await expect(
        service.verifyRegistration(activeClient.id, '123456'),
      ).rejects.toThrow('OTP attempt limit exceeded');
    });
  });

  describe('password login', () => {
    it('creates a session for valid credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(activeClient);
      (
        bcrypt.compare as unknown as ReturnType<typeof createMockFunction>
      ).mockResolvedValue(true);
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.loginWithPassword({
        identifier: 'client@example.com',
        password: 'StrongPassword123!',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBeDefined();
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('rejects an incorrect password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(activeClient);
      (
        bcrypt.compare as unknown as ReturnType<typeof createMockFunction>
      ).mockResolvedValue(false);

      await expect(
        service.loginWithPassword({
          identifier: 'client@example.com',
          password: 'WrongPassword123!',
        }),
      ).rejects.toThrow('Invalid credentials');

      expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('rejects a pending account', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...activeClient,
        status: UserStatus.PENDING_VERIFICATION,
      });
      (
        bcrypt.compare as unknown as ReturnType<typeof createMockFunction>
      ).mockResolvedValue(true);

      await expect(
        service.loginWithPassword({
          identifier: 'client@example.com',
          password: 'StrongPassword123!',
        }),
      ).rejects.toThrow('Please verify your account first');
    });
  });

  describe('OTP login', () => {
    it('creates a session after successful OTP verification', async () => {
      const otp = '123456';

      mockPrisma.user.findFirst.mockResolvedValue(activeClient);
      mockPrisma.authOtp.findFirst.mockResolvedValue({
        id: 'otp-uuid-2',
        userId: activeClient.id,
        purpose: AuthOtpPurpose.LOGIN,
        codeHash: createHash('sha256')
          .update(
            `${activeClient.id}:${otp}:test-otp-secret-at-least-32-characters`,
          )
          .digest('hex'),
        attempts: 0,
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
      });

      mockPrisma.authOtp.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.loginWithOtp('client@example.com', otp);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBeDefined();
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('rejects OTP login for an inactive account', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...activeClient,
        status: UserStatus.PENDING_VERIFICATION,
      });

      await expect(
        service.loginWithOtp('client@example.com', '123456'),
      ).rejects.toThrow('Invalid or expired OTP');
    });
  });

  describe('refresh token rotation', () => {
    it('rotates a valid refresh token', async () => {
      const rawToken = 'a'.repeat(96);
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');

      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'refresh-uuid-1',
        userId: activeClient.id,
        tokenHash,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        user: activeClient,
      });

      mockPrisma.$transaction.mockImplementation(async (callback: any) =>
        callback({
          refreshToken: {
            findUnique: createMockFunction().mockResolvedValue({
              id: 'refresh-uuid-1',
              userId: activeClient.id,
              tokenHash,
              revokedAt: null,
              expiresAt: new Date(Date.now() + 60_000),
              user: activeClient,
            }),
            updateMany: jest
              .fn<() => Promise<{ count: number }>>()
              .mockResolvedValue({ count: 1 }),
            create: createMockFunction().mockResolvedValue({}),
          },
        }),
      );

      const result = await service.refreshSession(rawToken);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(rawToken);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('rejects an unknown refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshSession('unknown-refresh-token'),
      ).rejects.toThrow('Invalid refresh token');
    });

    it('rejects a revoked refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'refresh-uuid-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        user: activeClient,
      });

      await expect(
        service.refreshSession('revoked-refresh-token'),
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('revokes the supplied refresh token', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('a'.repeat(96));

      expect(result.message).toBe('Logged out successfully');
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            revokedAt: null,
          }),
          data: expect.objectContaining({
            revokedAt: expect.any(Date),
          }),
        }),
      );
    });
  });
});
