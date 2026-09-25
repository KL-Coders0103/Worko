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
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { REALTIME_EVENTS } from '../realtime/realtime.types';

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
    private readonly realtime: RealtimeGateway,
    private readonly walletService: WalletService,
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

    await this.notifyBookingStatusChanged(updated.id, updated.status);

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

    await this.notifyBookingStatusChanged(updated.id, updated.status);

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

    await this.notifyBookingStatusChanged(updated.id, updated.status);

    return this.toBookingResponse(updated, 'WORKER');
  }

  async startBooking(
    workerUserId: string,
    bookingId: string,
  ) {
    await this.getOwnedBooking(workerUserId, 'WORKER', bookingId);

    const result = await this.prisma.$transaction(async tx => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { attendance: true },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (!booking.attendance) {
        throw new BadRequestException(
          'Attendance record not found',
        );
      }

      if (booking.attendance.status !== 'CHECKED_IN') {
        throw new BadRequestException(
          'Worker must be checked in before starting the work',
        );
      }

      const updatedBooking =
        await this.transitionBookingInTransaction(
          tx,
          bookingId,
          BookingStatus.IN_PROGRESS,
        );

      const attendance = await tx.attendance.update({
        where: {
          id: booking.attendance.id,
        },
        data: {
          status: 'IN_PROGRESS',
        },
      });

      return {
        booking: updatedBooking,
        attendance,
      };
    });

    await this.notifyBookingStatusChanged(
      result.booking.id,
      result.booking.status,
    );

    await this.notifyAttendanceUpdated(
      result.booking.id,
      result.booking.status,
      result.attendance.status,
      result.attendance.updatedAt,
    );

    return this.toBookingResponse(result.booking, 'WORKER');
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

    await this.notifyBookingStatusChanged(
      completed.id,
      completed.status,
    );

    return this.toBookingResponse(completed, 'WORKER');
  }

  async releasePayment(
    clientUserId: string,
    bookingId: string,
  ) {
    await this.getOwnedBooking(clientUserId, 'CLIENT', bookingId);

    const updated = await this.prisma.$transaction(async tx => {
      const booking = await tx.booking.findUnique({
        where: {id: bookingId},
        include: {payment: true},
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.status !== BookingStatus.COMPLETED) {
        throw new BadRequestException(
          'Payment can be released only after booking completion',
        );
      }

      if (!booking.payment || booking.payment.status !== 'SUCCESS') {
        throw new BadRequestException(
          'Payment must be successful before it can be released',
        );
      }

      if (!booking.workerId) {
        throw new BadRequestException(
          'Booking has no assigned worker',
        );
      }

      const worker = await tx.worker.findUnique({
        where: {id: booking.workerId},
        select: {userId: true},
      });

      if (!worker) {
        throw new NotFoundException('Booking worker not found');
      }

      await this.walletService.creditWalletInTransaction(
        tx,
        worker.userId,
        booking.payment.amount,
        'PAYMENT',
        booking.payment.id,
        `Payment released for booking ${booking.id}`,
      );

      return this.transitionBookingInTransaction(
        tx,
        bookingId,
        BookingStatus.PAYMENT_RELEASED,
      );
    });

    await this.notifyBookingStatusChanged(
      updated.id,
      updated.status,
    );

    return this.toBookingResponse(updated, 'CLIENT');
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

    await this.notifyBookingStatusChanged(
      updated.id,
      updated.status,
    );

    return this.toBookingResponse(updated, role);
  }

  private async notifyAttendanceUpdated(
    bookingId: string,
    bookingStatus: BookingStatus,
    attendanceStatus: string,
    occurredAt: Date,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        client: { select: { userId: true } },
        worker: { select: { userId: true } },
      },
    });

    if (!booking) {
      return;
    }

    this.realtime.notifyUsers(
      [
        booking.client.userId,
        ...(booking.worker?.userId ? [booking.worker.userId] : []),
      ],
      REALTIME_EVENTS.ATTENDANCE_UPDATED,
      {
        bookingId,
        bookingStatus,
        attendanceStatus,
        occurredAt,
      },
    );
  }

  private async notifyBookingStatusChanged(
    bookingId: string,
    status: BookingStatus,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: {id: bookingId},
      select: {
        client: {select: {userId: true}},
        worker: {select: {userId: true}},
      },
    });

    if (!booking) {
      return;
    }

    const payload = {
      bookingId,
      status,
      changedAt: new Date(),
    };

    this.realtime.notifyUsers(
      [
        booking.client.userId,
        ...(booking.worker?.userId ? [booking.worker.userId] : []),
      ],
      REALTIME_EVENTS.BOOKING_STATUS_CHANGED,
      payload,
    );
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
