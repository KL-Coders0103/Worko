import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {PrismaService} from '../common/prisma/prisma.service';
import {BookingStatus, WorkerStatus} from '@prisma/client';

import {BookingActionDto} from './dto/booking-action.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getMyBookings(
    userId: string,
    role: 'CLIENT' | 'WORKER',
  ) {
    if (role === 'CLIENT') {
      const client =
        await this.prisma.client.findUnique({
          where: {
            userId,
          },
          select: {
            id: true,
          },
        });

      if (!client) {
        throw new BadRequestException(
          'Client profile not found',
        );
      }

      return this.prisma.booking.findMany({
        where: {
          clientId: client.id,
        },
        include: this.bookingInclude(),
        orderBy: {
          scheduledStart: 'asc',
        },
      });
    }

    const worker =
      await this.prisma.worker.findUnique({
        where: {
          userId,
        },
        select: {
          id: true,
        },
      });

    if (!worker) {
      throw new BadRequestException(
        'Worker profile not found',
      );
    }

    return this.prisma.booking.findMany({
      where: {
        workerId: worker.id,
      },
      include: this.bookingInclude(),
      orderBy: {
        scheduledStart: 'asc',
      },
    });
  }

  async getBookingById(
    userId: string,
    role: 'CLIENT' | 'WORKER',
    bookingId: string,
  ) {
    const booking =
      await this.prisma.booking.findUnique({
        where: {
          id: bookingId,
        },
        include: this.bookingInclude(),
      });

    if (!booking) {
      throw new NotFoundException(
        'Booking not found',
      );
    }

    await this.assertOwnership(
      userId,
      role,
      {...booking, workerId: booking.workerId! }
    );

    return booking;
  }

  async acceptBooking(
    userId: string,
    bookingId: string,
  ) {
    const booking =
      await this.getWorkerOwnedBooking(
        userId,
        bookingId,
      );

    this.assertStatus(
      booking.status,
      BookingStatus.PENDING,
      'Only pending bookings can be accepted',
    );

    const acceptedBooking =
      await this.prisma.$transaction(
        async tx => {
          const updatedBooking =
            await tx.booking.update({
              where: {
                id: booking.id,
              },
              data: {
                status:
                  BookingStatus.ACCEPTED,
              },
            });

          await tx.attendance.upsert({
            where: {
              bookingId: booking.id,
            },
            create: {
              bookingId: booking.id,
              workerId: booking.workerId!,
              status: 'NOT_STARTED',
            },
            update: {},
          });

          return updatedBooking;
        },
      );

    return this.prisma.booking.findUnique({
      where: {
        id: acceptedBooking.id,
      },
      include: this.bookingInclude(),
    });
  }

  async rejectBooking(
    userId: string,
    bookingId: string,
    dto: BookingActionDto,
  ) {
    const booking =
      await this.getWorkerOwnedBooking(
        userId,
        bookingId,
      );

    this.assertStatus(
      booking.status,
      BookingStatus.PENDING,
      'Only pending bookings can be rejected',
    );

    return this.prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status:
          BookingStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason:
          dto.reason?.trim(),
      },
      include: this.bookingInclude(),
    });
  }

  async cancelBooking(
    userId: string,
    role: 'CLIENT' | 'WORKER',
    bookingId: string,
    dto: BookingActionDto,
  ) {
    const booking =
      await this.prisma.booking.findUnique({
        where: {
          id: bookingId,
        },
      });

    if (!booking) {
      throw new NotFoundException(
        'Booking not found',
      );
    }

    await this.assertOwnership(
      userId,
      role,
      {...booking, workerId: booking.workerId!}
    );

    if (
      booking.status !==
        BookingStatus.PENDING &&
      booking.status !==
        BookingStatus.ACCEPTED
    ) {
      throw new BadRequestException(
        'Only pending or accepted bookings can be cancelled',
      );
    }

    return this.prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status:
          BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason:
          dto.reason?.trim(),
      },
      include: this.bookingInclude(),
    });
  }

  async startBooking(
    userId: string,
    bookingId: string,
  ) {
    const booking =
      await this.getWorkerOwnedBooking(
        userId,
        bookingId,
      );

    this.assertStatus(
      booking.status,
      BookingStatus.ACCEPTED,
      'Only accepted bookings can be started',
    );

    return this.prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status:
          BookingStatus.IN_PROGRESS,
      },
      include: this.bookingInclude(),
    });
  }

  async completeBooking(
    userId: string,
    bookingId: string,
  ) {
    const booking =
      await this.getWorkerOwnedBooking(
        userId,
        bookingId,
      );

    this.assertStatus(
      booking.status,
      BookingStatus.IN_PROGRESS,
      'Only in-progress bookings can be completed',
    );

    return this.prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status:
          BookingStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: this.bookingInclude(),
    });
  }

  private async getWorkerOwnedBooking(
    userId: string,
    bookingId: string,
  ) {
    const worker =
      await this.prisma.worker.findUnique({
        where: {
          userId,
        },
        select: {
          id: true,
        },
      });

    if (!worker) {
      throw new ForbiddenException(
        'Worker profile not found',
      );
    }

    const booking =
      await this.prisma.booking.findUnique({
        where: {
          id: bookingId,
        },
      });

    if (!booking) {
      throw new NotFoundException(
        'Booking not found',
      );
    }

    if (
      booking.workerId !== worker.id
    ) {
      throw new ForbiddenException(
        'You do not have access to this booking',
      );
    }

    return booking;
  }

  private async assertOwnership(
    userId: string,
    role: 'CLIENT' | 'WORKER',
    booking: {
      clientId: string;
      workerId: string;
    },
  ) {
    if (role === 'CLIENT') {
      const client =
        await this.prisma.client.findUnique({
          where: {
            userId,
          },
          select: {
            id: true,
          },
        });

      if (
        !client ||
        client.id !== booking.clientId
      ) {
        throw new ForbiddenException(
          'You do not have access to this booking',
        );
      }

      return;
    }

    const worker =
      await this.prisma.worker.findUnique({
        where: {
          userId,
        },
        select: {
          id: true,
        },
      });

    if (
      !worker ||
      worker.id !== booking.workerId
    ) {
      throw new ForbiddenException(
        'You do not have access to this booking',
      );
    }
  }

  private assertStatus(
    current: BookingStatus,
    expected: BookingStatus,
    message: string,
  ) {
    if (current !== expected) {
      throw new BadRequestException(
        message,
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