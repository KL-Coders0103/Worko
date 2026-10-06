import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { EngagementType, ReelModerationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReelsService } from './reels.service';
import { StorageService } from '../storage/storage.service';

describe('ReelsService', () => {
  let service: ReelsService;
  const prisma = {
  reel: {
    findMany: jest.fn<(...args: any[]) => Promise<any>>(),
    findFirst: jest.fn<(...args: any[]) => Promise<any>>(),
  },
  reelEngagement: {
    upsert: jest.fn<(...args: any[]) => Promise<any>>(),
    deleteMany: jest.fn<(...args: any[]) => Promise<any>>(),
    findMany: jest.fn<(...args: any[]) => Promise<any>>(),
  },
};

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReelsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: { uploadReelVideo: jest.fn() } },
      ],
    }).compile();
    service = module.get(ReelsService);
  });

  describe('listPublished', () => {
    it('returns only approved, published reels in newest-first order', async () => {
      prisma.reel.findMany.mockResolvedValue([
        { id: 'reel-1', mediaUrl: 'https://cdn.example/reel.mp4', caption: 'Work sample', publishedAt: new Date(), engagements: [{ id: 'save-1' }] },
      ]);

      const result = await service.listPublished();

      expect(prisma.reel.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { moderationStatus: ReelModerationStatus.APPROVED, publishedAt: { not: null } },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: 30,
      }));
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({ id: 'reel-1', savedCount: 1 });
      expect(result.data[0]).not.toHaveProperty('engagements');
    });

    it('returns an empty list when no reels are published', async () => {
      prisma.reel.findMany.mockResolvedValue([]);
      await expect(service.listPublished()).resolves.toEqual({ data: [] });
    });
  });

  describe('save', () => {
    it('saves an approved published reel idempotently', async () => {
      prisma.reel.findFirst.mockResolvedValue({ id: 'reel-1' });
      prisma.reelEngagement.upsert.mockResolvedValue({});

      await expect(service.save('reel-1', 'user-1')).resolves.toEqual({ saved: true });
      expect(prisma.reelEngagement.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { reelId_userId_type: { reelId: 'reel-1', userId: 'user-1', type: EngagementType.SAVE } },
        update: {},
      }));
    });

    it('rejects reels that are missing, unapproved, or unpublished', async () => {
      prisma.reel.findFirst.mockResolvedValue(null);
      await expect(service.save('reel-missing', 'user-1')).rejects.toThrow('Reel not found');
      expect(prisma.reelEngagement.upsert).not.toHaveBeenCalled();
    });
  });

  describe('unsave', () => {
    it('removes only the current user save engagement', async () => {
      prisma.reelEngagement.deleteMany.mockResolvedValue({ count: 1 });
      await expect(service.unsave('reel-1', 'user-1')).resolves.toEqual({ saved: false });
      expect(prisma.reelEngagement.deleteMany).toHaveBeenCalledWith({
        where: { reelId: 'reel-1', userId: 'user-1', type: EngagementType.SAVE },
      });
    });
  });

  describe('savedByUser', () => {
    it('returns only the user saved published reels', async () => {
      const savedReel = { id: 'reel-1', mediaUrl: 'https://cdn.example/reel.mp4', caption: 'Saved', publishedAt: new Date(), creator: { id: 'worker-1', role: 'WORKER' } };
      prisma.reelEngagement.findMany.mockResolvedValue([{ reel: savedReel }]);

      await expect(service.savedByUser('user-1')).resolves.toEqual({ data: [savedReel] });
      expect(prisma.reelEngagement.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          userId: 'user-1',
          type: EngagementType.SAVE,
          reel: { moderationStatus: ReelModerationStatus.APPROVED, publishedAt: { not: null } },
        },
      }));
    });
  });
});
