import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Version,
} from '@nestjs/common';


import {BookingsService} from './bookings.service';
import {CreateBookingDto} from './dto/create-booking.dto';
import {BookingActionDto} from './dto/booking-action.dto';


import {Req} from '@nestjs/common';
import {Request} from 'express';
import { Roles, RolesGuard } from '../auth/guards/role.guards';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessTokenPayload } from '../auth/jwt.service';

type AuthenticatedRequest =
  Request & {
    user: AccessTokenPayload;
  };

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
  ) {}

  @Post()
  @Version('1')
  @Roles('CLIENT')
  createBooking(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.createBooking(
      req.user.sub,
      dto,
    );
  }

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

  @Post(':id/accept')
  @Version('1')
  @Roles('WORKER')
  acceptBooking(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.bookingsService.acceptBooking(
      req.user.sub,
      id,
    );
  }

  @Post(':id/reject')
  @Version('1')
  @Roles('WORKER')
  rejectBooking(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: BookingActionDto,
  ) {
    return this.bookingsService.rejectBooking(
      req.user.sub,
      id,
      dto,
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
}