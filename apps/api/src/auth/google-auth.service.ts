import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthJwtService } from './jwt.service';

@Injectable()
export class GoogleAuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly authJwtService: AuthJwtService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID is not configured');
    }

    this.googleClient = new OAuth2Client(clientId);
  }

  async authenticate(idToken: string) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID is not configured');
    }

    let payload;

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: clientId,
      });

      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException(
        'Google account information is incomplete',
      );
    }

    const googleId = payload.sub;
    const email = payload.email;

    let user = await this.prisma.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            authProvider: 'GOOGLE',
            emailVerified: true,
          },
        });
      }
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          googleId,
          email,
          firstName: payload.given_name ?? null,
          lastName: payload.family_name ?? null,
          emailVerified: true,
          authProvider: 'GOOGLE',
          role: 'CLIENT',
          status: 'ACTIVE',
        },
      });
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    const tokens = await this.authJwtService.issueTokens(user);

    return {
      message: 'Google authentication successful',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
      },
      tokens,
    };
  }
}