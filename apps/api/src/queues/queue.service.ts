import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { WORKO_JOB_NAMES, WORKO_QUEUE_NAMES } from './queue.constants';

export type PushNotificationJob = {
  deliveryId: string;
  notificationId: string;
  userId: string;
  deviceId: string;
  token: string;
  title: string;
  body: string;
  data: Record<string, string>;
};

export type AccountRetentionJob = {
  scheduledFor: string;
};

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly connection: Redis;
  readonly notifications: Queue<PushNotificationJob>;
  readonly accountRetention: Queue<AccountRetentionJob>;

  constructor(private readonly config: ConfigService) {
    this.connection = new Redis(
      this.config.get<string>('REDIS_URL', 'redis://127.0.0.1:16379'),
      {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        enableReadyCheck: true,
      },
    );

    const defaults = {
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 2000 },
    };

    this.notifications = new Queue<PushNotificationJob>(WORKO_QUEUE_NAMES.NOTIFICATIONS, {
      connection: this.connection,
      prefix: 'worko',
      defaultJobOptions: {
        ...defaults,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });

    this.accountRetention = new Queue<AccountRetentionJob>(WORKO_QUEUE_NAMES.ACCOUNT_RETENTION, {
      connection: this.connection,
      prefix: 'worko',
      defaultJobOptions: defaults,
    });

    this.connection.on('error', error => {
      this.logger.warn(`Queue Redis error: ${error.message}`);
    });
  }

  isReady(): boolean {
    return this.connection.status === 'ready';
  }

  async enqueuePush(job: PushNotificationJob): Promise<void> {
    await this.notifications.add(WORKO_JOB_NAMES.PUSH_NOTIFICATION, job, {
      jobId: job.deliveryId,
    });
  }

  async enqueueAccountRetention(scheduledFor: Date, delayMs = 0): Promise<void> {
    const bucket = Math.floor(scheduledFor.getTime() / 3_600_000);
    await this.accountRetention.add(
      WORKO_JOB_NAMES.ACCOUNT_RETENTION,
      { scheduledFor: scheduledFor.toISOString() },
      {
        jobId: `retention-${bucket}`,
        delay: Math.max(0, delayMs),
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.notifications.close().catch(() => undefined);
    await this.accountRetention.close().catch(() => undefined);
    await this.connection.quit().catch(() => undefined);
  }
}
