import {BadRequestException, Injectable, UnauthorizedException} from '@nestjs/common';
import {createHmac, timingSafeEqual} from 'node:crypto';
import {PaymentStatus, Prisma} from '@prisma/client';
import {PrismaService} from '../common/prisma/prisma.service';
import {ConfigService} from '@nestjs/config';
import {RealtimeGateway} from '../realtime/realtime.gateway';
import {REALTIME_EVENTS} from '../realtime/realtime.types';
import {PaymentWebhookDto, PaymentWebhookEventType} from './dto/payment-webhook.dto';
import {assertPaymentTransition} from './payment-state-machine';

@Injectable()
export class PaymentWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly config: ConfigService,
  ) {}

  private verifySignature(rawBody: string, signature: string | undefined) {
    if (!signature) throw new UnauthorizedException('Missing webhook signature');
    const secret = this.config.get<string>('payments.webhookSecret');
    if (!secret) throw new UnauthorizedException('Webhook signing is not configured');

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const received = signature.replace(/^sha256=/, '').trim();
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(received, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  async handle(rawBody: string, signature: string | undefined, dto: PaymentWebhookDto) {
    this.verifySignature(rawBody, signature);

    try {
    return this.prisma.$transaction(async tx => {
      const existing = await tx.paymentWebhookEvent.findUnique({
        where: {eventId: dto.eventId},
      });
      if (existing) return {processed: true, duplicate: true};

      const payment = await tx.payment.findUnique({
        where: {id: dto.paymentId},
        include: {booking: {select: {workerId: true, serviceTitle: true}}},
      });
      if (!payment) throw new BadRequestException('Payment not found');

      const target = dto.type === PaymentWebhookEventType.PAYMENT_SUCCEEDED
        ? PaymentStatus.SUCCESS
        : PaymentStatus.FAILED;

      assertPaymentTransition(payment.status, target);

      if (payment.status !== PaymentStatus.PROCESSING) {
        throw new BadRequestException(
          `Payment is not processing: ${payment.status}`,
        );
      }

      const updated = await tx.payment.update({
        where: {id: payment.id},
        data: {
          status: target,
          gatewayPaymentId: dto.gatewayPaymentId ?? undefined,
          gatewaySignature: dto.gatewaySignature ?? undefined,
          paidAt: target === PaymentStatus.SUCCESS ? new Date() : null,
          failureCode: dto.failureCode ?? null,
          failureMessage: dto.failureMessage ?? null,
        },
      });

      await tx.paymentWebhookEvent.create({
        data: {
          eventId: dto.eventId,
          paymentId: payment.id,
          type: dto.type,
        },
      });

      return {processed: true, duplicate: false, payment: updated};
    }).then(async result => {
      if (result.payment) {
        const payment = await this.prisma.payment.findUnique({
          where: {id: dto.paymentId},
          select: {
            booking: {
              select: {
                client: {select: {userId: true}},
                worker: {select: {userId: true}},
              },
            },
          },
        });
        if (payment) {
          this.realtime.notifyUsers(
            [
              payment.booking.client.userId,
              ...(payment.booking.worker?.userId ? [payment.booking.worker.userId] : []),
            ],
            REALTIME_EVENTS.PAYMENT_STATUS_CHANGED,
            {
              paymentId: dto.paymentId,
              status: result.payment.status,
              changedAt: new Date(),
            },
          );
        }
      }
      return result;
    })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.paymentWebhookEvent.findUnique({
          where: {eventId: dto.eventId},
        });
        if (existing) return {processed: true, duplicate: true};
      }
      throw error;
    };
  }
}
