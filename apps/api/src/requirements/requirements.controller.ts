import { BadRequestException, Body, Controller, Delete, Get, Post, Put, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';
import { RequirementsService } from './requirements.service';

interface UploadedPhoto {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Controller('requirements')
@UseGuards(JwtAuthGuard)
export class RequirementsController {
  constructor(
    private readonly requirements: RequirementsService,
    private readonly storage: StorageService,
  ) {}

  @Get('my')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.requirements.listForClient(user.id);
  }

  @Get('draft')
  getDraft(@CurrentUser() user: AuthenticatedUser) {
    return this.requirements.getDraft(user.id);
  }

  @Put('draft')
  saveDraft(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('A draft payload is required.');
    }
    return this.requirements.saveDraft(user.id, body as Record<string, unknown>);
  }

  @Delete('draft')
  deleteDraft(@CurrentUser() user: AuthenticatedUser) {
    return this.requirements.deleteDraft(user.id);
  }

  @Post('photos')
  @UseInterceptors(
    FilesInterceptor('photos', 5, {
      storage: memoryStorage(),
      limits: {
        files: 5,
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_request, file, callback) => {
        callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
      },
    }),
  )
  async uploadPhotos(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFiles() files: UploadedPhoto[],
  ) {
    if (!files?.length) {
      throw new BadRequestException('Select at least one valid image.');
    }

    const uploaded: Array<{ key: string; url: string; mimeType: string; size: number }> = [];

    try {
      for (const file of files) {
        uploaded.push(await this.storage.uploadRequirementPhoto(user.id, file));
      }
    } catch (error) {
      await Promise.allSettled(uploaded.map((file) => this.storage.deleteObject(file.key)));
      throw error;
    }

    return {
      data: {
        photos: uploaded.map(({ url, mimeType, size }) => ({
          url,
          mimeType,
          size,
        })),
      },
      userId: user.id,
    };
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('A requirement payload is required.');
    }
    return this.requirements.createForClient(user.id, body as Record<string, unknown>);
  }
}
