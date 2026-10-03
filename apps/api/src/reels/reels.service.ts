import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  async creatorProfile(creatorId: string) {
    const creator = await this.prisma.user.findFirst({
      where: { id: creatorId, status: 'ACTIVE', role: 'WORKER' },
      select: {
        id: true,
        clientProfile: { select: { fullName: true } },
        workerProfile: { select: { verificationStatus: true, availabilityStatus: true, categories: { select: { category: { select: { id: true, name: true, slug: true } } } } } },
        reels: { where: { moderationStatus: ReelModerationStatus.APPROVED, publishedAt: { not: null } }, orderBy: { publishedAt: 'desc' }, select: { id: true, caption: true, mediaUrl: true, publishedAt: true } },
      },
    });
    if (!creator) throw new NotFoundException('Creator not found');
    return { data: { id: creator.id, displayName: creator.clientProfile?.fullName ?? 'Worko worker', verified: creator.workerProfile?.verificationStatus === 'VERIFIED', availability: creator.workerProfile?.availabilityStatus ?? 'OFFLINE', categories: creator.workerProfile?.categories.map(x => x.category) ?? [], reels: creator.reels } };
  }

  async listComments(reelId: string) {
    const reel = await this.prisma.reel.findFirst({ where: { id: reelId, moderationStatus: ReelModerationStatus.APPROVED, publishedAt: { not: null } }, select: { id: true } });
    if (!reel) throw new NotFoundException('Reel not found');
    const comments = await this.prisma.reelComment.findMany({
      where: { reelId }, orderBy: { createdAt: 'asc' }, take: 100,
      select: { id: true, content: true, createdAt: true, user: { select: { id: true, role: true } } },
    });
    return { data: comments.map(c => ({ ...c, author: { id: c.user.id, displayName: c.user.clientProfile?.fullName ?? 'Worko community member', role: c.user.role }, user: undefined })) };
  }

  async addComment(reelId: string, userId: string, content: string) {
    const normalized = content.trim();
    if (!normalized || normalized.length > 1000) throw new BadRequestException('Comment must contain 1–1000 characters');
    const reel = await this.prisma.reel.findFirst({ where: { id: reelId, moderationStatus: ReelModerationStatus.APPROVED, publishedAt: { not: null } }, select: { id: true } });
    if (!reel) throw new NotFoundException('Reel not found');
    const comment = await this.prisma.reelComment.create({ data: { reelId, userId, content: normalized }, select: { id: true, content: true, createdAt: true } });
    return { data: comment };
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
