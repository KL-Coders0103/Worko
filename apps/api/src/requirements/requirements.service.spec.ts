import { jest } from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { BookingStatus, RequirementAssignmentStatus, RequirementStatus, WorkerStatus } from '@prisma/client';

import { RequirementsService } from './requirements.service';

describe('RequirementsService authorization and matching boundaries', () => {
  const prisma = {
    client: { findUnique: jest.fn() },
    worker: { findUnique: jest.fn(), findMany: jest.fn() },
    category: { findFirst: jest.fn() },
    skill: { findFirst: jest.fn() },
    requirement: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    requirementAssignment: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    attendance: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const realtime = {
    notifyUser: jest.fn(),
    notifyWorkers: jest.fn(),
  };

  let service: RequirementsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RequirementsService(prisma as never, realtime as never);
  });

  it('rejects worker access when the worker has no assignment', async () => {
    prisma.requirement.findUnique.mockResolvedValue({
      id: 'req-1',
      clientId: 'client-1',
      assignments: [],
      booking: null,
    });
    prisma.worker.findUnique.mockResolvedValue({
      id: 'worker-1',
    });

    await expect(
      service.getOne('worker-user-1', 'WORKER', 'req-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects worker acceptance when the worker is not eligible', async () => {
    prisma.worker.findUnique.mockResolvedValue({
      id: 'worker-1',
      status: WorkerStatus.REJECTED,
      isAvailable: false,
      user: { status: 'ACTIVE' },
    });

    await expect(
      service.accept('worker-user-1', 'req-1'),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects overlapping active worker bookings', async () => {
    prisma.worker.findUnique.mockResolvedValue({
      id: 'worker-1',
      status: WorkerStatus.VERIFIED,
      isAvailable: true,
      user: { status: 'ACTIVE' },
    });

    prisma.requirementAssignment.findUnique.mockResolvedValue({
      id: 'assignment-1',
      workerId: 'worker-1',
      status: RequirementAssignmentStatus.OFFERED,
      requirement: {
        id: 'req-1',
        clientId: 'client-1',
        status: RequirementStatus.MATCHING,
        categoryId: 'cat-1',
        categoryName: 'Plumbing',
        skillId: null,
        skillName: null,
        title: 'Repair',
        description: null,
        scheduledStart: new Date(Date.now() + 60 * 60 * 1000),
        scheduledEnd: new Date(Date.now() + 2 * 60 * 60 * 1000),
        address: 'Work address',
        latitude: null,
        longitude: null,
      },
    });

    prisma.$transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback({
          requirementAssignment: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'assignment-1',
              workerId: 'worker-1',
              status: RequirementAssignmentStatus.OFFERED,
              requirement: {
                id: 'req-1',
                clientId: 'client-1',
                status: RequirementStatus.MATCHING,
                categoryId: 'cat-1',
                categoryName: 'Plumbing',
                skillId: null,
                skillName: null,
                title: 'Repair',
                description: null,
                scheduledStart: new Date(Date.now() + 60 * 60 * 1000),
                scheduledEnd: new Date(Date.now() + 2 * 60 * 60 * 1000),
                address: 'Work address',
                latitude: null,
                longitude: null,
              },
            }),
          },
          booking: {
            findUnique: jest.fn().mockResolvedValue(null),
            findFirst: jest.fn().mockResolvedValue({ id: 'booking-conflict' }),
          },
        }),
    );

    await expect(
      service.accept('worker-user-1', 'req-1'),
    ).rejects.toThrow(BadRequestException);
  });
});
