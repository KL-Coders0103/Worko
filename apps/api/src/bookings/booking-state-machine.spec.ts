import { BadRequestException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';

import {
  assertBookingTransition,
  getAllowedBookingTransitions,
} from './booking-state-machine';

describe('Booking state machine', () => {
  it('allows every documented forward transition', () => {
    expect(() =>
      assertBookingTransition(
        BookingStatus.SEARCHING,
        BookingStatus.PENDING,
      ),
    ).not.toThrow();

    expect(() =>
      assertBookingTransition(
        BookingStatus.PENDING,
        BookingStatus.ACCEPTED,
      ),
    ).not.toThrow();

    expect(() =>
      assertBookingTransition(
        BookingStatus.ACCEPTED,
        BookingStatus.CONFIRMED,
      ),
    ).not.toThrow();

    expect(() =>
      assertBookingTransition(
        BookingStatus.CONFIRMED,
        BookingStatus.WORKER_EN_ROUTE,
      ),
    ).not.toThrow();

    expect(() =>
      assertBookingTransition(
        BookingStatus.WORKER_EN_ROUTE,
        BookingStatus.ARRIVED,
      ),
    ).not.toThrow();

    expect(() =>
      assertBookingTransition(
        BookingStatus.ARRIVED,
        BookingStatus.CHECKED_IN,
      ),
    ).not.toThrow();

    expect(() =>
      assertBookingTransition(
        BookingStatus.CHECKED_IN,
        BookingStatus.IN_PROGRESS,
      ),
    ).not.toThrow();

    expect(() =>
      assertBookingTransition(
        BookingStatus.IN_PROGRESS,
        BookingStatus.CHECKED_OUT,
      ),
    ).not.toThrow();

    expect(() =>
      assertBookingTransition(
        BookingStatus.CHECKED_OUT,
        BookingStatus.COMPLETED,
      ),
    ).not.toThrow();

    expect(() =>
      assertBookingTransition(
        BookingStatus.COMPLETED,
        BookingStatus.PAYMENT_RELEASED,
      ),
    ).not.toThrow();
  });

  it('rejects skipping required lifecycle states', () => {
    expect(() =>
      assertBookingTransition(
        BookingStatus.CONFIRMED,
        BookingStatus.IN_PROGRESS,
      ),
    ).toThrow(BadRequestException);

    expect(() =>
      assertBookingTransition(
        BookingStatus.CHECKED_IN,
        BookingStatus.COMPLETED,
      ),
    ).toThrow(BadRequestException);
  });

  it('keeps terminal states terminal', () => {
    expect(
      getAllowedBookingTransitions(
        BookingStatus.PAYMENT_RELEASED,
      ),
    ).toEqual([]);

    expect(
      getAllowedBookingTransitions(
        BookingStatus.REJECTED,
      ),
    ).toEqual([]);

    expect(
      getAllowedBookingTransitions(
        BookingStatus.CANCELLED,
      ),
    ).toEqual([]);
  });

  it('allows cancellation only where explicitly documented', () => {
    expect(() =>
      assertBookingTransition(
        BookingStatus.SEARCHING,
        BookingStatus.CANCELLED,
      ),
    ).not.toThrow();

    expect(() =>
      assertBookingTransition(
        BookingStatus.IN_PROGRESS,
        BookingStatus.CANCELLED,
      ),
    ).not.toThrow();

    expect(() =>
      assertBookingTransition(
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
      ),
    ).toThrow(BadRequestException);
  });
});
