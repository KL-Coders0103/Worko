import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  BookingStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

import {PrismaService} from '../common/prisma/prisma.service';
import {CreatePaymentDto} from './dto/create-payment.dto';
import {PaymentActionDto} from './dto/payment-action.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createPayment(
    userId: string,
    dto: CreatePaymentDto,
  ) {
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

    const booking =
      await this.prisma.booking.findUnique({
        where: {
          id: dto.bookingId,
        },
        include: {
          worker: {
            select: {
              id: true,
            },
          },
          payment: true,
        },
      });

    if (!booking) {
      throw new NotFoundException(
        'Booking not found',
      );
    }

    if (booking.clientId !== client.id) {
      throw new ForbiddenException(
        'You do not have access to this booking',
      );
    }

    if (
      booking.status === BookingStatus.REJECTED ||
      booking.status === BookingStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Payment is not allowed for this booking',
      );
    }

    if (booking.payment) {
      if (
        booking.payment.status ===
        PaymentStatus.SUCCESS
      ) {
        throw new BadRequestException(
          'Booking has already been paid',
        );
      }

      if (
        booking.payment.status ===
          PaymentStatus.PENDING ||
        booking.payment.status ===
          PaymentStatus.PROCESSING
      ) {
        throw new BadRequestException(
          'A payment is already in progress for this booking',
        );
      }
    }

    const existingByKey =
      await this.prisma.payment.findUnique({
        where: {
          idempotencyKey:
            dto.idempotencyKey,
        },
      });

    if (existingByKey) {
      if (
        existingByKey.bookingId !==
        booking.id
      ) {
        throw new BadRequestException(
          'Idempotency key has already been used',
        );
      }

      return {
        payment: existingByKey,
      };
    }

    const amount =
      this.calculateBookingAmount(booking);

    const payment =
      await this.prisma.payment.create({
        data: {
          bookingId: booking.id,
          status: PaymentStatus.PENDING,
          method: 'ONLINE',
          amount,
          currency: 'INR',
          idempotencyKey:
            dto.idempotencyKey,
        },
      });

    return {
      payment,
    };
  }

  async getPayment(
    userId: string,
    paymentId: string,
  ) {
    const payment =
      await this.prisma.payment.findUnique({
        where: {
          id: paymentId,
        },
        include: {
          booking: {
            select: {
              id: true,
              clientId: true,
              workerId: true,
              status: true,
              serviceTitle: true,
              scheduledStart: true,
              scheduledEnd: true,
            },
          },
        },
      });

    if (!payment) {
      throw new NotFoundException(
        'Payment not found',
      );
    }

    await this.assertPaymentAccess(
      userId,
      payment.booking.clientId,
      payment.booking.workerId,
    );

    return {
      payment,
    };
  }

  async getBookingPayment(
    userId: string,
    bookingId: string,
  ) {
    const booking =
      await this.prisma.booking.findUnique({
        where: {
          id: bookingId,
        },
        select: {
          id: true,
          clientId: true,
          workerId: true,
        },
      });

    if (!booking) {
      throw new NotFoundException(
        'Booking not found',
      );
    }

    await this.assertPaymentAccess(
      userId,
      booking.clientId,
      booking.workerId,
    );

    const payment =
      await this.prisma.payment.findUnique({
        where: {
          bookingId,
        },
      });

    return {
      payment,
    };
  }

  async cancelPayment(
    userId: string,
    paymentId: string,
    dto: PaymentActionDto,
  ) {
    const payment =
      await this.prisma.payment.findUnique({
        where: {
          id: paymentId,
        },
        include: {
          booking: {
            select: {
              clientId: true,
              workerId: true,
            },
          },
        },
      });

    if (!payment) {
      throw new NotFoundException(
        'Payment not found',
      );
    }

    await this.assertPaymentAccess(
      userId,
      payment.booking.clientId,
      payment.booking.workerId,
    );

    if (
      payment.status === PaymentStatus.SUCCESS
    ) {
      throw new BadRequestException(
        'Successful payments cannot be cancelled',
      );
    }

    if (
      payment.status === PaymentStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Payment is already cancelled',
      );
    }

    const reason =
      dto.reason?.trim() || undefined;

    const updated =
      await this.prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: PaymentStatus.CANCELLED,
          failureMessage: reason,
        },
      });

    return {
      payment: updated,
    };
  }

  private calculateBookingAmount(
    booking: {
      dailyRate: Prisma.Decimal | null;
      hourlyRate: Prisma.Decimal | null;
      scheduledStart: Date;
      scheduledEnd: Date;
    },
  ): Prisma.Decimal {
    if (booking.dailyRate) {
      const startDay = new Date(
        booking.scheduledStart,
      );

      const endDay = new Date(
        booking.scheduledEnd,
      );

      startDay.setHours(0, 0, 0, 0);
      endDay.setHours(0, 0, 0, 0);

      const millisecondsPerDay =
        24 * 60 * 60 * 1000;

      const days =
        Math.ceil(
          (endDay.getTime() -
            startDay.getTime()) /
            millisecondsPerDay,
        ) || 1;

      return booking.dailyRate.mul(days);
    }

    if (booking.hourlyRate) {
      const durationMs =
        booking.scheduledEnd.getTime() -
        booking.scheduledStart.getTime();

      const durationHours =
        durationMs /
        (60 * 60 * 1000);

      if (durationHours <= 0) {
        throw new BadRequestException(
          'Invalid booking duration',
        );
      }

      return booking.hourlyRate.mul(
        new Prisma.Decimal(
          durationHours,
        ),
      );
    }

    throw new BadRequestException(
      'Worker does not have a valid rate',
    );
  }

  private async assertPaymentAccess(
    userId: string,
    clientId: string,
    workerId: string,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          role: true,
          client: {
            select: {
              id: true,
            },
          },
          worker: {
            select: {
              id: true,
            },
          },
        },
      });

    if (!user) {
      throw new ForbiddenException(
        'User not found',
      );
    }

    if (
      user.role === 'CLIENT' &&
      user.client?.id === clientId
    ) {
      return;
    }

    if (
      user.role === 'WORKER' &&
      user.worker?.id === workerId
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have access to this payment',
    );
  }

  async simulateDemoPayment(
  userId: string,
  paymentId: string,
  success: boolean,
) {
  const payment =
    await this.prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
      include: {
        booking: {
          select: {
            clientId: true,
            workerId: true,
          },
        },
      },
    });

  if (!payment) {
    throw new NotFoundException(
      'Payment not found',
    );
  }

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
    client.id !== payment.booking.clientId
  ) {
    throw new ForbiddenException(
      'Only the booking client can complete this payment',
    );
  }

  if (
    payment.status === PaymentStatus.SUCCESS
  ) {
    throw new BadRequestException(
      'Payment has already been completed',
    );
  }

  if (
    payment.status === PaymentStatus.CANCELLED
  ) {
    throw new BadRequestException(
      'Cancelled payment cannot be processed',
    );
  }

  if (
    payment.status === PaymentStatus.FAILED
  ) {
    throw new BadRequestException(
      'Failed payment cannot be retried from this payment record',
    );
  }

  await this.prisma.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      status: PaymentStatus.PROCESSING,
    },
  });

  const updated =
    await this.prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: success
        ? {
            status: PaymentStatus.SUCCESS,
            gatewayOrderId:
              `DEMO-ORDER-${payment.id}`,
            gatewayPaymentId:
              `DEMO-PAY-${Date.now()}`,
            gatewaySignature:
              'DEMO-SIGNATURE',
            paidAt: new Date(),
            failureCode: null,
            failureMessage: null,
          }
        : {
            status: PaymentStatus.FAILED,
            gatewayOrderId:
              `DEMO-ORDER-${payment.id}`,
            failureCode:
              'DEMO_PAYMENT_FAILED',
            failureMessage:
              'Demo payment was intentionally failed',
          },
    });

  return {
    payment: updated,
  };
}
}