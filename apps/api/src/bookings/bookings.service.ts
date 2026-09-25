import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';

import { PrismaService } from '../common/prisma/prisma.service';
import { BookingActionDto } from './dto/booking-action.dto';

interface BookingResponse {
  id: string;
  requirementId: string | null;
  status: BookingStatus;
  categoryId: string;
  categoryName: string;
  skillId: string | null;
  skillName: string | null;
  serviceTitle: string;
  serviceDescription: string | null;
  hourlyRate: unknown;
  dailyRate: unknown;
  scheduledStart: Date;
  scheduledEnd: Date;
  address: string;
  latitude: unknown;
  longitude: unknown;
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

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: nextStatus },
      include: this.bookingInclude(),
    });

    return updated;
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

  private toBookingResponse(
    booking: any,
    role: BookingRole,
  ): BookingResponse {
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
