import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { WorkerStatus } from '@prisma/client';

import { WorkersService } from './workers.service';

describe('WorkersService KYC security boundaries', () => {
  const prisma = {
    worker: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    userLocation: { findUnique: jest.fn() },
    workerCategory: { deleteMany: jest.fn(), createMany: jest.fn() },
    workerSkill: { deleteMany: jest.fn(), createMany: jest.fn() },
    category: { findMany: jest.fn() },
    skill: { findMany: jest.fn() },
    workerKycReview: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const storage = {
    uploadKycDocument: jest.fn(),
    uploadProfileImage: jest.fn(),
    deletePrivateObject: jest.fn(),
    downloadPrivateObject: jest.fn(),
  };

  let service: WorkersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkersService(prisma as never, storage as never);
  });

  it('rejects KYC submission without required documents', async () => {
    prisma.worker.findUnique.mockResolvedValue({
      id: 'worker-1',
      status: WorkerStatus.PENDING_KYC,
      aadhaarDocumentKey: 'kyc/worker-1/aadhaar/doc',
      policeVerificationDocumentKey: null,
    });

    await expect(
      service.submitKycDocuments('worker-user-1'),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.worker.update).not.toHaveBeenCalled();
  });

  it('does not allow KYC document retrieval through the worker service without a stored document', async () => {
    prisma.worker.findUnique.mockResolvedValue({
      aadhaarDocumentKey: null,
      policeVerificationDocumentKey: null,
    });

    await expect(
      service.getKycDocument('worker-1', 'aadhaar'),
    ).rejects.toThrow();

    expect(storage.downloadPrivateObject).not.toHaveBeenCalled();
  });
});
