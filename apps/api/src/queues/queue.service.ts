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

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly connection: Redis;
  readonly notifications: Queue<PushNotificationJob>;

  constructor(private readonly config: ConfigService) {
    this.connection = new Redis(
      this.config.get<string>('REDIS_URL', 'redis://127.0.0.1:16379'),
      {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      },
    );
    this.notifications = new Queue<PushNotificationJob>(WORKO_QUEUE_NAMES.NOTIFICATIONS, {
      connection: this.connection,
      prefix: 'worko',
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 2000 },
      },
    });
    this.connection.on('error', error => {
      this.logger.warn(`Queue Redis error: ${error.message}`);
    });
  }

  async enqueuePush(job: PushNotificationJob): Promise<void> {
    await this.notifications.add(WORKO_JOB_NAMES.PUSH_NOTIFICATION, job, {
      jobId: job.deliveryId,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.notifications.close().catch(() => undefined);
    await this.connection.quit().catch(() => undefined);
  }
}
