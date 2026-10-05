import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
  constructor(private readonly bookings: BookingService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.bookings.listBookings(user.id); }
  @Get('notifications/list') notifications(@CurrentUser() user: AuthenticatedUser) { return this.bookings.notifications(user.id); }
  @Patch('notifications/:notificationId/read') read(@CurrentUser() user: AuthenticatedUser, @Param('notificationId') id: string) { return this.bookings.markNotificationRead(user.id, id); }
  @Get('wallet/me') wallet(@CurrentUser() user: AuthenticatedUser) { return this.bookings.wallet(user.id); }
  @Get(':id') get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.bookings.getBooking(user.id, id); }
  @Post(':id/cancel') cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.bookings.cancel(user.id, id, body?.reason); }
  @Post(':id/confirm') @Roles(UserRole.CLIENT) confirm(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.bookings.confirmCompletion(user.id, id); }
  @Post(':id/rating') rate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { rating: number; comment?: string }) { return this.bookings.rate(user.id, id, body.rating, body.comment); }
  @Get(':id/chat') chat(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.bookings.getChat(user.id, id); }
  @Post(':id/chat') sendChat(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { content?: string; attachmentUrls?: string[] }) { return this.bookings.sendChat(user.id, id, body?.content ?? '', body?.attachmentUrls ?? []); }
  @Get(':id/disputes') disputes(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.bookings.getDisputes(user.id, id); }
  @Post(':id/disputes') dispute(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason: string; description: string }) { return this.bookings.createDispute(user.id, id, body.reason, body.description); }
}
