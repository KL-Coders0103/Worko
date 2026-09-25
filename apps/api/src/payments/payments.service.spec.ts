import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

import { PaymentsService } from './payments.service';

describe('PaymentsService authorization and idempotency', () => {
  const prisma = {
    client: { findUnique: jest.fn() },
    booking: { findUnique: jest.fn() },
    payment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
  };
  const realtime = { notifyUsers: jest.fn(), notifyUser: jest.fn() };
  const provider = { createOrder: jest.fn() };

  let service: PaymentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentsService(prisma as never, realtime as never, provider as never);
  });

  it('rejects payment creation when client profile is missing', async () => {
    prisma.client.findUnique.mockResolvedValue(null);

    await expect(
      service.createPayment('client-user-1', {
        bookingId: 'booking-1',
        idempotencyKey: 'idem-1',
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects payment access through a different user', async () => {
    prisma.client.findUnique.mockResolvedValue({
      id: 'client-1',
    });

    prisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      clientId: 'client-2',
      workerId: 'worker-1',
      payment: null,
    });

    await expect(
      service.createPayment('client-user-1', {
        bookingId: 'booking-1',
        idempotencyKey: 'idem-1',
      } as never),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns an existing payment for the same idempotency key', async () => {
    prisma.client.findUnique.mockResolvedValue({ id: 'client-1' });
    const payment = {
      id: 'payment-1',
      bookingId: 'booking-1',
      status: PaymentStatus.PENDING,
      idempotencyKey: 'idem-1',
      amount: 500,
      currency: 'INR',
      method: 'ONLINE',
    };
    prisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      clientId: 'client-1',
      workerId: 'worker-1',
      payment,
    });

    const result = await service.createPayment('client-user-1', {
      bookingId: 'booking-1',
      idempotencyKey: 'idem-1',
    } as never);

    expect(result.payment.id).toBe('payment-1');
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects a second idempotency key while payment is pending', async () => {
    prisma.client.findUnique.mockResolvedValue({ id: 'client-1' });
    prisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      clientId: 'client-1',
      workerId: 'worker-1',
      payment: {
        id: 'payment-1',
        status: PaymentStatus.PENDING,
        idempotencyKey: 'different-key',
      },
    });

    await expect(
      service.createPayment('client-user-1', {
        bookingId: 'booking-1',
        idempotencyKey: 'idem-1',
      } as never),
    ).rejects.toThrow(BadRequestException);
  });
});
