import { Body, Controller, Get, Param, Patch, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../storage/storage.service';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BookingService } from './booking.service';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CLIENT, UserRole.WORKER)
export class BookingController {
  constructor(private readonly bookings: BookingService, private readonly storage: StorageService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.bookings.listBookings(user.id); }
  @Get('notifications/list') notifications(@CurrentUser() user: AuthenticatedUser) { return this.bookings.notifications(user.id); }
  @Patch('notifications/:notificationId/read') read(@CurrentUser() user: AuthenticatedUser, @Param('notificationId') id: string) { return this.bookings.markNotificationRead(user.id, id); }
  @Get('wallet/me') wallet(@CurrentUser() user: AuthenticatedUser) { return this.bookings.wallet(user.id); }
  @Get(':id') get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.bookings.getBooking(user.id, id); }
  @Post(':id/cancel') cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.bookings.cancel(user.id, id, body?.reason); }
  @Post(':id/confirm') @Roles(UserRole.CLIENT) confirm(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.bookings.confirmCompletion(user.id, id); }
  @Post(':id/rating') rate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { rating: number; comment?: string }) { return this.bookings.rate(user.id, id, body.rating, body.comment); }
  @Get(':id/chat') chat(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.bookings.getChat(user.id, id); }
  @Post(':id/chat/attachments')
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadChatAttachments(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @UploadedFiles() files: Array<{ buffer: Buffer; mimetype: string; originalname: string }>) {
    await this.bookings.getBooking(user.id, id);
    const allowed = new Set(['image/jpeg','image/png','image/webp','application/pdf']);
    if (!files?.length) return { data: { attachments: [] } };
    const attachments = [];
    for (const file of files) {
      if (!allowed.has(file.mimetype)) continue;
      const uploaded = await this.storage.uploadObject({ key: 'bookings/' + id + '/chat/' + Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'), body: file.buffer, contentType: file.mimetype });
      attachments.push(uploaded.url);
    }
    return { data: { attachments } };
  }

  @Post(':id/chat') sendChat(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { content?: string; attachmentUrls?: string[] }) { return this.bookings.sendChat(user.id, id, body?.content ?? '', body?.attachmentUrls ?? []); }
  @Get(':id/disputes') disputes(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.bookings.getDisputes(user.id, id); }
  @Post(':id/disputes') dispute(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason: string; description: string }) { return this.bookings.createDispute(user.id, id, body.reason, body.description); }
}
