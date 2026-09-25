import {Payment, PaymentStatus, PaymentMethod} from '@prisma/client';

export class PaymentResponseDto {
  id!: string;
  bookingId!: string;
  status!: PaymentStatus;
  method!: PaymentMethod;
  amount!: Payment['amount'];
  currency!: string;
  gatewayOrderId!: string | null;
  gatewayPaymentId!: string | null;
  failureCode!: string | null;
  failureMessage!: string | null;
  paidAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export function toPaymentResponse(payment: Payment): PaymentResponseDto {
  return {
    id: payment.id,
    bookingId: payment.bookingId,
    status: payment.status,
    method: payment.method,
    amount: payment.amount,
    currency: payment.currency,
    gatewayOrderId: payment.gatewayOrderId,
    gatewayPaymentId: payment.gatewayPaymentId,
    failureCode: payment.failureCode,
    failureMessage: payment.failureMessage,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}
