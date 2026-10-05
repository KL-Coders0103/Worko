import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { StorageService } from '../storage/storage.service';
import { MatchingService } from './matching.service';

interface EvidenceFile { buffer: Buffer; mimetype: string; originalname: string; size: number; }

@Controller('worker/jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.WORKER)
export class WorkerJobController {
  constructor(private readonly matching: MatchingService, private readonly storage: StorageService) {}

  @Get(':bookingId')
  getJob(@CurrentUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string) {
    return this.matching.getWorkerJob(user.id, bookingId);
  }

  @Post(':bookingId/arrive')
  arrive(@CurrentUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string) {
    return this.matching.markArrived(user.id, bookingId);
  }

  @Post(':bookingId/check-in')
  checkIn(@CurrentUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string, @Body() body: { code?: string }) {
    if (!body?.code?.trim()) throw new BadRequestException('A QR/check-in code is required.');
    return this.matching.checkIn(user.id, bookingId, body.code);
  }

  @Post(':bookingId/start')
  start(@CurrentUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string) {
    return this.matching.startJob(user.id, bookingId);
  }

  @Post(':bookingId/tasks/:taskId/complete')
  completeTask(@CurrentUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string, @Param('taskId') taskId: string) {
    return this.matching.completeTask(user.id, bookingId, taskId);
  }

  @Post(':bookingId/evidence')
  @UseInterceptors(FilesInterceptor('photos', 10, {
    storage: memoryStorage(),
    limits: { files: 10, fileSize: 5 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)),
  }))
  async evidence(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
    @Body() body: { type?: string },
    @UploadedFiles() files: EvidenceFile[],
  ) {
    const type = body?.type;
    if (type !== 'before' && type !== 'after' && type !== 'progress') throw new BadRequestException('Evidence type must be before, after or progress.');
    if (!files?.length) throw new BadRequestException('Select at least one valid image.');
    const uploaded: string[] = [];
    try {
      for (const file of files) {
        const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
        const object = await this.storage.uploadObject({
          key: `jobs/${bookingId}/${type}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`,
          body: file.buffer,
          contentType: file.mimetype,
        });
        uploaded.push(object.url);
      }
      return await this.matching.addJobEvidence(user.id, bookingId, type, uploaded);
    } catch (error) {
      throw error;
    }
  }

  @Post(':bookingId/complete')
  complete(@CurrentUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string, @Body() body: { finalNotes?: string }) {
    return this.matching.completeJob(user.id, bookingId, body?.finalNotes);
  }
}
