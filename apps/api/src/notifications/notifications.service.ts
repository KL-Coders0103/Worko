import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queues/queue.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  private async pref(userId: string) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async list(userId: string) {
    return {
      data: await this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    };
  }

  async markRead(userId: string, id: string) {
    const n = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    if (!n.count) throw new NotFoundException('Notification not found');
    return { read: true };
  }

  async preferences(userId: string) {
    return { data: await this.pref(userId) };
  }

  async updatePreferences(userId: string, data: Record<string, unknown>) {
    const safeData = data as Prisma.NotificationPreferenceUncheckedUpdateInput;
    const createData = { userId, ...safeData } as Prisma.NotificationPreferenceUncheckedCreateInput;
    return {
      data: await this.prisma.notificationPreference.upsert({
        where: { userId },
        create: createData,
        update: safeData,
      }),
    };
  }

  async registerDevice(
    userId: string,
    data: { token: string; platform: string },
  ) {
    return {
      data: await this.prisma.pushDevice.upsert({
        where: { token: data.token },
        create: {
          userId,
          token: data.token,
          platform: data.platform,
        },
        update: {
          userId,
          platform: data.platform,
          enabled: true,
          lastSeenAt: new Date(),
        },
      }),
    };
  }

  async unregisterDevice(userId: string, token: string) {
    await this.prisma.pushDevice.updateMany({
      where: { userId, token },
      data: { enabled: false, lastSeenAt: new Date() },
    });
    return { disabled: true };
  }

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    dedupeKey: string,
    bookingId?: string,
    data: Record<string, string> = {},
  ) {
    const p = await this.pref(userId);
    const enabled = (p as Record<string, unknown>)[
      type.toLowerCase() + 'Enabled'
    ] ?? true;

    if (!enabled) return { data: null, suppressed: true };

    const existing = await this.prisma.notificationDelivery.findUnique({
      where: { dedupeKey },
    });
    if (existing) {
      return { data: { id: existing.notificationId }, deduplicated: true };
    }

    const n = await this.prisma.notification.create({
      data: { userId, type, title, body, bookingId },
    });

    await this.prisma.notificationDelivery.create({
      data: {
        notificationId: n.id,
        userId,
        channel: 'IN_APP',
        dedupeKey,
        status: 'DELIVERED',
        deliveredAt: new Date(),
        attemptCount: 1,
      },
    });

    const devices = await this.prisma.pushDevice.findMany({
      where: { userId, enabled: true },
      select: { id: true, token: true },
    });

    for (const device of devices) {
      const pushDedupeKey = `${dedupeKey}:push:${device.id}`;
      const delivery = await this.prisma.notificationDelivery.create({
        data: {
          notificationId: n.id,
          userId,
          channel: 'PUSH',
          dedupeKey: pushDedupeKey,
          status: 'PENDING',
          nextAttemptAt: new Date(),
        },
      });

      try {
        await this.queue.enqueuePush({
          deliveryId: delivery.id,
          notificationId: n.id,
          userId,
          deviceId: device.id,
          token: device.token,
          title,
          body,
          data,
        });
      } catch (error) {
        await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'FAILED',
            attemptCount: 1,
            lastError: error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000),
          },
        });
      }
    }

    return { data: n };
  }

  async retryFailed(limit = 100) {
    const rows = await this.prisma.notificationDelivery.findMany({
      where: {
        status: 'FAILED',
        channel: 'PUSH',
        attemptCount: { lt: 5 },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
      },
      include: {
        notification: true,
      },
      take: limit,
    });

    let queued = 0;

    for (const row of rows) {
      const marker = ':push:';
      const markerIndex = row.dedupeKey.lastIndexOf(marker);
      const deviceId =
        markerIndex >= 0 ? row.dedupeKey.slice(markerIndex + marker.length) : '';

      if (!deviceId) continue;

      const device = await this.prisma.pushDevice.findFirst({
        where: { id: deviceId, userId: row.userId, enabled: true },
      });

      if (!device) {
        await this.prisma.notificationDelivery.update({
          where: { id: row.id },
          data: { status: 'FAILED', lastError: 'DEVICE_NOT_AVAILABLE' },
        });
        continue;
      }

      await this.prisma.notificationDelivery.update({
        where: { id: row.id },
        data: { status: 'PENDING', nextAttemptAt: new Date(), lastError: null },
      });

      await this.queue.enqueuePush({
        deliveryId: row.id,
        notificationId: row.notificationId,
        userId: row.userId,
        deviceId: device.id,
        token: device.token,
        title: row.notification.title,
        body: row.notification.body,
        data: { notificationId: row.notificationId, type: row.notification.type },
      });
      queued += 1;
    }

    return { retried: queued };
  }

  async supportCreate(
    userId: string,
    b: { subject: string; description: string; category: string; priority?: string },
  ) {
    return { data: await this.prisma.supportTicket.create({ data: { userId, ...b } }) };
  }

  async supportMine(userId: string) {
    return {
      data: await this.prisma.supportTicket.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    };
  }

  async deactivate(userId: string) {
    return {
      data: await this.prisma.user.update({
        where: { id: userId },
        data: { status: 'SUSPENDED', deactivatedAt: new Date() },
      }),
    };
  }

  async requestDeletion(userId: string) {
    const date = new Date(Date.now() + 30 * 86400000);
    return {
      data: await this.prisma.user.update({
        where: { id: userId },
        data: {
          deletionRequestedAt: new Date(),
          deletionScheduledAt: date,
          status: 'SUSPENDED',
          deactivatedAt: new Date(),
        },
        select: {
          id: true,
          status: true,
          deletionRequestedAt: true,
          deletionScheduledAt: true,
        },
      }),
    };
  }

  async cancelDeletion(userId: string) {
    return {
      data: await this.prisma.user.update({
        where: { id: userId },
        data: {
          deletionRequestedAt: null,
          deletionScheduledAt: null,
          status: 'ACTIVE',
          deactivatedAt: null,
        },
        select: { id: true, status: true },
      }),
    };
  }
}
