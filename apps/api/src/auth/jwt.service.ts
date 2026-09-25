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

  async verifyAccessToken(token: string) {
    return this.jwtService.verifyAsync<AccessTokenPayload>(
      token,
      {
        secret: process.env.JWT_ACCESS_SECRET,
      },
    );
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

    const refreshToken = randomUUID() + randomUUID();
    const refreshTokenHash = this.hashToken(refreshToken);

    const expiresAt = new Date(
      Date.now() +
        AUTH_CONSTANTS.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
    );

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
      expiresIn: 15 * 60,
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

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    const newRefreshToken = randomUUID() + randomUUID();
    const newRefreshTokenHash = this.hashToken(newRefreshToken);

    const newExpiresAt = new Date(
      Date.now() +
        AUTH_CONSTANTS.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
    );

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

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: {
          id: storedToken.id,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: storedToken.user.id,
          tokenHash: newRefreshTokenHash,
          expiresAt: newExpiresAt,
        },
      }),
    ]);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60,
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

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}