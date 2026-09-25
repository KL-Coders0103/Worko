import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { AUTH_CONSTANTS } from './auth.constants';

export interface AccessTokenPayload {
  sub: string;
  role: string;
  jti: string;
}

@Injectable()
export class AuthJwtService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: process.env.JWT_ACCESS_SECRET,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (
      !user ||
      user.status !== 'ACTIVE' ||
      user.role !== payload.role
    ) {
      throw new UnauthorizedException('User account is not active');
    }

    return payload;
  }

  async issueTokens(user: {
    id: string;
    role: string;
    status: string;
  }) {
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    const jti = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        role: user.role,
        jti,
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: AUTH_CONSTANTS.accessTokenExpiresIn,
      },
    );

    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashToken(refreshToken);

    const expiresAt = this.getRefreshTokenExpiry();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: AUTH_CONSTANTS.accessTokenExpiresInSeconds,
    };
  }

  async rotateRefreshToken(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.revokedAt) {
      await this.revokeAllRefreshTokens(storedToken.userId);

      throw new UnauthorizedException(
        'Refresh token reuse detected. Please sign in again.',
      );
    }

    if (storedToken.expiresAt <= new Date()) {
      await this.revokeAllRefreshTokens(storedToken.userId);

      throw new UnauthorizedException('Refresh token has expired');
    }

    if (storedToken.user.status !== 'ACTIVE') {
      await this.revokeAllRefreshTokens(storedToken.userId);

      throw new UnauthorizedException('User account is not active');
    }

    const newRefreshToken = this.generateRefreshToken();
    const newRefreshTokenHash = this.hashToken(newRefreshToken);
    const newExpiresAt = this.getRefreshTokenExpiry();
    const accessJti = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      {
        sub: storedToken.user.id,
        role: storedToken.user.role,
        jti: accessJti,
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: AUTH_CONSTANTS.accessTokenExpiresIn,
      },
    );

    try {
      await this.prisma.$transaction(async (tx) => {
        const revoked = await tx.refreshToken.updateMany({
          where: {
            id: storedToken.id,
            revokedAt: null,
            expiresAt: {
              gt: new Date(),
            },
          },
          data: {
            revokedAt: new Date(),
          },
        });

        if (revoked.count !== 1) {
          throw new UnauthorizedException(
            'Refresh token reuse detected. Please sign in again.',
          );
        }

        await tx.refreshToken.create({
          data: {
            userId: storedToken.user.id,
            tokenHash: newRefreshTokenHash,
            expiresAt: newExpiresAt,
          },
        });
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        await this.revokeAllRefreshTokens(storedToken.userId);
      }

      throw error;
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: AUTH_CONSTANTS.accessTokenExpiresInSeconds,
    };
  }

  async revokeRefreshToken(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async revokeAllRefreshTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private generateRefreshToken(): string {
    return randomUUID() + randomUUID();
  }

  private getRefreshTokenExpiry(): Date {
    return new Date(
      Date.now() +
        AUTH_CONSTANTS.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
