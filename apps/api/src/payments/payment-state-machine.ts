import {BadRequestException} from '@nestjs/common';
import {PaymentStatus} from '@prisma/client';

const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  [PaymentStatus.PENDING]: [
    PaymentStatus.PROCESSING,
    PaymentStatus.CANCELLED,
  ],
  [PaymentStatus.PROCESSING]: [
    PaymentStatus.SUCCESS,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
  ],
  [PaymentStatus.SUCCESS]: [],
  [PaymentStatus.FAILED]: [],
  [PaymentStatus.CANCELLED]: [],
};

export function canTransitionPayment(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}

export function assertPaymentTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): void {
  if (from === to) {
    return;
  }

  if (!canTransitionPayment(from, to)) {
    throw new BadRequestException(
      `Invalid payment transition: ${from} -> ${to}`,
    );
  }
}
