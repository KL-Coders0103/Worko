import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../infrastructure/firebase/firebase.service';
import { WORKO_JOB_NAMES, WORKO_QUEUE_NAMES } from './queue.constants';
import type { PushNotificationJob } from './queue.service';

@Injectable()
export class NotificationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationWorker.name);
  private readonly connection: Redis;
  private worker?: Worker<PushNotificationJob>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
  ) {
    this.connection = new Redis(
      this.config.get<string>('REDIS_URL', 'redis://127.0.0.1:16379'),
      { maxRetriesPerRequest: null, enableReadyCheck: true },
    );
  }

  onModuleInit(): void {
    this.worker = new Worker<PushNotificationJob>(
      WORKO_QUEUE_NAMES.NOTIFICATIONS,
      async (job) => this.process(job),
      {
        connection: this.connection,
        prefix: 'worko',
        concurrency: 10,
      },
    );
    this.worker.on('completed', job => this.logger.debug(`Push job ${job.id} completed.`));
    this.worker.on('failed', (job, error) => {
      this.logger.warn(`Push job ${job?.id ?? 'unknown'} failed: ${error.message}`);
    });
  }

  private async process(job: Job<PushNotificationJob>): Promise<void> {
    if (job.name !== WORKO_JOB_NAMES.PUSH_NOTIFICATION) return;
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id: job.data.deliveryId },
    });
    if (!delivery || delivery.status === 'DELIVERED') return;

    if (!this.firebase.isEnabled()) {
      await this.prisma.notificationDelivery.update({
        where: { id: job.data.deliveryId },
        data: {
          status: 'FAILED',
          attemptCount: { increment: 1 },
          lastError: 'FIREBASE_DISABLED',
          nextAttemptAt: null,
        },
      });
      return;
    }

    try {
      await this.firebase.sendToToken(job.data.token, job.data.title, job.data.body, job.data.data);
      await this.prisma.notificationDelivery.update({
        where: { id: job.data.deliveryId },
        data: {
          status: 'DELIVERED',
          attemptCount: { increment: 1 },
          deliveredAt: new Date(),
          nextAttemptAt: null,
          lastError: null,
        },
      });
    } catch (error) {
      if (this.firebase.isInvalidTokenError(error)) {
        await this.prisma.pushDevice.updateMany({
          where: { id: job.data.deviceId, token: job.data.token },
          data: { enabled: false, lastSeenAt: new Date() },
        });
        await this.prisma.notificationDelivery.update({
          where: { id: job.data.deliveryId },
          data: {
            status: 'FAILED',
            attemptCount: { increment: 1 },
            lastError: 'INVALID_FCM_TOKEN',
            nextAttemptAt: null,
          },
        });
        return;
      }

      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.connection.quit().catch(() => undefined);
  }
}
