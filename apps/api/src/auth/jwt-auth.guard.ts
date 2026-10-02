import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  typ: 'access';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: { id: string; role: UserRole };
    }>();

    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing access token');
    }

    const token = authorization.slice(7);

    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (
      payload.typ !== 'access' ||
      !payload.sub ||
      !Object.values(UserRole).includes(payload.role)
    ) {
      throw new UnauthorizedException('Invalid access token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!user || user.status !== 'ACTIVE' || user.role !== payload.role) {
      throw new UnauthorizedException('Account is not active');
    }

    request.user = {
      id: user.id,
      role: user.role,
    };

    return true;
  }
}