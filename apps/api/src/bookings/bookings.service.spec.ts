import { jest } from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';

import { BookingsService } from './bookings.service';

describe('BookingsService authorization boundaries', () => {
  const prisma = {
    client: {findUnique: jest.fn()},
    worker: {findUnique: jest.fn()},
    booking: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const realtime = {
    notifyUsers: jest.fn(),
    notifyUser: jest.fn(),
  };

  const wallet = {
    creditWalletInTransaction: jest.fn(),
  };

  let service: BookingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BookingsService(
      prisma as never,
      realtime as never,
      wallet as never,
    );
  });

  it('rejects a client who does not own a booking', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      clientId: 'client-2',
      workerId: 'worker-1',
    });
    prisma.client.findUnique.mockResolvedValue({
      id: 'client-1',
    });

    await expect(
      service.getBookingById(
        'client-user-1',
        'CLIENT',
        'booking-1',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects a worker who is not assigned to a booking', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      clientId: 'client-1',
      workerId: 'worker-2',
    });
    prisma.worker.findUnique.mockResolvedValue({
      id: 'worker-1',
    });

    await expect(
      service.getBookingById(
        'worker-user-1',
        'WORKER',
        'booking-1',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('requires completion before payment release', async () => {
    prisma.booking.findUnique
      .mockResolvedValueOnce({
        id: 'booking-1',
        clientId: 'client-1',
        workerId: 'worker-1',
      })
      .mockResolvedValueOnce({
        id: 'booking-1',
        status: BookingStatus.IN_PROGRESS,
        clientId: 'client-1',
        workerId: 'worker-1',
        payment: {
          status: 'SUCCESS',
          amount: 500,
        },
      });
    prisma.client.findUnique.mockResolvedValue({
      id: 'client-1',
    });

    prisma.$transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback({
          booking: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'booking-1',
              status: BookingStatus.IN_PROGRESS,
              clientId: 'client-1',
              workerId: 'worker-1',
              payment: {
                status: 'SUCCESS',
                amount: 500,
              },
            }),
          },
        }),
    );

    await expect(
      service.releasePayment(
        'client-user-1',
        'booking-1',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(wallet.creditWalletInTransaction).not.toHaveBeenCalled();
  });
});
