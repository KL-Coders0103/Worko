import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { WORKO_JOB_NAMES, WORKO_QUEUE_NAMES } from './queue.constants';
import { QueueService, type AccountRetentionJob } from './queue.service';

const HOUR_MS = 3_600_000;

@Injectable()
export class AccountRetentionProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AccountRetentionProcessor.name);
  private worker?: Worker<AccountRetentionJob>;
  private connection?: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly queue: QueueService,
  ) {}

  async onModuleInit(): Promise<void> {
    const connection = new Redis(
      this.config.get<string>('REDIS_URL', 'redis://127.0.0.1:16379'),
      { maxRetriesPerRequest: null, enableReadyCheck: true },
    );

    this.connection = connection;

    this.worker = new Worker<AccountRetentionJob>(
      WORKO_QUEUE_NAMES.ACCOUNT_RETENTION,
      job => this.process(job),
      { connection, prefix: 'worko', concurrency: 1 },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Account retention job ${job?.id ?? 'unknown'} failed: ${error.message}`,
      );
    });

    await this.scheduleNext();
  }

  private async process(job: Job<AccountRetentionJob>): Promise<void> {
    if (job.name !== WORKO_JOB_NAMES.ACCOUNT_RETENTION) return;

    const now = new Date();
    const users = await this.prisma.user.findMany({
      where: {
        status: { not: 'DELETED' },
        deletionScheduledAt: { lte: now },
      },
      select: {
        id: true,
        email: true,
        phone: true,
      },
      take: 100,
    });

    for (const user of users) {
      try {
        await this.prisma.$transaction(async tx => {
          const current = await tx.user.findUnique({
            where: { id: user.id },
            select: { id: true, status: true, deletionScheduledAt: true },
          });

          if (
            !current ||
            current.status === 'DELETED' ||
            !current.deletionScheduledAt ||
            current.deletionScheduledAt > new Date()
          ) {
            return;
          }

          await tx.pushDevice.updateMany({
            where: { userId: current.id },
            data: { enabled: false, lastSeenAt: new Date() },
          });

          await tx.clientProfile.updateMany({
            where: { userId: current.id },
            data: {
              fullName: 'Deleted User',
              photoUrl: null,
              address: null,
              latitude: null,
              longitude: null,
            },
          });

          await tx.workerProfile.updateMany({
            where: { userId: current.id },
            data: {
              displayName: 'Deleted Worker',
              photoUrl: null,
              serviceAreaAddress: null,
              serviceAreaLatitude: null,
              serviceAreaLongitude: null,
            },
          });

          await tx.user.update({
            where: { id: current.id },
            data: {
              email: null,
              phone: null,
              passwordHash: null,
              status: 'DELETED',
              deactivatedAt: new Date(),
              deletionRequestedAt: null,
              deletionScheduledAt: null,
            },
          });

          await tx.auditLog.create({
            data: {
              actorId: null,
              action: 'ACCOUNT_RETENTION_COMPLETED',
              entityType: 'USER',
              entityId: current.id,
              metadata: {
                reason: '30-day account deletion retention elapsed',
              },
            },
          });
        });
      } catch (error) {
        this.logger.error(
          `Account retention failed for user ${user.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    await this.scheduleNext();
  }

  private async scheduleNext(): Promise<void> {
    if (!this.redis.isReady()) {
      this.logger.warn('Redis unavailable; account retention scheduler is paused.');
      return;
    }

    const nextHour = new Date(Math.ceil(Date.now() / HOUR_MS) * HOUR_MS + HOUR_MS);
    const lock = await this.redis.tryAcquireLock(
      `worko:retention:schedule:${Math.floor(nextHour.getTime() / HOUR_MS)}`,
      60_000,
    );

    if (!lock) return;

    try {
      await this.queue.enqueueAccountRetention(nextHour, nextHour.getTime() - Date.now());
    } finally {
      await this.redis
        .releaseLock(
          `worko:retention:schedule:${Math.floor(nextHour.getTime() / HOUR_MS)}`,
          lock,
        )
        .catch(() => undefined);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }
}
