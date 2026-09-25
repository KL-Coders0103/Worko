import {Prisma} from '@prisma/client';

export interface PaymentProviderCreateOrderInput {
  paymentId: string;
  amount: Prisma.Decimal;
  currency: string;
  idempotencyKey: string;
}

export interface PaymentProviderCreateOrderResult {
  gatewayOrderId: string;
}

export interface PaymentProviderCompletionInput {
  paymentId: string;
  amount: Prisma.Decimal;
  currency: string;
  success: boolean;
}

export interface PaymentProviderCompletionResult {
  success: boolean;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  failureCode?: string;
  failureMessage?: string;
}

export interface PaymentProvider {
  createOrder(
    input: PaymentProviderCreateOrderInput,
  ): Promise<PaymentProviderCreateOrderResult>;

  completePayment(
    input: PaymentProviderCompletionInput,
  ): Promise<PaymentProviderCompletionResult>;
}
