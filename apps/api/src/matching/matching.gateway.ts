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
  type OnGatewayInit,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { createAdapter } from '@socket.io/redis-adapter';

type SocketUser = { id: string; role: string };

@Injectable()
@WebSocketGateway({
  namespace: '/matching',
  cors: { origin: '*', credentials: false },
  transports: ['websocket'],
})
export class MatchingGateway implements OnGatewayConnection, OnGatewayInit {
  private readonly logger = new Logger(MatchingGateway.name);
  private redisPub?: ReturnType<RedisService['duplicate']>;
  private redisSub?: ReturnType<RedisService['duplicate']>;

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async afterInit(server: Server): Promise<void> {
    if (!this.redis.isReady()) {
      this.logger.warn('Socket.IO is using the in-memory adapter because Redis is unavailable.');
      return;
    }

    try {
      this.redisPub = this.redis.duplicate({ lazyConnect: true });
      this.redisSub = this.redis.duplicate({ lazyConnect: true });
      await Promise.all([this.redisPub.connect(), this.redisSub.connect()]);
      server.adapter(createAdapter(this.redisPub, this.redisSub));
      this.logger.log('Socket.IO Redis adapter enabled.');
    } catch (error) {
      this.logger.warn(
        `Socket.IO Redis adapter initialization failed; using local adapter: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.redisPub?.quit().catch(() => undefined);
      await this.redisSub?.quit().catch(() => undefined);
      this.redisPub = undefined;
      this.redisSub = undefined;
    }
  }

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

  async onModuleDestroy(): Promise<void> {
    await this.redisPub?.quit().catch(() => undefined);
    await this.redisSub?.quit().catch(() => undefined);
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
