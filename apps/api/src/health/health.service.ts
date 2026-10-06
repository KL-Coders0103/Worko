import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { FirebaseService } from '../infrastructure/firebase/firebase.service';
import { QueueService } from '../queues/queue.service';

@Injectable()
export class HealthService {
  private readonly startedAt = new Date();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly firebase: FirebaseService,
    private readonly queue: QueueService,
  ) {}

  async getHealth() {
    let database = false;

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      database = true;
    } catch {
      database = false;
    }

    const redis = this.redis.isReady();
    const queue = this.queue.isReady();

    return {
      status: database && redis ? 'ok' : 'degraded',
      service: 'worko-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt: this.startedAt.toISOString(),
      dependencies: {
        database: database ? 'ready' : 'unavailable',
        redis: redis ? 'ready' : 'unavailable',
        queue: queue ? 'ready' : 'unavailable',
        firebase: this.firebase.isEnabled() ? 'configured' : 'disabled',
      },
    };
  }
}