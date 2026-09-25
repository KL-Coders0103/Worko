import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';

import { PrismaService } from '../common/prisma/prisma.service';
import { BookingActionDto } from './dto/booking-action.dto';
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

      return this.prisma.booking.findMany({
        where: { clientId: client.id },
        include: this.bookingInclude(),
        orderBy: { scheduledStart: 'asc' },
      });
    }

    const worker = await this.prisma.worker.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!worker) {
      throw new BadRequestException('Worker profile not found');
    }

    return this.prisma.booking.findMany({
      where: { workerId: worker.id },
      include: this.bookingInclude(),
      orderBy: { scheduledStart: 'asc' },
    });
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

    return booking;
  }

  async confirmBooking(
    clientUserId: string,
    bookingId: string,
  ) {
    const booking = await this.getOwnedBooking(
      clientUserId,
      'CLIENT',
      bookingId,
    );

    return this.transitionBooking(
      booking.id,
      BookingStatus.CONFIRMED,
    );
  }

  async markWorkerEnRoute(
    workerUserId: string,
    bookingId: string,
  ) {
    const booking = await this.getOwnedBooking(
      workerUserId,
      'WORKER',
      bookingId,
    );

    return this.transitionBooking(
      booking.id,
      BookingStatus.WORKER_EN_ROUTE,
    );
  }

  async markWorkerArrived(
    workerUserId: string,
    bookingId: string,
  ) {
    const booking = await this.getOwnedBooking(
      workerUserId,
      'WORKER',
      bookingId,
    );

    return this.transitionBooking(
      booking.id,
      BookingStatus.ARRIVED,
    );
  }

  async startBooking(
    workerUserId: string,
    bookingId: string,
  ) {
    const booking = await this.getOwnedBooking(
      workerUserId,
      'WORKER',
      bookingId,
    );

    return this.transitionBooking(
      booking.id,
      BookingStatus.IN_PROGRESS,
    );
  }

  async completeBooking(
    workerUserId: string,
    bookingId: string,
  ) {
    const booking = await this.getOwnedBooking(
      workerUserId,
      'WORKER',
      bookingId,
    );

    const completed = await this.prisma.$transaction(
      async tx => {
        assertBookingTransition(
          booking.status,
          BookingStatus.COMPLETED,
        );

        const updated = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.COMPLETED,
            completedAt: new Date(),
          },
          include: this.bookingInclude(),
        });

        await tx.attendance.updateMany({
          where: { bookingId: booking.id },
          data: { status: 'COMPLETED' },
        });

        return updated;
      },
    );

    return completed;
  }

  async cancelBooking(
    userId: string,
    role: BookingRole,
    bookingId: string,
    dto: BookingActionDto,
  ) {
    const booking = await this.getOwnedBooking(
      userId,
      role,
      bookingId,
    );

    return this.prisma.$transaction(async tx => {
      assertBookingTransition(
        booking.status,
        BookingStatus.CANCELLED,
      );

      return tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: userId,
          cancellationReason: dto.reason?.trim() || null,
        },
        include: this.bookingInclude(),
      });
    });
  }

  async transitionBooking(
    bookingId: string,
    nextStatus: BookingStatus,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: this.bookingInclude(),
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    assertBookingTransition(
      booking.status,
      nextStatus,
    );

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: nextStatus },
      include: this.bookingInclude(),
    });
  }

  getAllowedTransitions(status: BookingStatus) {
    return getAllowedBookingTransitions(status);
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

  private bookingInclude() {
    return {
      client: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
        },
      },
      worker: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
        },
      },
    };
  }
}
