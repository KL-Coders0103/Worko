import { Injectable, NotFoundException } from '@nestjs/common';
import { EngagementType, ReelModerationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReelsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished() {
    const reels = await this.prisma.reel.findMany({
      where: { moderationStatus: ReelModerationStatus.APPROVED, publishedAt: { not: null } },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 30,
      select: {
        id: true, mediaUrl: true, caption: true, publishedAt: true,
        creator: { select: { id: true, role: true, workerProfile: { select: { verificationStatus: true } } } },
        engagements: { where: { type: EngagementType.SAVE }, select: { id: true } },
      },
    });
    return { data: reels.map(({ engagements, ...reel }) => ({ ...reel, savedCount: engagements.length })) };
  }

  async save(reelId: string, userId: string) {
    const reel = await this.prisma.reel.findFirst({
      where: { id: reelId, moderationStatus: ReelModerationStatus.APPROVED, publishedAt: { not: null } },
      select: { id: true },
    });
    if (!reel) throw new NotFoundException('Reel not found');
    await this.prisma.reelEngagement.upsert({
      where: { reelId_userId_type: { reelId, userId, type: EngagementType.SAVE } },
      create: { reelId, userId, type: EngagementType.SAVE },
      update: {},
    });
    return { saved: true };
  }

  async unsave(reelId: string, userId: string) {
    await this.prisma.reelEngagement.deleteMany({
      where: { reelId, userId, type: EngagementType.SAVE },
    });
    return { saved: false };
  }

  async savedByUser(userId: string) {
    const rows = await this.prisma.reelEngagement.findMany({
      where: { userId, type: EngagementType.SAVE, reel: { moderationStatus: ReelModerationStatus.APPROVED, publishedAt: { not: null } } },
      orderBy: { createdAt: 'desc' },
      select: { reel: { select: { id: true, mediaUrl: true, caption: true, publishedAt: true, creator: { select: { id: true, role: true } } } } },
    });
    return { data: rows.map(row => row.reel) };
  }
}
