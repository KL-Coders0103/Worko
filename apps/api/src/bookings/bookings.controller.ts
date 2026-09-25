import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { Request } from 'express';

import { BookingsService } from './bookings.service';
import { BookingActionDto } from './dto/booking-action.dto';
import { Roles, RolesGuard } from '../auth/guards/role.guards';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessTokenPayload } from '../auth/jwt.service';

type AuthenticatedRequest = Request & {
  user: AccessTokenPayload;
};

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
  ) {}

  @Get()
  @Version('1')
  @Roles('CLIENT', 'WORKER')
  getMyBookings(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingsService.getMyBookings(
      req.user.sub,
      req.user.role as 'CLIENT' | 'WORKER',
    );
  }

  @Get(':id')
  @Version('1')
  @Roles('CLIENT', 'WORKER')
  getBooking(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.bookingsService.getBookingById(
      req.user.sub,
      req.user.role as 'CLIENT' | 'WORKER',
      id,
    );
  }

  @Post(':id/confirm')
  @Version('1')
  @Roles('CLIENT')
  confirmBooking(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.bookingsService.confirmBooking(
      req.user.sub,
      id,
    );
  }

  @Post(':id/en-route')
  @Version('1')
  @Roles('WORKER')
  markWorkerEnRoute(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.bookingsService.markWorkerEnRoute(
      req.user.sub,
      id,
    );
  }

  @Post(':id/arrived')
  @Version('1')
  @Roles('WORKER')
  markWorkerArrived(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.bookingsService.markWorkerArrived(
      req.user.sub,
      id,
    );
  }

  @Post(':id/start')
  @Version('1')
  @Roles('WORKER')
  startBooking(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.bookingsService.startBooking(
      req.user.sub,
      id,
    );
  }

  @Post(':id/complete')
  @Version('1')
  @Roles('WORKER')
  completeBooking(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.bookingsService.completeBooking(
      req.user.sub,
      id,
    );
  }

  @Post(':id/release-payment')
  @Version('1')
  @Roles('CLIENT')
  releasePayment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.bookingsService.releasePayment(
      req.user.sub,
      id,
    );
  }

  @Post(':id/cancel')
  @Version('1')
  @Roles('CLIENT', 'WORKER')
  cancelBooking(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: BookingActionDto,
  ) {
    return this.bookingsService.cancelBooking(
      req.user.sub,
      req.user.role as 'CLIENT' | 'WORKER',
      id,
      dto,
    );
  }
}
