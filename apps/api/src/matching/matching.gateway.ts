import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

type SocketUser = { id: string; role: string };

@Injectable()
@WebSocketGateway({
  namespace: '/matching',
  cors: { origin: '*', credentials: false },
  transports: ['websocket'],
})
export class MatchingGateway implements OnGatewayConnection {
  private readonly logger = new Logger(MatchingGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.readToken(client);
      if (!token) throw new Error('Missing access token');

      const payload = await this.jwt.verifyAsync<{ sub: string; role: string; typ: string }>(
        token,
        { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET') },
      );
      if (payload.typ !== 'access' || !payload.sub || !payload.role) {
        throw new Error('Invalid access token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, status: true },
      });
      if (!user || user.status !== 'ACTIVE' || user.role !== payload.role) {
        throw new Error('Inactive account');
      }

      client.data.user = { id: user.id, role: user.role } satisfies SocketUser;
      await client.join(this.userRoom(user.id));
      client.emit('matching.connected', { userId: user.id });
    } catch {
      client.emit('matching.error', { message: 'Unauthorized matching socket.' });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('subscribe.requirement')
  async subscribeRequirement(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { requirementId?: string },
  ) {
    const user = client.data.user as SocketUser | undefined;
    if (!user || !body?.requirementId) return { ok: false };

    const requirement = await this.prisma.requirement.findFirst({
      where: { id: body.requirementId, clientId: user.id },
      select: { id: true },
    });
    if (!requirement) return { ok: false };

    await client.join(this.requirementRoom(requirement.id));
    return { ok: true, requirementId: requirement.id };
  }

  emitToUser(userId: string, event: string, data: unknown): void {
    this.server?.to(this.userRoom(userId)).emit(event, data);
  }

  emitToRequirement(requirementId: string, event: string, data: unknown): void {
    this.server?.to(this.requirementRoom(requirementId)).emit(event, data);
  }

  private readToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken) return authToken;

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }

    return null;
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }

  private requirementRoom(requirementId: string): string {
    return `requirement:${requirementId}`;
  }
}
