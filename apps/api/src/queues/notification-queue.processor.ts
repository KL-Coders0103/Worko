import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../infrastructure/firebase/firebase.service';
import { WORKO_JOB_NAMES, WORKO_QUEUE_NAMES } from './queue.constants';
import type { PushNotificationJob } from './queue.service';

@Injectable()
export class NotificationQueueProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueProcessor.name);
  private worker?: Worker<PushNotificationJob>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get<boolean>('FIREBASE_ENABLED', false)) {
      this.logger.log('Push notification worker is disabled because Firebase is disabled.');
      return;
    }

    const connection = new Redis(
      this.config.get<string>('REDIS_URL', 'redis://127.0.0.1:16379'),
      { maxRetriesPerRequest: null },
    );

    this.worker = new Worker<PushNotificationJob>(
      WORKO_QUEUE_NAMES.NOTIFICATIONS,
      async job => {
        if (job.name !== WORKO_JOB_NAMES.PUSH_NOTIFICATION) return;

        try {
          const messageId = await this.firebase.sendToToken(
            job.data.token,
            job.data.title,
            job.data.body,
            job.data.data,
          );

          await this.prisma.notificationDelivery.update({
            where: { id: job.data.deliveryId },
            data: {
              status: 'DELIVERED',
              attemptCount: job.attemptsMade + 1,
              deliveredAt: new Date(),
              nextAttemptAt: null,
              lastError: null,
            },
          });

          return messageId;
        } catch (error) {
          const invalidToken = this.firebase.isInvalidTokenError(error);

          if (invalidToken) {
            await this.prisma.pushDevice.updateMany({
              where: { id: job.data.deviceId },
              data: { enabled: false, lastSeenAt: new Date() },
            });
          }

          const attemptCount = job.attemptsMade + 1;
          const permanent = invalidToken || attemptCount >= 5;

          await this.prisma.notificationDelivery.update({
            where: { id: job.data.deliveryId },
            data: {
              status: permanent ? 'FAILED' : 'PENDING',
              attemptCount,
              nextAttemptAt: permanent ? null : new Date(Date.now() + Math.min(60_000 * 2 ** attemptCount, 3_600_000)),
              lastError: error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000),
            },
          });

          if (permanent) return;
          throw error;
        }
      },
      {
        connection,
        concurrency: 20,
      },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.warn(`Push job ${job?.id ?? 'unknown'} failed: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
  }
}
