import { BadRequestException, Body, Controller, Delete, Get, Post, Put, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirementsService } from './requirements.service';

const uploadDirectory = join(process.cwd(), 'uploads', 'requirements');
mkdirSync(uploadDirectory, { recursive: true });

@Controller('requirements')
@UseGuards(JwtAuthGuard)
export class RequirementsController {
  constructor(private readonly requirements: RequirementsService) {}

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
      storage: diskStorage({
        destination: uploadDirectory,
        filename: (_request, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase() || '.jpg'}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
      },
    }),
  )
  uploadPhotos(@CurrentUser() user: AuthenticatedUser, @UploadedFiles() files: Array<{ filename: string; mimetype: string; size: number }>) {
    if (!files?.length) throw new BadRequestException('Select at least one valid image.');
    return {
      data: {
        photos: files.map((file) => ({
          url: `/uploads/requirements/${file.filename}`,
          mimeType: file.mimetype,
          size: file.size,
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
