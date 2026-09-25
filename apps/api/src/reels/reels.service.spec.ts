import { jest } from '@jest/globals';

import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { ReelsService } from './reels.service';

describe('ReelsService privacy and ownership', () => {
  const prisma = {
    worker: {
      findUnique: jest.fn(),
    },
    reel: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const storage = {
    uploadReelVideo: jest.fn(),
    deletePrivateObject: jest.fn(),
  };

  let service: ReelsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReelsService(
      prisma as never,
      storage as never,
    );
  });

  it('requires a verified worker to upload a reel', async () => {
    prisma.worker.findUnique.mockResolvedValue({
      id: 'worker-1',
      status: 'PENDING_KYC',
    });

    await expect(
      service.uploadReelVideo(
        'user-1',
        {
          buffer: Buffer.from('video'),
          mimetype: 'video/mp4',
          originalname: 'work.mp4',
          size: 5,
        },
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(storage.uploadReelVideo).not.toHaveBeenCalled();
  });

  it('hides unpublished reels from public reel detail', async () => {
    prisma.reel.findFirst.mockResolvedValue(null);

    await expect(
      service.getReelById('reel-1'),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.reel.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'reel-1',
          status: 'PUBLISHED',
          publishedAt: { not: null },
        }),
      }),
    );
  });

  it('rejects an invalid feed cursor', async () => {
    prisma.reel.findFirst.mockResolvedValue(null);

    await expect(
      service.getFeed(10, 'draft-reel', 'user-1'),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.reel.findMany).not.toHaveBeenCalled();
  });

  it('returns privacy-safe feed records', async () => {
    prisma.reel.findMany.mockResolvedValue([
      {
        id: 'reel-1',
        status: 'PUBLISHED',
        title: 'Kitchen work',
        description: 'Completed kitchen installation',
        durationSeconds: 30,
        publishedAt: new Date(),
        createdAt: new Date(),
        likes: [{ userId: 'user-1' }],
      },
    ]);

    const result = await service.getFeed(
      10,
      undefined,
      'user-1',
    );

    expect(result.items[0]).toEqual({
      id: 'reel-1',
      status: 'PUBLISHED',
      title: 'Kitchen work',
      description: 'Completed kitchen installation',
      durationSeconds: 30,
      publishedAt: expect.any(Date),
      createdAt: expect.any(Date),
      likes: 1,
      liked: true,
      videoPath: '/api/v1/reels/reel-1/video',
    });

    expect(result.items[0]).not.toHaveProperty('workerId');
    expect(result.items[0]).not.toHaveProperty('videoKey');
    expect(result.items[0]).not.toHaveProperty('thumbnailKey');
  });
});
