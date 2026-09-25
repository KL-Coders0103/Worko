import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {UnauthorizedException} from '@nestjs/common';
import {Namespace, Socket} from 'socket.io';

import {AuthJwtService} from '../auth/jwt.service';
import {PrismaService} from '../common/prisma/prisma.service';
import configuration, {parseCorsOrigins} from '../config/configuration';

type SocketUser = {
  sub: string;
  role: string;
};

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowedOrigins = parseCorsOrigins(configuration().app.corsOrigins.join(','));

      callback(
        null,
        allowedOrigins.includes(origin),
      );
    },
    credentials: true,
  },
})
export class RealtimeGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Namespace;

  private readonly socketsByUser =
    new Map<string, Set<string>>();

  constructor(
    private readonly authJwtService: AuthJwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const user =
        await this.authenticateSocket(socket);

      socket.data.user = user;

      const sockets =
        this.socketsByUser.get(user.sub) ??
        new Set<string>();

      sockets.add(socket.id);
      this.socketsByUser.set(
        user.sub,
        sockets,
      );

      socket.emit('realtime:ready', {
        userId: user.sub,
      });
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    const user =
      socket.data.user as
        | SocketUser
        | undefined;

    if (!user) {
      return;
    }

    const sockets =
      this.socketsByUser.get(user.sub);

    if (!sockets) {
      return;
    }

    sockets.delete(socket.id);

    if (!sockets.size) {
      this.socketsByUser.delete(
        user.sub,
      );
    }
  }

  notifyWorkers(
    workerUserIds: string[],
    event: string,
    payload: unknown,
  ) {
    for (const userId of workerUserIds) {
      const sockets =
        this.socketsByUser.get(userId);

      if (!sockets) {
        continue;
      }

      for (const socketId of sockets) {
        this.server
          .to(socketId)
          .emit(event, payload);
      }
    }
  }

  notifyUsers(
    userIds: string[],
    event: string,
    payload: unknown,
  ) {
    for (const userId of new Set(userIds)) {
      this.notifyUser(userId, event, payload);
    }
  }

  notifyUser(
    userId: string,
    event: string,
    payload: unknown,
  ) {
    const sockets =
      this.socketsByUser.get(userId);

    if (!sockets) {
      return;
    }

    for (const socketId of sockets) {
      this.server
        .to(socketId)
        .emit(event, payload);
    }
  }

  getConnectedUserRole(socket: Socket): string | null {
    const user = socket.data.user as SocketUser | undefined;
    return user?.role ?? null;
  }

  @SubscribeMessage('realtime:ping')
  handlePing(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload?: {
      timestamp?: number;
    },
  ) {
    return {
      event: 'realtime:pong',
      timestamp:
        payload?.timestamp ??
        Date.now(),
    };
  }

  private async authenticateSocket(
    socket: Socket,
  ): Promise<SocketUser> {
    const authToken =
      socket.handshake.auth
        ?.accessToken;

    const authorization =
      socket.handshake.headers
        .authorization;

    const token =
      typeof authToken === 'string'
        ? authToken
        : typeof authorization ===
            'string' &&
          authorization.startsWith(
            'Bearer ',
          )
        ? authorization.slice(7)
        : null;

    if (!token) {
      throw new UnauthorizedException(
        'Missing access token',
      );
    }

    const payload =
      await this.authJwtService.verifyAccessToken(
        token,
      );

    const user =
      await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
        },
        select: {
          id: true,
          role: true,
          status: true,
        },
      });

    if (
      !user ||
      user.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException(
        'Inactive user',
      );
    }

    return {
      sub: user.id,
      role: user.role,
    };
  }
}
