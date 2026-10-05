import { ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { PaymentStatus, RequirementStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';

type RazorpayOrder = { id: string; amount: number; currency: string; status: string; receipt?: string };
type RazorpayPayment = { id: string; order_id: string; amount: number; currency: string; status: string };

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly apiUrl = 'https://api.razorpay.com/v1';

  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
  ) {}

  async createIntent(clientId: string, requirementId: string) {
    const config = this.getConfig();
    const requirement = await this.prisma.requirement.findFirst({
      where: { id: requirementId, clientId },
      select: {
        id: true,
        title: true,
        status: true,
        budget: true,
        currency: true,
        payment: true,
        category: { select: { name: true } },
      },
    });
    if (!requirement) throw new NotFoundException('Requirement not found.');
    if (requirement.status !== RequirementStatus.PAYMENT_PENDING && requirement.status !== RequirementStatus.MATCHING && requirement.status !== RequirementStatus.MATCHED) {
      throw new ConflictException('This requirement is not payable.');
    }

    const configuredAmount = Number(requirement.budget);
    const testAmount = process.env.WORKO_TEST_PAYMENT_AMOUNT ? Number(process.env.WORKO_TEST_PAYMENT_AMOUNT) : NaN;
    const amount = Number.isFinite(configuredAmount) && configuredAmount > 0
      ? configuredAmount
      : process.env.NODE_ENV !== 'production' && Number.isFinite(testAmount) && testAmount > 0
        ? testAmount
        : NaN;

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ConflictException('A verified service quote is required before payment can be created.');
    }

    const idempotencyKey = requirement.payment?.idempotencyKey ?? randomUUID();
    const payment = requirement.payment
      ? requirement.payment
      : await this.prisma.requirementPayment.create({
          data: {
            requirementId,
            amount,
            currency: requirement.currency,
            idempotencyKey,
            status: PaymentStatus.PENDING,
          },
        });

    if (payment.providerOrderId) {
      return {
        data: {
          requirementId,
          paymentId: payment.id,
          amount: Number(payment.amount),
          currency: payment.currency,
          provider: 'razorpay',
          keyId: config.keyId,
          orderId: payment.providerOrderId,
          status: payment.status,
          category: requirement.category.name,
          title: requirement.title,
        },
      };
    }

    const order = await this.createRazorpayOrder({
      amountPaise: Math.round(Number(payment.amount) * 100),
      currency: payment.currency,
      receipt: `worko_${requirementId.slice(0, 18)}`,
    });

    const saved = await this.prisma.requirementPayment.update({
      where: { id: payment.id },
      data: { providerOrderId: order.id, providerReference: order.id },
    });

    return {
      data: {
        requirementId,
        paymentId: saved.id,
        amount: Number(saved.amount),
        currency: saved.currency,
        provider: 'razorpay',
        keyId: config.keyId,
        orderId: order.id,
        status: saved.status,
        category: requirement.category.name,
        title: requirement.title,
      },
    };
  }

  async verifyCallback(
    clientId: string,
    requirementId: string,
    input: { razorpayPaymentId?: unknown; razorpayOrderId?: unknown; razorpaySignature?: unknown },
  ) {
    const paymentId = typeof input.razorpayPaymentId === 'string' ? input.razorpayPaymentId : '';
    const orderId = typeof input.razorpayOrderId === 'string' ? input.razorpayOrderId : '';
    const signature = typeof input.razorpaySignature === 'string' ? input.razorpaySignature : '';
    if (!paymentId || !orderId || !signature) throw new UnauthorizedException('Incomplete payment verification data.');

    const payment = await this.prisma.requirementPayment.findFirst({
      where: { requirementId, requirement: { clientId } },
      select: { id: true, amount: true, currency: true, providerOrderId: true, status: true },
    });
    if (!payment || payment.providerOrderId !== orderId) throw new UnauthorizedException('Payment order does not match this requirement.');

    const expected = createHmac('sha256', this.getConfig().keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    if (!this.safeEqual(expected, signature)) throw new UnauthorizedException('Invalid payment signature.');

    const providerPayment = await this.fetchRazorpayPayment(paymentId);
    if (providerPayment.order_id !== orderId || providerPayment.amount !== Math.round(Number(payment.amount) * 100) || providerPayment.currency !== payment.currency) {
      throw new UnauthorizedException('Payment details do not match the server order.');
    }

    if (providerPayment.status === 'captured') {
      await this.finalizeCapturedPayment(orderId, paymentId, Number(payment.amount));
      return { data: { verified: true, status: PaymentStatus.CAPTURED } };
    }

    if (providerPayment.status === 'authorized') {
      await this.prisma.requirementPayment.update({ where: { id: payment.id }, data: { status: PaymentStatus.AUTHORIZED, providerReference: paymentId } });
      return { data: { verified: true, status: PaymentStatus.AUTHORIZED } };
    }

    await this.prisma.requirementPayment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED, providerReference: paymentId } });
    return { data: { verified: false, status: PaymentStatus.FAILED } };
  }

  async handleWebhook(rawBody: Buffer, signature: string, payload: Record<string, any>) {
    const config = this.getConfig();
    const expected = createHmac('sha256', config.webhookSecret).update(rawBody).digest('hex');
    if (!this.safeEqual(expected, signature)) throw new UnauthorizedException('Invalid webhook signature.');

    const eventId = typeof payload.id === 'string' ? payload.id : '';
    const eventType = typeof payload.event === 'string' ? payload.event : '';
    if (!eventId || !eventType) throw new ConflictException('Invalid webhook payload.');

    try {
      await this.prisma.paymentWebhookEvent.create({
        data: { id: randomUUID(), eventId, eventType, payload },
      });
    } catch {
      return { received: true, duplicate: true };
    }

    const entity = payload?.payload?.payment?.entity;
    const orderEntity = payload?.payload?.order?.entity;
    const paymentEntity = entity as RazorpayPayment | undefined;
    const orderId = paymentEntity?.order_id ?? orderEntity?.id;
    const paymentId = paymentEntity?.id;

    if (['payment.captured', 'order.paid'].includes(eventType) && orderId && paymentId) {
      const payment = await this.prisma.requirementPayment.findUnique({ where: { providerOrderId: orderId }, select: { amount: true } });
      if (payment && paymentEntity && paymentEntity.status === 'captured') {
        await this.finalizeCapturedPayment(orderId, paymentId, Number(payment.amount));
      } else if (payment && eventType === 'order.paid') {
        await this.finalizeCapturedPayment(orderId, paymentId ?? orderId, Number(payment.amount));
      }
    }

    if (eventType === 'payment.failed' && orderId) {
      await this.prisma.requirementPayment.updateMany({
        where: { providerOrderId: orderId, status: { in: [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED] } },
        data: { status: PaymentStatus.FAILED },
      });
    }

    return { received: true };
  }

  private async finalizeCapturedPayment(orderId: string, paymentId: string, amount: number) {
    let shouldMatch = false;

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.requirementPayment.findUnique({
        where: { providerOrderId: orderId },
        select: { id: true, requirementId: true, status: true, amount: true, currency: true },
      });
      if (!payment) return;
      if (Number(payment.amount) !== amount) throw new ConflictException('Captured amount does not match the Worko order.');
      if (payment.status === PaymentStatus.CAPTURED) return;

      await tx.requirementPayment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.CAPTURED, providerReference: paymentId },
      });
      await tx.paymentTransaction.create({
        data: {
          requirementPaymentId: payment.id,
          status: PaymentStatus.CAPTURED,
          amount: payment.amount,
          providerReference: paymentId,
          idempotencyKey: `captured:${paymentId}`,
        },
      });
      const updated = await tx.requirement.updateMany({
        where: { id: payment.requirementId, status: RequirementStatus.PAYMENT_PENDING },
        data: { status: RequirementStatus.MATCHING },
      });
      shouldMatch = updated.count === 1;
    });

    if (shouldMatch) {
      await this.matching.startMatching(
        (await this.prisma.requirementPayment.findUniqueOrThrow({ where: { providerOrderId: orderId }, select: { requirementId: true } })).requirementId,
      );
    }
  }

  private async createRazorpayOrder(input: { amountPaise: number; currency: string; receipt: string }): Promise<RazorpayOrder> {
    const response = await fetch(`${this.apiUrl}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.getConfig().keyId}:${this.getConfig().keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: input.currency,
        receipt: input.receipt,
        payment_capture: 1,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      this.logger.error(`Razorpay order creation failed: ${response.status}`);
      throw new ServiceUnavailableException('Unable to create the payment order.');
    }
    return payload as RazorpayOrder;
  }

  private async fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
    const response = await fetch(`${this.apiUrl}/payments/${encodeURIComponent(paymentId)}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.getConfig().keyId}:${this.getConfig().keySecret}`).toString('base64')}`,
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new ServiceUnavailableException('Unable to verify the payment with the provider.');
    return payload as RazorpayPayment;
  }

  private getConfig() {
    const keyId = process.env.RAZORPAY_KEY_ID ?? '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
    if (!keyId || !keySecret || !webhookSecret) {
      throw new ServiceUnavailableException('Razorpay is not configured on the Worko API.');
    }
    return { keyId, keySecret, webhookSecret };
  }

  private safeEqual(left: string, right: string): boolean {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
