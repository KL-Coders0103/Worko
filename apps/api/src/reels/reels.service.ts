import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import type { Reel } from '@prisma/client';

import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ReelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async uploadReelVideo(
    userId: string,
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
  ) {
    if (!file) {
      throw new BadRequestException(
        'Video file is required.',
      );
    }

    const worker = await this.prisma.worker.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!worker) {
      throw new NotFoundException(
        'Worker profile not found.',
      );
    }

    if (worker.status !== 'VERIFIED') {
      throw new UnauthorizedException(
        'Only verified workers can upload reels.',
      );
    }

    const uploaded =
      await this.storageService.uploadReelVideo(
        file.buffer,
        file.mimetype,
        file.originalname,
      );

    try {
      const reel = await this.prisma.reel.create({
        data: {
          workerId: worker.id,
          status: 'DRAFT',
          videoKey: uploaded.key,
          mimeType: uploaded.contentType,
          fileSizeBytes: BigInt(file.size),
        },
      });

      return {
        id: reel.id,
        status: reel.status,
        mimeType: reel.mimeType,
        fileSizeBytes: reel.fileSizeBytes?.toString(),
        createdAt: reel.createdAt,
      };
    } catch (error) {
      await this.storageService.deletePrivateObject(
        uploaded.key,
      );

      throw error;
    }
  }

  async getReelById(reelId: string) {
    const reel = await this.prisma.reel.findFirst({
      where: {
        id: reelId,
        status: 'PUBLISHED',
        publishedAt: { not: null },
      },
      select: {
        id: true,
        status: true,
        title: true,
        description: true,
        mimeType: true,
        durationSeconds: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    if (!reel) {
      throw new NotFoundException('Reel not found.');
    }

    return reel;
  }

  async updateReel(
    userId: string,
    reelId: string,
    data: {
      title?: string;
      description?: string;
      durationSeconds?: number;
    },
  ) {
    const worker = await this.prisma.worker.findUnique({
      where: { userId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker profile not found.');
    }

    if (worker.status !== 'VERIFIED') {
      throw new UnauthorizedException(
        'Only verified workers can manage reels.',
      );
    }

    const reel = await this.prisma.reel.findUnique({
      where: { id: reelId },
    });

    if (!reel) {
      throw new NotFoundException('Reel not found.');
    }

    if (reel.workerId !== worker.id) {
      throw new UnauthorizedException(
        'You are not authorized to modify this reel.',
      );
    }

    if (reel.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft reels can be edited.',
      );
    }

    if (
      data.title !== undefined &&
      data.title.trim().length === 0
    ) {
      throw new BadRequestException('Title cannot be empty.');
    }

    if (
      data.title !== undefined &&
      data.title.length > 150
    ) {
      throw new BadRequestException(
        'Title cannot exceed 150 characters.',
      );
    }

    if (
      data.durationSeconds !== undefined &&
      (!Number.isInteger(data.durationSeconds) ||
        data.durationSeconds <= 0 ||
        data.durationSeconds > 300)
    ) {
      throw new BadRequestException(
        'Reel duration must be between 1 and 300 seconds.',
      );
    }

    const updatedReel = await this.prisma.reel.update({
      where: { id: reelId },
      data: {
        ...(data.title !== undefined
          ? { title: data.title.trim() }
          : {}),
        ...(data.description !== undefined
          ? { description: data.description.trim() || null }
          : {}),
        ...(data.durationSeconds !== undefined
          ? { durationSeconds: data.durationSeconds }
          : {}),
      },
    });

    return this.toWorkerReelResponse(updatedReel);
  }

    async publishReel(
    userId: string,
    reelId: string,
  ) {
    const worker = await this.prisma.worker.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!worker) {
    throw new NotFoundException(
      'Worker profile not found.',
    );
  }

  if (worker.status !== 'VERIFIED') {
    throw new UnauthorizedException(
      'Only verified workers can publish reels.',
    );
  }

  const reel = await this.prisma.reel.findUnique({
    where: {
      id: reelId,
    },
  });

  if (!reel) {
    throw new NotFoundException(
      'Reel not found.',
    );
  }

  if (reel.workerId !== worker.id) {
    throw new UnauthorizedException(
      'You are not authorized to publish this reel.',
    );
  }

  if (reel.status !== 'DRAFT') {
    throw new BadRequestException(
      `Reel cannot be published from ${reel.status} state.`,
    );
  }

  if (!reel.videoKey) {
    throw new BadRequestException(
      'Reel video is required before publishing.',
    );
  }

  if (!reel.mimeType.startsWith('video/')) {
    throw new BadRequestException(
      'Invalid reel video.',
    );
  }

  if (
    reel.durationSeconds !== null &&
    reel.durationSeconds > 300
  ) {
    throw new BadRequestException(
      'Reel cannot exceed 5 minutes.',
    );
  }

  const updateReel = await this.prisma.reel.update({
    where: {
      id: reelId,
    },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });

  return this.toWorkerReelResponse(updateReel);
}

  async deleteReel(
  userId: string,
  reelId: string,
) {
  const worker = await this.prisma.worker.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!worker) {
    throw new NotFoundException(
      'Worker profile not found.',
    );
  }

  if (worker.status !== 'VERIFIED') {
    throw new UnauthorizedException(
      'Only verified workers can manage reels.',
    );
  }

  const reel = await this.prisma.reel.findUnique({
    where: {
      id: reelId,
    },
  });

  if (!reel) {
    throw new NotFoundException(
      'Reel not found.',
    );
  }

  if (reel.workerId !== worker.id) {
    throw new UnauthorizedException(
      'You are not authorized to delete this reel.',
    );
  }

  if (reel.status === 'DELETED') {
    return this.toWorkerReelResponse(reel);
  }

  const updated = await this.prisma.reel.update({
    where: {
      id: reelId,
    },
    data: {
      status: 'DELETED',
      deletedAt: new Date(),
    },
  });

  return this.toWorkerReelResponse(updated);
}

  async getFeed(
    limit = 10,
    cursor?: string,
    userId?: string,
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), 20);

    let cursorReel:
      | { id: string; publishedAt: Date; createdAt: Date }
      | null = null;

    if (cursor) {
      const candidate = await this.prisma.reel.findFirst({
        where: {
          id: cursor,
          status: 'PUBLISHED',
          publishedAt: { not: null },
        },
        select: {
          id: true,
          publishedAt: true,
          createdAt: true,
        },
      });

      if (!candidate || !candidate.publishedAt) {
        throw new BadRequestException('Invalid feed cursor.');
      }

      cursorReel = {
        id: candidate.id,
        publishedAt: candidate.publishedAt,
        createdAt: candidate.createdAt,
      };
    }

    const reels = await this.prisma.reel.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { not: null },
        ...(cursorReel
          ? {
              OR: [
                { publishedAt: { lt: cursorReel.publishedAt } },
                {
                  publishedAt: cursorReel.publishedAt,
                  createdAt: { lt: cursorReel.createdAt },
                },
                {
                  publishedAt: cursorReel.publishedAt,
                  createdAt: cursorReel.createdAt,
                  id: { lt: cursorReel.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: safeLimit + 1,
      include: {
        likes: {
          where: { status: 'ACTIVE' },
          select: { userId: true },
        },
      },
    });

    const hasMore = reels.length > safeLimit;
    const items = hasMore
      ? reels.slice(0, safeLimit)
      : reels;

    const nextCursor =
      hasMore && items.length > 0
        ? items[items.length - 1].id
        : null;

    return {
      items: items.map((reel) => ({
        id: reel.id,
        status: reel.status,
        title: reel.title,
        description: reel.description,
        durationSeconds: reel.durationSeconds,
        publishedAt: reel.publishedAt,
        createdAt: reel.createdAt,
        likes: reel.likes.length,
        liked: userId
          ? reel.likes.some((like) => like.userId === userId)
          : false,
        videoPath: `/api/v1/reels/${reel.id}/video`,
      })),
      nextCursor,
      hasMore,
    };
  }

  async likeReel(
  userId: string,
  reelId: string,
) {
  const reel = await this.prisma.reel.findUnique({
    where: {
      id: reelId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!reel) {
    throw new NotFoundException(
      'Reel not found.',
    );
  }

  if (reel.status !== 'PUBLISHED') {
    throw new BadRequestException(
      'Only published reels can be liked.',
    );
  }

  const like =
    await this.prisma.reelLike.upsert({
      where: {
        reelId_userId: {
          reelId,
          userId,
        },
      },
      create: {
        reelId,
        userId,
        status: 'ACTIVE',
      },
      update: {
        status: 'ACTIVE',
      },
    });

  return {
    reelId,
    liked: like.status === 'ACTIVE',
  };
}

  async unlikeReel(
  userId: string,
  reelId: string,
) {
  const reel = await this.prisma.reel.findUnique({
    where: {
      id: reelId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!reel) {
    throw new NotFoundException(
      'Reel not found.',
    );
  }

  if (reel.status !== 'PUBLISHED') {
    throw new BadRequestException(
      'Only published reels can be unliked.',
    );
  }

  await this.prisma.reelLike.updateMany({
    where: {
      reelId,
      userId,
      status: 'ACTIVE',
    },
    data: {
      status: 'REMOVED',
    },
  });

  return {
    reelId,
    liked: false,
  };
}

  async getReelEngagement(
    reelId: string,
    userId?: string,
  ) {
    const reel = await this.prisma.reel.findFirst({
      where: {
        id: reelId,
        status: 'PUBLISHED',
        publishedAt: { not: null },
      },
      select: {
        id: true,
      },
    });

    if (!reel) {
      throw new NotFoundException('Reel not found.');
    }

  const likes =
    await this.prisma.reelLike.count({
      where: {
        reelId,
        status: 'ACTIVE',
      },
    });

  let liked = false;

  if (userId) {
    const userLike =
      await this.prisma.reelLike.findUnique({
        where: {
          reelId_userId: {
            reelId,
            userId,
          },
        },
        select: {
          status: true,
        },
      });

    liked = userLike?.status === 'ACTIVE';
  }

  return {
    reelId,
    likes,
    liked,
  };
}

  async getReelVideo(reelId: string) {
  const reel = await this.prisma.reel.findUnique({
    where: {
      id: reelId,
    },
    select: {
      id: true,
      status: true,
      videoKey: true,
      mimeType: true,
    },
  });

  if (!reel) {
    throw new NotFoundException(
      'Reel not found.',
    );
  }

  if (reel.status !== 'PUBLISHED') {
    throw new BadRequestException(
      'Only published reels can be viewed.',
    );
  }

  const fileInfo =
    await this.storageService.getPrivateObjectInfo(
      reel.videoKey,
    );

  return {
    key: reel.videoKey,
    contentType: reel.mimeType,
    size: fileInfo.size,
  };
}

  createReelVideoStream(
  key: string,
  start: number,
  end: number,
) {
  return this.storageService.createPrivateObjectReadStream(
    key,
    start,
    end,
  );
}
  private toWorkerReelResponse(reel: Reel) {
    return {
      id: reel.id,
      status: reel.status,
      title: reel.title,
      description: reel.description,
      mimeType: reel.mimeType,
      durationSeconds: reel.durationSeconds,
      publishedAt: reel.publishedAt,
      createdAt: reel.createdAt,
      updatedAt: reel.updatedAt,
      fileSizeBytes:
        reel.fileSizeBytes?.toString() ?? null,
      videoPath: `/api/v1/reels/${reel.id}/video`,
    };
  }


}