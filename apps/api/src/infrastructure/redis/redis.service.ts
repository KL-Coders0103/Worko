import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly url: string;
  private ready = false;

  constructor(private readonly config: ConfigService) {
    this.url = this.config.get<string>('REDIS_URL', 'redis://127.0.0.1:16379');
    this.client = new Redis(this.url, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      retryStrategy: times => Math.min(times * 250, 3000),
    });
    this.client.on('ready', () => {
      this.ready = true;
      this.logger.log('Redis connection ready.');
    });
    this.client.on('close', () => {
      this.ready = false;
    });
    this.client.on('error', error => {
      this.ready = false;
      this.logger.warn(`Redis connection error: ${error.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      this.ready = false;
      this.logger.warn(
        `Redis is unavailable; distributed features will fall back to local behavior: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status !== 'end') {
      await this.client.quit().catch(() => undefined);
    }
  }

  isReady(): boolean {
    return this.ready && this.client.status === 'ready';
  }

  getClient(): Redis {
    return this.client;
  }

  duplicate(options?: Redis.RedisOptions): Redis {
    return this.client.duplicate(options);
  }

  async tryAcquireLock(key: string, ttlMs: number): Promise<string | null> {
    if (!this.isReady()) return null;
    const token = randomUUID();
    const result = await this.client.set(key, token, 'PX', ttlMs, 'NX');
    return result === 'OK' ? token : null;
  }

  async releaseLock(key: string, token: string): Promise<void> {
    if (!this.isReady()) return;
    const releaseScript = `
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
      end
      return 0
    `;
    await this.client.eval(releaseScript, 1, key, token);
  }
}
