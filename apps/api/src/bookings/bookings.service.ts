import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {PrismaService} from '../common/prisma/prisma.service';
import {BookingStatus, WorkerStatus} from '@prisma/client';

import {CreateBookingDto} from './dto/create-booking.dto';
import {BookingActionDto} from './dto/booking-action.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createBooking(
    userId: string,
    dto: CreateBookingDto,
    requirementId?: string,
  ) {
    const client =
      await this.prisma.client.findUnique({
        where: {
          userId,
        },
      });

    if (!client) {
      throw new BadRequestException(
        'Complete your client profile before creating a booking',
      );
    }

    const worker =
      await this.prisma.worker.findUnique({
        where: {
          id: dto.workerId,
        },
        include: {
          user: true,
          categories: {
            include: {
              category: true,
            },
          },
          skills: {
            include: {
              skill: true,
            },
          },
        },
      });

    if (!worker) {
      throw new NotFoundException(
        'Worker not found',
      );
    }

    if (
      worker.status !==
      WorkerStatus.VERIFIED
    ) {
      throw new BadRequestException(
        'Only verified workers can be booked',
      );
    }

    if (!worker.isAvailable) {
      throw new BadRequestException(
        'Worker is currently unavailable',
      );
    }

    if (worker.user.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Worker account is not active',
      );
    }

    if (worker.userId === userId) {
      throw new BadRequestException(
        'You cannot book yourself',
      );
    }

    const scheduledStart =
      new Date(dto.scheduledStart);

    const scheduledEnd =
      new Date(dto.scheduledEnd);

    if (
      Number.isNaN(
        scheduledStart.getTime(),
      ) ||
      Number.isNaN(
        scheduledEnd.getTime(),
      )
    ) {
      throw new BadRequestException(
        'Invalid booking date or time',
      );
    }

    if (
      scheduledStart >= scheduledEnd
    ) {
      throw new BadRequestException(
        'Scheduled end must be after scheduled start',
      );
    }

    if (
      scheduledStart <= new Date()
    ) {
      throw new BadRequestException(
        'Booking must be scheduled for a future time',
      );
    }

    if (
      (dto.latitude !== undefined &&
        dto.longitude === undefined) ||
      (dto.latitude === undefined &&
        dto.longitude !== undefined)
    ) {
      throw new BadRequestException(
        'Latitude and longitude must be provided together',
      );
    }

    if (!dto.serviceTitle.trim()) {
      throw new BadRequestException(
        'Service title is required',
      );
    }

    if (!dto.address.trim()) {
      throw new BadRequestException(
        'Work address is required',
      );
    }

    let categoryName: string | null =
      null;

    let skillName: string | null =
      null;

    if (dto.categoryId) {
      const workerCategory =
        worker.categories.find(
          item =>
            item.categoryId ===
            dto.categoryId,
        );

      if (!workerCategory) {
        throw new BadRequestException(
          'Selected category is not associated with this worker',
        );
      }

      if (
        workerCategory.category.status !==
        'ACTIVE'
      ) {
        throw new BadRequestException(
          'Selected category is inactive',
        );
      }

      categoryName =
        workerCategory.category.name;
    }

    if (dto.skillId) {
      const workerSkill =
        worker.skills.find(
          item =>
            item.skillId ===
            dto.skillId,
        );

      if (!workerSkill) {
        throw new BadRequestException(
          'Selected skill is not associated with this worker',
        );
      }

      if (
        workerSkill.skill.status !==
        'ACTIVE'
      ) {
        throw new BadRequestException(
          'Selected skill is inactive',
        );
      }

      skillName =
        workerSkill.skill.name;
    }

    /*
     * Prevent overlapping active bookings
     * for the same worker.
     */
    const conflictingBooking =
      await this.prisma.booking.findFirst({
        where: {
          workerId: worker.id,
          status: {
            in: [
              BookingStatus.PENDING,
              BookingStatus.ACCEPTED,
              BookingStatus.IN_PROGRESS,
            ],
          },
          scheduledStart: {
            lt: scheduledEnd,
          },
          scheduledEnd: {
            gt: scheduledStart,
          },
        },
        select: {
          id: true,
        },
      });

    if (conflictingBooking) {
      throw new BadRequestException(
        'Worker already has a booking during the selected time',
      );
    }

    const booking =
      await this.prisma.booking.create({
        data: {
          clientId: client.id,
          workerId: worker.id,
          requirementId,

          status:
            BookingStatus.PENDING,

          categoryId:
            dto.categoryId,

          categoryName,

          skillId:
            dto.skillId,

          skillName,

          serviceTitle:
            dto.serviceTitle.trim(),

          serviceDescription:
            dto.serviceDescription?.trim(),

          hourlyRate:
            worker.expectedHourlyRate,

          dailyRate:
            worker.expectedDailyRate,

          scheduledStart,

          scheduledEnd,

          address:
            dto.address.trim(),

          latitude:
            dto.latitude,

          longitude:
            dto.longitude,
        },

        include: {
          worker: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

    return {
      booking,
    };
  }

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