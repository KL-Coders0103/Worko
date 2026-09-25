import {Injectable} from '@nestjs/common';
import {PaymentProvider} from '../payment-provider.interface';

@Injectable()
export class DemoPaymentProvider implements PaymentProvider {
  async createOrder(input: {
    paymentId: string;
    amount: import('@prisma/client').Prisma.Decimal;
    currency: string;
    idempotencyKey: string;
  }) {
    return {
      gatewayOrderId: `DEMO-ORDER-${input.paymentId}`,
    };
  }

  async completePayment(input: {
    paymentId: string;
    amount: import('@prisma/client').Prisma.Decimal;
    currency: string;
    success: boolean;
  }) {
    if (!input.success) {
      return {
        success: false,
        failureCode: 'DEMO_PAYMENT_FAILED',
        failureMessage: 'Demo payment was intentionally failed',
      };
    }

    return {
      success: true,
      gatewayPaymentId: `DEMO-PAY-${input.paymentId}`,
      gatewaySignature: 'DEMO-SIGNATURE',
    };
  }
}
