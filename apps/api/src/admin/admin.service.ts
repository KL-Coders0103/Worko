import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async getPendingWorkerKyc() {
    return this.prisma.worker.findMany({
      where: {
        status: {
          in: ['PENDING_KYC', 'KYC_SUBMITTED', 'UNDER_REVIEW'],
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        skills: {
          include: {
            skill: true,
          },
        },
        kycReviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async startWorkerKycReview(
    workerId: string,
    reviewerId: string,
  ) {
    const worker = await this.prisma.worker.findUnique({
      where: {
        id: workerId,
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    if (
      worker.status !== 'KYC_SUBMITTED' &&
      worker.status !== 'PENDING_KYC'
    ) {
      throw new BadRequestException(
        'Worker is not ready for KYC review',
      );
    }

    const updatedWorker =
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.worker.update({
          where: {
            id: workerId,
          },
          data: {
            status: 'UNDER_REVIEW',
          },
        });

        await tx.workerKycReview.create({
          data: {
            workerId,
            reviewerId,
          },
        });

        return updated;
      });

    return {
      message: 'Worker KYC review started',
      worker: updatedWorker,
    };
  }

  async approveWorkerKyc(
    workerId: string,
    reviewerId: string,
  ) {
    const worker = await this.prisma.worker.findUnique({
      where: {
        id: workerId,
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    if (worker.status !== 'UNDER_REVIEW') {
      throw new BadRequestException(
        'Worker must be under review before approval',
      );
    }

    const updatedWorker =
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.worker.update({
          where: {
            id: workerId,
          },
          data: {
            status: 'VERIFIED',
            verifiedAt: new Date(),
            rejectedAt: null,
          },
        });

        await tx.workerKycReview.updateMany({
          where: {
            workerId,
            reviewerId,
            completedAt: null,
          },
          data: {
            decision: 'APPROVED',
            completedAt: new Date(),
          },
        });

        return updated;
      });

    return {
      message: 'Worker KYC approved successfully',
      worker: updatedWorker,
    };
  }

  async rejectWorkerKyc(
    workerId: string,
    reviewerId: string,
    reason: string,
  ) {
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      throw new BadRequestException(
        'Rejection reason is required',
      );
    }

    const worker = await this.prisma.worker.findUnique({
      where: {
        id: workerId,
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    if (worker.status !== 'UNDER_REVIEW') {
      throw new BadRequestException(
        'Worker must be under review before rejection',
      );
    }

    const updatedWorker =
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.worker.update({
          where: {
            id: workerId,
          },
          data: {
            status: 'REJECTED',
            rejectedAt: new Date(),
            verifiedAt: null,
          },
        });

        await tx.workerKycReview.updateMany({
          where: {
            workerId,
            reviewerId,
            completedAt: null,
          },
          data: {
            decision: 'REJECTED',
            rejectionReason: trimmedReason,
            completedAt: new Date(),
          },
        });

        return updated;
      });

    return {
      message: 'Worker KYC rejected',
      worker: updatedWorker,
    };
  }

  async getWorkerKycDocument(
    workerId: string,
    documentType: 'aadhaar' | 'police-verification',
  ) {
    const worker = await this.prisma.worker.findUnique({
      where: {
        id: workerId,
      },
      select: {
        id: true,
        aadhaarDocumentKey: true,
        policeVerificationDocumentKey: true,
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    const documentKey =
      documentType === 'aadhaar'
        ? worker.aadhaarDocumentKey
        : worker.policeVerificationDocumentKey;

    if (!documentKey) {
      throw new NotFoundException(
        'KYC document not found',
      );
    }

    return this.storageService.downloadPrivateObject(
      documentKey,
    );
  }
}