import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/role.guards';
import type { AccessTokenPayload } from '../auth/jwt.service';

import { ReelsService } from './reels.service';
import { UpdateReelDto } from './dto/update-reel.dto';
import { ReelFeedDto } from './dto/reel-feed.dto';

type AuthenticatedRequest = Request & {
  user: AccessTokenPayload;
};

@Controller('reels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReelsController {
  constructor(
    private readonly reelsService: ReelsService,
  ) {}

  @Get('feed')
  @Version('1')
  @Roles('CLIENT', 'WORKER')
  async getFeed(
    @Req() request: AuthenticatedRequest,
    @Query() query: ReelFeedDto,
  ) {
    return this.reelsService.getFeed(
      query.limit,
      query.cursor,
      request.user.sub,
    );
  }

  @Get(':id/video')
  @Version('1')
  @Roles('CLIENT', 'WORKER')
  async getReelVideo(
    @Param('id') reelId: string,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const video =
      await this.reelsService.getReelVideo(reelId);

    const range = request.headers.range;

    response.setHeader(
      'Accept-Ranges',
      'bytes',
    );

    response.setHeader(
      'Cache-Control',
      'private, max-age=3600',
    );

    response.setHeader(
      'Content-Type',
      video.contentType,
    );

    /**
     * No Range header.
     * Stream the complete file.
     */
    if (!range) {
      response.status(200);

      response.setHeader(
        'Content-Length',
        video.size,
      );

      const stream =
        this.reelsService.createReelVideoStream(
          video.key,
          0,
          video.size - 1,
        );

      return new StreamableFile(stream).getStream()
        .pipe(response);
    }

    /**
     * Only support a single byte range.
     */
    const match =
      /^bytes=(\d*)-(\d*)$/.exec(range);

    if (!match) {
      response.status(416);

      response.setHeader(
        'Content-Range',
        `bytes */${video.size}`,
      );

      return response.end();
    }

    const startValue = match[1];
    const endValue = match[2];

    let start: number;
    let end: number;

    /**
     * Suffix range:
     * bytes=-500
     */
    if (startValue === '') {
      const suffixLength = Number(endValue);

      if (
        !Number.isFinite(suffixLength) ||
        suffixLength <= 0
      ) {
        response.status(416);

        response.setHeader(
          'Content-Range',
          `bytes */${video.size}`,
        );

        return response.end();
      }

      start = Math.max(
        video.size - suffixLength,
        0,
      );

      end = video.size - 1;
    } else {
      start = Number(startValue);

      if (
        !Number.isFinite(start) ||
        start < 0 ||
        start >= video.size
      ) {
        response.status(416);

        response.setHeader(
          'Content-Range',
          `bytes */${video.size}`,
        );

        return response.end();
      }

      /**
       * Open-ended range:
       * bytes=500-
       */
      if (endValue === '') {
        end = video.size - 1;
      } else {
        end = Number(endValue);

        if (
          !Number.isFinite(end) ||
          end < start
        ) {
          response.status(416);

          response.setHeader(
            'Content-Range',
            `bytes */${video.size}`,
          );

          return response.end();
        }

        end = Math.min(
          end,
          video.size - 1,
        );
      }
    }

    const contentLength =
      end - start + 1;

    response.status(206);

    response.setHeader(
      'Content-Range',
      `bytes ${start}-${end}/${video.size}`,
    );

    response.setHeader(
      'Content-Length',
      contentLength,
    );

    const stream =
      this.reelsService.createReelVideoStream(
        video.key,
        start,
        end,
      );

    return new StreamableFile(stream).getStream()
      .pipe(response);
  }

  @Get(':id')
  @Version('1')
  @Roles('CLIENT', 'WORKER')
  async getReel(
    @Param('id') reelId: string,
  ) {
    return this.reelsService.getReelById(
      reelId,
    );
  }

  @Get('worker/:workerId')
  @Version('1')
  @Roles('CLIENT', 'WORKER')
  async getWorkerReels(
    @Param('workerId') workerId: string,
  ) {
    return this.reelsService.getWorkerReels(
      workerId,
    );
  }

  @Post('upload')
  @Version('1')
  @Roles('WORKER')
  @UseInterceptors(
    FileInterceptor('file'),
  )
  async uploadReel(
    @Req() request: AuthenticatedRequest,
    @UploadedFile()
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
  ) {
    return this.reelsService.uploadReelVideo(
      request.user.sub,
      file,
    );
  }

  @Patch(':id')
  @Version('1')
  @Roles('WORKER')
  async updateReel(
    @Req() request: AuthenticatedRequest,
    @Param('id') reelId: string,
    @Body() dto: UpdateReelDto,
  ) {
    return this.reelsService.updateReel(
      request.user.sub,
      reelId,
      dto,
    );
  }

  @Post(':id/publish')
  @Version('1')
  @Roles('WORKER')
  async publishReel(
    @Req() request: AuthenticatedRequest,
    @Param('id') reelId: string,
  ) {
    return this.reelsService.publishReel(
      request.user.sub,
      reelId,
    );
  }

  @Delete(':id')
  @Version('1')
  @Roles('WORKER')
  async deleteReel(
    @Req() request: AuthenticatedRequest,
    @Param('id') reelId: string,
  ) {
    return this.reelsService.deleteReel(
      request.user.sub,
      reelId,
    );
  }

  @Post(':id/like')
  @Version('1')
  @Roles('CLIENT', 'WORKER')
  async likeReel(
    @Req() request: AuthenticatedRequest,
    @Param('id') reelId: string,
  ) {
    return this.reelsService.likeReel(
      request.user.sub,
      reelId,
    );
  }

  @Delete(':id/like')
  @Version('1')
  @Roles('CLIENT', 'WORKER')
  async unlikeReel(
    @Req() request: AuthenticatedRequest,
    @Param('id') reelId: string,
  ) {
    return this.reelsService.unlikeReel(
      request.user.sub,
      reelId,
    );
  }

  @Get(':id/engagement')
  @Version('1')
  @Roles('CLIENT', 'WORKER')
  async getReelEngagement(
    @Req() request: AuthenticatedRequest,
    @Param('id') reelId: string,
  ) {
    return this.reelsService.getReelEngagement(
      reelId,
      request.user.sub,
    );
  }
}