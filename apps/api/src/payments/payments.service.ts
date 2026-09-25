import {
  BadRequestException,
  ForbiddenException,
  Inject,
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
import { WalletService } from '../wallet/wallet.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { REALTIME_EVENTS } from '../realtime/realtime.types';
import {assertPaymentTransition} from './payment-state-machine';
import {PaymentProvider} from './payment-provider.interface';
import {PAYMENT_PROVIDER} from './payment-provider.token';
import {toPaymentResponse} from './dto/payment-response.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly realtime: RealtimeGateway,
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProvider,
  ) {}

  async createPayment(userId: string, dto: CreatePaymentDto) {
    const client = await this.prisma.client.findUnique({
      where: {userId},
      select: {id: true},
    });
    if (!client) throw new BadRequestException('Client profile not found');

    const booking = await this.prisma.booking.findUnique({
      where: {id: dto.bookingId},
      include: {worker: {select: {id: true}}, payment: true},
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.clientId !== client.id) {
      throw new ForbiddenException('You do not have access to this booking');
    }
    if (booking.status === BookingStatus.REJECTED || booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Payment is not allowed for this booking');
    }

    if (booking.payment) {
      if (booking.payment.status === PaymentStatus.SUCCESS) {
        throw new BadRequestException('Booking has already been paid');
      }
      if (
        booking.payment.status === PaymentStatus.PENDING ||
        booking.payment.status === PaymentStatus.PROCESSING
      ) {
        if (booking.payment.idempotencyKey === dto.idempotencyKey) {
          return {payment: toPaymentResponse(booking.payment)};
        }
        throw new BadRequestException('A payment is already in progress for this booking');
      }
      throw new BadRequestException('This booking already has a terminal payment record');
    }

    const amount = this.calculateBookingAmount(booking);
    let payment;
    try {
      payment = await this.prisma.payment.create({
        data: {
          bookingId: booking.id,
          status: PaymentStatus.PENDING,
          method: 'ONLINE',
          amount,
          currency: 'INR',
          idempotencyKey: dto.idempotencyKey,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.payment.findUnique({
          where: {idempotencyKey: dto.idempotencyKey},
        });
        if (existing) {
          if (existing.bookingId !== booking.id) {
            throw new BadRequestException('Idempotency key has already been used');
          }
          return {payment: toPaymentResponse(existing)};
        }
      }
      throw error;
    }

    try {
      const order = await this.paymentProvider.createOrder({
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        idempotencyKey: payment.idempotencyKey,
      });
      payment = await this.prisma.payment.update({
        where: {id: payment.id},
        data: {gatewayOrderId: order.gatewayOrderId},
      });
    } catch {
      payment = await this.transitionPayment(payment.id, PaymentStatus.FAILED, {
        failureCode: 'PAYMENT_PROVIDER_ERROR',
        failureMessage: 'Unable to create payment order',
      });
      return {payment: toPaymentResponse(payment)};
    }

    await this.notifyPaymentStatusChanged(payment.id, payment.status);
    return {payment: toPaymentResponse(payment)};
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

    return {payment: toPaymentResponse(payment)};
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

    return {payment: payment ? toPaymentResponse(payment) : null};
  }

  async cancelPayment(userId: string, paymentId: string, dto: PaymentActionDto) {
    const payment = await this.prisma.payment.findUnique({
      where: {id: paymentId},
      include: {booking: {select: {clientId: true, workerId: true}}},
    });
    if (!payment) throw new NotFoundException('Payment not found');

    await this.assertPaymentAccess(
      userId,
      payment.booking.clientId,
      payment.booking.workerId,
    );
    assertPaymentTransition(payment.status, PaymentStatus.CANCELLED);

    const changed = await this.prisma.payment.updateMany({
      where: {id: payment.id, status: payment.status},
      data: {
        status: PaymentStatus.CANCELLED,
        failureMessage: dto.reason?.trim() || undefined,
      },
    });
    if (changed.count !== 1) {
      throw new BadRequestException('Payment changed before it could be cancelled');
    }

    const updated = await this.prisma.payment.findUniqueOrThrow({
      where: {id: payment.id},
    });
    await this.notifyPaymentStatusChanged(updated.id, updated.status);
    return {payment: toPaymentResponse(updated)};
  }

  private async transitionPayment(
    paymentId: string,
    targetStatus: PaymentStatus,
    data: Prisma.PaymentUpdateInput = {},
  ) {
    const current = await this.prisma.payment.findUnique({
      where: {id: paymentId},
    });
    if (!current) throw new NotFoundException('Payment not found');

    assertPaymentTransition(current.status, targetStatus);

    const changed = await this.prisma.payment.updateMany({
      where: {id: paymentId, status: current.status},
      data: {status: targetStatus, ...data},
    });
    if (changed.count !== 1) {
      throw new BadRequestException('Payment changed before the transition completed');
    }

    const updated = await this.prisma.payment.findUniqueOrThrow({
      where: {id: paymentId},
    });
    await this.notifyPaymentStatusChanged(updated.id, updated.status);
    return updated;
  }

  private async notifyPaymentStatusChanged(
    paymentId: string,
    status: PaymentStatus,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: {id: paymentId},
      select: {
        booking: {
          select: {
            client: {select: {userId: true}},
            worker: {select: {userId: true}},
          },
        },
      },
    });

    if (!payment) {
      return;
    }

    this.realtime.notifyUsers(
      [
        payment.booking.client.userId,
        ...(payment.booking.worker?.userId
          ? [payment.booking.worker.userId]
          : []),
      ],
      REALTIME_EVENTS.PAYMENT_STATUS_CHANGED,
      {
        paymentId,
        status,
        changedAt: new Date(),
      },
    );
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
    workerId: string | null,
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
      workerId !== null &&
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
  const result  = await this.prisma.$transaction(
    async (tx) => {
      const payment =
        await tx.payment.findUnique({
          where: {
            id: paymentId,
          },
          include: {
            booking: {
              select: {
                clientId: true,
                workerId: true,
                serviceTitle: true,
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
        await tx.client.findUnique({
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
        payment.status ===
        PaymentStatus.SUCCESS
      ) {
        throw new BadRequestException(
          'Payment has already been completed',
        );
      }

      if (
        payment.status ===
        PaymentStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'Cancelled payment cannot be processed',
        );
      }

      if (
        payment.status ===
        PaymentStatus.FAILED
      ) {
        throw new BadRequestException(
          'Failed payment cannot be retried from this payment record',
        );
      }

      assertPaymentTransition(
        payment.status,
        PaymentStatus.PROCESSING,
      );

      const processing = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: payment.status,
        },
        data: {
          status: PaymentStatus.PROCESSING,
        },
      });

      if (processing.count !== 1) {
        throw new BadRequestException(
          'Payment changed before processing started',
        );
      }

      /*
       * DEMO FAILURE
       *
       * Payment becomes FAILED.
       * No wallet movement occurs.
       */
      if (!success) {
        assertPaymentTransition(
          PaymentStatus.PROCESSING,
          PaymentStatus.FAILED,
        );

        const failedPayment =
          await tx.payment.update({
            where: {
              id: payment.id,
            },
            data: {
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
          payment: failedPayment,
        };
      }

      /*
       * DEMO SUCCESS
       *
       * Payment SUCCESS + worker wallet credit
       * happen inside the same DB transaction.
       */

      assertPaymentTransition(
        PaymentStatus.PROCESSING,
        PaymentStatus.SUCCESS,
      );

      const updatedPayment =
        await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
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
          },
        });

      /*
       * Find the worker's user ID.
       */
      const worker =
        await tx.worker.findUnique({
          where: {
            id: payment.booking.workerId!,
          },
          select: {
            userId: true,
          },
        });

      if (!worker) {
        throw new NotFoundException(
          'Booking worker not found',
        );
      }

      /*
       * Credit worker wallet.
       */
      await this.walletService.creditWalletInTransaction(
        tx,
        worker.userId,
        payment.amount,
        'PAYMENT',
        payment.id,
        `Payment received for ${payment.booking.serviceTitle}`,
      );

      return {
        payment: updatedPayment,
      };
    },
  );

  await this.notifyPaymentStatusChanged(
    result.payment.id,
    result.payment.status,
  );

  return {payment: toPaymentResponse(result.payment)};
}
}