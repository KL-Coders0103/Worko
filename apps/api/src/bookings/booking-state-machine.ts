import { BadRequestException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';

export const BOOKING_TRANSITIONS: Readonly<
  Record<BookingStatus, readonly BookingStatus[]>
> = {
  [BookingStatus.SEARCHING]: [BookingStatus.PENDING, BookingStatus.CANCELLED],
  [BookingStatus.PENDING]: [
    BookingStatus.ACCEPTED,
    BookingStatus.REJECTED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.ACCEPTED]: [
    BookingStatus.CONFIRMED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.WORKER_EN_ROUTE,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.WORKER_EN_ROUTE]: [
    BookingStatus.ARRIVED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.ARRIVED]: [
    BookingStatus.CHECKED_IN,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.CHECKED_IN]: [
    BookingStatus.IN_PROGRESS,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.IN_PROGRESS]: [
    BookingStatus.CHECKED_OUT,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.CHECKED_OUT]: [
    BookingStatus.COMPLETED,
  ],
  [BookingStatus.COMPLETED]: [
    BookingStatus.PAYMENT_RELEASED,
  ],
  [BookingStatus.PAYMENT_RELEASED]: [],
  [BookingStatus.REJECTED]: [],
  [BookingStatus.CANCELLED]: [],
};

export function assertBookingTransition(
  current: BookingStatus,
  next: BookingStatus,
): void {
  if (!BOOKING_TRANSITIONS[current].includes(next)) {
    throw new BadRequestException(
      `Invalid booking status transition: ${current} -> ${next}`,
    );
  }
}

export function getAllowedBookingTransitions(
  current: BookingStatus,
): readonly BookingStatus[] {
  return BOOKING_TRANSITIONS[current];
}
