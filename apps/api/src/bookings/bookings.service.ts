import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../common/prisma/prisma.service';
import { BookingActionDto } from './dto/booking-action.dto';
import { BookingResponseDto } from './dto/booking-response.dto';

interface BookingResponse extends BookingResponseDto {
  id: string;
  requirementId: string | null;
  status: BookingStatus;
  categoryId: string;
  categoryName: string;
  skillId: string | null;
  skillName: string | null;
  serviceTitle: string;
  serviceDescription: string | null;
  hourlyRate: string | number | null;
  dailyRate: string | number | null;
  scheduledStart: Date;
  scheduledEnd: Date;
  address: string;
  latitude: string | number | null;
  longitude: string | number | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  client?: { firstName: string; lastName: string };
  worker?: { firstName: string; lastName: string };
}
import {
  assertBookingTransition,
  getAllowedBookingTransitions,
} from './booking-state-machine';

type BookingRole = 'CLIENT' | 'WORKER';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getMyBookings(
    userId: string,
    role: BookingRole,
  ) {
    if (role === 'CLIENT') {
      const client = await this.prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!client) {
        throw new BadRequestException('Client profile not found');
      }

      const bookings = await this.prisma.booking.findMany({
        where: { clientId: client.id },
        include: this.bookingInclude(),
        orderBy: { scheduledStart: 'asc' },
      });
      return bookings.map(booking => this.toBookingResponse(booking, role));
    }

    const worker = await this.prisma.worker.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!worker) {
      throw new BadRequestException('Worker profile not found');
    }

    const bookings = await this.prisma.booking.findMany({
      where: { workerId: worker.id },
      include: this.bookingInclude(),
      orderBy: { scheduledStart: 'asc' },
    });
    return bookings.map(booking => this.toBookingResponse(booking, role));
  }

  async getBookingById(
    userId: string,
    role: BookingRole,
    bookingId: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: this.bookingInclude(),
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    await this.assertOwnership(userId, role, booking);

    return this.toBookingResponse(booking, role);
  }

  async confirmBooking(
    clientUserId: string,
    bookingId: string,
  ) {
    await this.getOwnedBooking(clientUserId, 'CLIENT', bookingId);

    const updated = await this.prisma.$transaction(async tx => {
      return this.transitionBookingInTransaction(
        tx,
        bookingId,
        BookingStatus.CONFIRMED,
      );
    });

    return this.toBookingResponse(updated, 'CLIENT');
  }

  async markWorkerEnRoute(
    workerUserId: string,
    bookingId: string,
  ) {
    await this.getOwnedBooking(workerUserId, 'WORKER', bookingId);

    const updated = await this.prisma.$transaction(async tx => {
      return this.transitionBookingInTransaction(
        tx,
        bookingId,
        BookingStatus.WORKER_EN_ROUTE,
      );
    });

    return this.toBookingResponse(updated, 'WORKER');
  }

  async markWorkerArrived(
    workerUserId: string,
    bookingId: string,
  ) {
    await this.getOwnedBooking(workerUserId, 'WORKER', bookingId);

    const updated = await this.prisma.$transaction(async tx => {
      return this.transitionBookingInTransaction(
        tx,
        bookingId,
        BookingStatus.ARRIVED,
      );
    });

    return this.toBookingResponse(updated, 'WORKER');
  }

  async startBooking(
    workerUserId: string,
    bookingId: string,
  ) {
    await this.getOwnedBooking(workerUserId, 'WORKER', bookingId);

    const updated = await this.prisma.$transaction(async tx => {
      return this.transitionBookingInTransaction(
        tx,
        bookingId,
        BookingStatus.IN_PROGRESS,
      );
    });

    return this.toBookingResponse(updated, 'WORKER');
  }

  async completeBooking(
    workerUserId: string,
    bookingId: string,
  ) {
    await this.getOwnedBooking(workerUserId, 'WORKER', bookingId);

    const completed = await this.prisma.$transaction(async tx => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { attendance: true },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.workerId === null) {
        throw new BadRequestException('Booking has no assigned worker');
      }

      if (!booking.attendance || booking.attendance.status !== 'CHECKED_OUT') {
        throw new BadRequestException(
          'Booking can be completed only after worker check-out',
        );
      }

      const updated = await this.transitionBookingInTransaction(
        tx,
        bookingId,
        BookingStatus.COMPLETED,
        { completedAt: new Date() },
      );

      await tx.attendance.update({
        where: { id: booking.attendance.id },
        data: { status: 'COMPLETED' },
      });

      return updated;
    });

    return this.toBookingResponse(completed, 'WORKER');
  }

  async cancelBooking(
    userId: string,
    role: BookingRole,
    bookingId: string,
    dto: BookingActionDto,
  ) {
    await this.getOwnedBooking(userId, role, bookingId);

    const updated = await this.prisma.$transaction(async tx => {
      return this.transitionBookingInTransaction(
        tx,
        bookingId,
        BookingStatus.CANCELLED,
        {
          cancelledAt: new Date(),
          cancelledBy: userId,
          cancellationReason: dto.reason?.trim() || null,
        },
      );
    });

    return this.toBookingResponse(updated, role);
  }

  getAllowedTransitions(status: BookingStatus) {
    return getAllowedBookingTransitions(status);
  }

  private async transitionBookingInTransaction(
    tx: Prisma.TransactionClient,
    bookingId: string,
    nextStatus: BookingStatus,
    data: Prisma.BookingUpdateInput = {},
  ) {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    assertBookingTransition(booking.status, nextStatus);

    return tx.booking.update({
      where: {
        id: booking.id,
        status: booking.status,
      },
      data: {
        ...data,
        status: nextStatus,
      },
      include: this.bookingInclude(),
    });
  }

  private async getOwnedBooking(
    userId: string,
    role: BookingRole,
    bookingId: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    await this.assertOwnership(userId, role, booking);

    return booking;
  }

  private async assertOwnership(
    userId: string,
    role: BookingRole,
    booking: {
      clientId: string;
      workerId: string | null;
    },
  ) {
    if (role === 'CLIENT') {
      const client = await this.prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!client || client.id !== booking.clientId) {
        throw new ForbiddenException(
          'You do not have access to this booking',
        );
      }

      return;
    }

    const worker = await this.prisma.worker.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!worker || !booking.workerId || worker.id !== booking.workerId) {
      throw new ForbiddenException(
        'You do not have access to this booking',
      );
    }
  }

  private toBookingResponse(
    booking: any,
    role: BookingRole,
  ): BookingResponseDto {
    return {
      id: booking.id,
      requirementId: booking.requirementId,
      status: booking.status,
      categoryId: booking.categoryId,
      categoryName: booking.categoryName,
      skillId: booking.skillId,
      skillName: booking.skillName,
      serviceTitle: booking.serviceTitle,
      serviceDescription: booking.serviceDescription,
      hourlyRate: booking.hourlyRate,
      dailyRate: booking.dailyRate,
      scheduledStart: booking.scheduledStart,
      scheduledEnd: booking.scheduledEnd,
      address: booking.address,
      latitude: booking.latitude,
      longitude: booking.longitude,
      completedAt: booking.completedAt,
      cancelledAt: booking.cancelledAt,
      cancellationReason: booking.cancellationReason,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      ...(role === 'CLIENT' && booking.worker
        ? {
            worker: {
              firstName: booking.worker.user.firstName,
              lastName: booking.worker.user.lastName,
            },
          }
        : {}),
      ...(role === 'WORKER' && booking.client
        ? {
            client: {
              firstName: booking.client.user.firstName,
              lastName: booking.client.user.lastName,
            },
          }
        : {}),
    };
  }

  private bookingInclude() {
    return {
      client: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      worker: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    };
  }
}
