import { BadRequestException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

import {
  assertPaymentTransition,
  canTransitionPayment,
} from './payment-state-machine';

describe('Payment state machine', () => {
  it('allows valid payment transitions', () => {
    expect(
      canTransitionPayment(
        PaymentStatus.PENDING,
        PaymentStatus.PROCESSING,
      ),
    ).toBe(true);

    expect(
      canTransitionPayment(
        PaymentStatus.PROCESSING,
        PaymentStatus.SUCCESS,
      ),
    ).toBe(true);

    expect(
      canTransitionPayment(
        PaymentStatus.PROCESSING,
        PaymentStatus.FAILED,
      ),
    ).toBe(true);

    expect(
      canTransitionPayment(
        PaymentStatus.PROCESSING,
        PaymentStatus.CANCELLED,
      ),
    ).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(
      canTransitionPayment(
        PaymentStatus.PENDING,
        PaymentStatus.SUCCESS,
      ),
    ).toBe(false);

    expect(() =>
      assertPaymentTransition(
        PaymentStatus.SUCCESS,
        PaymentStatus.FAILED,
      ),
    ).toThrow(BadRequestException);
  });

  it('treats terminal states as terminal', () => {
    expect(
      canTransitionPayment(
        PaymentStatus.SUCCESS,
        PaymentStatus.PROCESSING,
      ),
    ).toBe(false);

    expect(
      canTransitionPayment(
        PaymentStatus.FAILED,
        PaymentStatus.SUCCESS,
      ),
    ).toBe(false);

    expect(
      canTransitionPayment(
        PaymentStatus.CANCELLED,
        PaymentStatus.PROCESSING,
      ),
    ).toBe(false);
  });

  it('allows idempotent same-state assertions', () => {
    expect(() =>
      assertPaymentTransition(
        PaymentStatus.SUCCESS,
        PaymentStatus.SUCCESS,
      ),
    ).not.toThrow();
  });
});
