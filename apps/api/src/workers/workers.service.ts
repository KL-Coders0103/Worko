import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../common/prisma/prisma.service';

import {
  CreateWorkerProfileDto,
  UpdateWorkerCategoriesDto,
  UpdateWorkerLocationDto,
  UpdateWorkerProfileDto,
  UpdateWorkerSkillsDto,
} from './dto/worker.dto';
import { StorageService } from '../storage/storage.service';
import { KycReviewDecision, WorkerStatus } from '@prisma/client';
@Injectable()
export class WorkersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: 
    StorageService
  ) {}

  async getMyProfile(userId: string) {
    const worker = await this.prisma.worker.findUnique({
      where: {
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            role: true,
            status: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        skills: {
          include: {
            skill: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker profile not found');
    }

    return {
      worker: {
        ...this.toSafeWorkerResponse(worker),
        user: worker.user,
        categories: worker.categories,
        skills: worker.skills,
      },
    };
  }

  async createProfile(
    userId: string,
    dto: CreateWorkerProfileDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    if (user.role !== 'WORKER') {
      throw new BadRequestException(
        'Only worker accounts can create a worker profile',
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new BadRequestException(
        'User account is not active',
      );
    }

    const existingWorker = await this.prisma.worker.findUnique({
      where: {
        userId,
      },
    });

    if (existingWorker) {
      throw new BadRequestException(
        'Worker profile already exists',
      );
    }

    const worker = await this.prisma.worker.create({
      data: {
        userId,
        bio: dto.bio,
        experienceYears: dto.experienceYears,
        expectedHourlyRate: dto.expectedHourlyRate,
        expectedDailyRate: dto.expectedDailyRate,
        isAvailable: dto.isAvailable ?? true,
      },
    });

    return {
      message: 'Worker profile created successfully',
      worker: this.toSafeWorkerResponse(worker),
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateWorkerProfileDto,
  ) {
    const worker = await this.prisma.worker.findUnique({
      where: {
        userId,
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker profile not found');
    }

    if (worker.status !== 'DRAFT' && worker.status !== 'REJECTED' && worker.status !== 'VERIFIED') {
      throw new BadRequestException(
        'Worker profile can only be edited while in DRAFT ,REJECTED or VERIFIED status',
      );
    }

    const updatedWorker = await this.prisma.worker.update({
      where: {
        userId,
      },
      data: {
        bio: dto.bio,
        experienceYears: dto.experienceYears,
        expectedHourlyRate: dto.expectedHourlyRate,
        expectedDailyRate: dto.expectedDailyRate,
        isAvailable: dto.isAvailable,
        },
    });

    return {
      message: 'Worker profile updated successfully',
      worker: this.toSafeWorkerResponse(updatedWorker),
    };
  }

  async updateCategories(
    userId: string,
    dto: UpdateWorkerCategoriesDto,
  ) {
    const worker = await this.prisma.worker.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker profile not found');
    }

    if (worker.status !== 'DRAFT' && worker.status !== 'REJECTED') {
      throw new BadRequestException(
        'Worker categories can only be edited while in DRAFT or REJECTED status',
      );
    }

    const uniqueCategoryIds = [...new Set(dto.categoryIds)];

    if (uniqueCategoryIds.length === 0) {
      await this.prisma.workerCategory.deleteMany({
        where: {
          workerId: worker.id,
        },
      });

      return {
        message: 'Worker categories updated successfully',
        categoryIds: [],
      };
    }

    const categories = await this.prisma.category.findMany({
      where: {
        id: {
          in: uniqueCategoryIds,
        },
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });

    if (categories.length !== uniqueCategoryIds.length) {
      throw new BadRequestException(
        'One or more selected categories are invalid or inactive',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workerCategory.deleteMany({
        where: {
          workerId: worker.id,
        },
      });

      await tx.workerCategory.createMany({
        data: uniqueCategoryIds.map((categoryId) => ({
          workerId: worker.id,
          categoryId,
        })),
      });
    });

    return {
      message: 'Worker categories updated successfully',
      categoryIds: uniqueCategoryIds,
    };
  }

  async updateSkills(
    userId: string,
    dto: UpdateWorkerSkillsDto,
  ) {
    const worker = await this.prisma.worker.findUnique({
      where: {
        userId,
      },
      include: {
        categories: {
          select: {
            categoryId: true,
          },
        },
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker profile not found');
    }

    if (worker.status !== 'DRAFT' && worker.status !== "REJECTED") {
      throw new BadRequestException(
        'Worker skills can only be edited while in DRAFT or REJECTED status',
      );
    }

    const uniqueSkillIds = [...new Set(dto.skillIds)];

    if (uniqueSkillIds.length === 0) {
      await this.prisma.workerSkill.deleteMany({
        where: {
          workerId: worker.id,
        },
      });

      return {
        message: 'Worker skills updated successfully',
        skillIds: [],
      };
    }

    const selectedCategoryIds = worker.categories.map(
      (category) => category.categoryId,
    );

    if (selectedCategoryIds.length === 0) {
      throw new BadRequestException(
        'Select at least one worker category before selecting skills',
      );
    }

    const skills = await this.prisma.skill.findMany({
      where: {
        id: {
          in: uniqueSkillIds,
        },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        categoryId: true,
      },
    });

    if (skills.length !== uniqueSkillIds.length) {
      throw new BadRequestException(
        'One or more selected skills are invalid or inactive',
      );
    }

    const invalidSkill = skills.find(
      (skill) =>
        !selectedCategoryIds.includes(skill.categoryId),
    );

    if (invalidSkill) {
      throw new BadRequestException(
        'One or more selected skills do not belong to the worker categories',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workerSkill.deleteMany({
        where: {
          workerId: worker.id,
        },
      });

      await tx.workerSkill.createMany({
        data: uniqueSkillIds.map((skillId) => ({
          workerId: worker.id,
          skillId,
        })),
      });
    });

    return {
      message: 'Worker skills updated successfully',
      skillIds: uniqueSkillIds,
    };
  }

  async updateLocation(
    userId: string,
    dto: UpdateWorkerLocationDto,
  ) {
    const worker = await this.prisma.worker.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker profile not found');
    }

    if (worker.status !== 'DRAFT' && worker.status !== "REJECTED") {
      throw new BadRequestException(
        'Worker location can only be edited while in DRAFT or REJECTED status',
      );
    }

    const location = await this.prisma.userLocation.upsert({
      where: {
        userId,
      },
      create: {
        userId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracyMeters: dto.accuracyMeters,
      },
      update: {
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracyMeters: dto.accuracyMeters,
      },
    });

    return {
      message: 'Worker location updated successfully',
      location,
    };
  }

  async submitForKyc(userId: string) {
    const worker = await this.prisma.worker.findUnique({
      where: {
        userId,
      },
      include: {
        categories: {
          select: {
            categoryId: true,
          },
        },
        skills: {
          select: {
            skillId: true,
          },
        },
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker profile not found');
    }

    if (worker.status !== 'DRAFT' && worker.status !== "REJECTED") {
      throw new BadRequestException(
        'Only a DRAFT or REJECTED worker profile can be submitted',
      );
    }

    const missingFields: string[] = [];

    if (!worker.profilePhotoKey) {
      missingFields.push('profilePhoto');
    }

    if (!worker.bio?.trim()) {
      missingFields.push('bio');
    }

    if (worker.experienceYears === null) {
      missingFields.push('experienceYears');
    }

    if (
      worker.expectedHourlyRate === null &&
      worker.expectedDailyRate === null
    ) {
      missingFields.push(
        'expectedHourlyRate or expectedDailyRate',
      );
    }

    if (worker.categories.length === 0) {
      missingFields.push('categories');
    }

    if (worker.skills.length === 0) {
      missingFields.push('skills');
    }

    const location = await this.prisma.userLocation.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!location) {
      missingFields.push('location');
    }

    if (missingFields.length > 0) {
      throw new BadRequestException({
        message: 'Worker profile is incomplete',
        missingFields,
      });
    }

    const updatedWorker = await this.prisma.worker.update({
      where: {
        userId,
      },
      data: {
        status: 'PENDING_KYC',
        kycSubmittedAt: new Date(),
        rejectedAt: null,
      },
    });

    return {
      message: 'Worker profile submitted for KYC successfully',
      worker: this.toSafeWorkerResponse(updatedWorker),
    };
  }

  async submitKycDocuments(userId: string) {
    const worker = await this.prisma.worker.findUnique({
      where: {userId},
      select: {
        id: true,
        status: true,
        aadhaarDocumentKey: true,
        policeVerificationDocumentKey: true,
      },
    });

    if (!worker) throw new NotFoundException('Worker profile not found');

    if (worker.status !== WorkerStatus.PENDING_KYC && worker.status !== WorkerStatus.REJECTED) {
      throw new BadRequestException(
        'Worker must be in KYC submission state before submitting documents',
      );
    }

    if (!worker.aadhaarDocumentKey || !worker.policeVerificationDocumentKey) {
      throw new BadRequestException({
        message: 'Required KYC documents are incomplete',
        missingDocuments: [
          ...(!worker.aadhaarDocumentKey ? ['aadhaar'] : []),
          ...(!worker.policeVerificationDocumentKey ? ['policeVerification'] : []),
        ],
      });
    }

    const updatedWorker = await this.prisma.worker.update({
      where: {id: worker.id},
      data: {
        status: WorkerStatus.KYC_SUBMITTED,
        kycSubmittedAt: new Date(),
        rejectedAt: null,
      },
    });

    return {
      message: 'KYC documents submitted successfully',
      worker: this.toSafeWorkerResponse(updatedWorker),
    };
  }

  async getPendingKyc() {
    const workers = await this.prisma.worker.findMany({
      where: {
        status: WorkerStatus.KYC_SUBMITTED,
      },
      select: {
        id: true,
        userId: true,
        status: true,
        bio: true,
        experienceYears: true,
        expectedHourlyRate: true,
        expectedDailyRate: true,
        kycSubmittedAt: true,
        aadhaarDocumentKey: true,
        policeVerificationDocumentKey: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: {kycSubmittedAt: 'asc'},
    });

    return {
      workers: workers.map(worker => ({
        id: worker.id,
        userId: worker.userId,
        status: worker.status,
        bio: worker.bio,
        experienceYears: worker.experienceYears,
        expectedHourlyRate: worker.expectedHourlyRate,
        expectedDailyRate: worker.expectedDailyRate,
        kycSubmittedAt: worker.kycSubmittedAt,
        hasAadhaarDocument: Boolean(worker.aadhaarDocumentKey),
        hasPoliceVerificationDocument: Boolean(worker.policeVerificationDocumentKey),
        user: worker.user,
      })),
    };
  }

  async reviewKyc(
    reviewerId: string,
    workerId: string,
    decision: KycReviewDecision,
    rejectionReason?: string,
  ) {
    const worker = await this.prisma.worker.findUnique({
      where: {id: workerId},
      select: {
        id: true,
        status: true,
        aadhaarDocumentKey: true,
        policeVerificationDocumentKey: true,
      },
    });

    if (!worker) throw new NotFoundException('Worker profile not found');

    if (worker.status !== WorkerStatus.KYC_SUBMITTED && worker.status !== WorkerStatus.UNDER_REVIEW) {
      throw new BadRequestException('Worker is not awaiting KYC review');
    }

    if (decision === KycReviewDecision.REJECTED && !rejectionReason?.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    const result = await this.prisma.$transaction(async tx => {
      await tx.workerKycReview.create({
        data: {
          workerId,
          reviewerId,
          decision,
          rejectionReason:
            decision === KycReviewDecision.REJECTED
              ? rejectionReason!.trim()
              : null,
          completedAt: new Date(),
        },
      });

      return tx.worker.update({
        where: {id: workerId},
        data:
          decision === KycReviewDecision.APPROVED
            ? {
                status: WorkerStatus.VERIFIED,
                verifiedAt: new Date(),
                rejectedAt: null,
              }
            : {
                status: WorkerStatus.REJECTED,
                rejectedAt: new Date(),
                verifiedAt: null,
                isAvailable: false,
              },
      });
    });

    return {
      message:
        decision === KycReviewDecision.APPROVED
          ? 'Worker KYC approved successfully'
          : 'Worker KYC rejected successfully',
      worker: this.toSafeWorkerResponse(result),
    };
  }

  private toSafeWorkerResponse(worker: {
    id: string;
    userId: string;
    status: WorkerStatus;
    profilePhotoKey?: string | null;
    aadhaarDocumentKey?: string | null;
    policeVerificationDocumentKey?: string | null;
    bio?: string | null;
    experienceYears?: number | null;
    expectedHourlyRate?: unknown;
    expectedDailyRate?: unknown;
    isAvailable?: boolean;
    kycSubmittedAt?: Date | null;
    verifiedAt?: Date | null;
    rejectedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    return {
      id: worker.id,
      userId: worker.userId,
      status: worker.status,
      profilePhotoAvailable: Boolean(worker.profilePhotoKey),
      bio: worker.bio,
      experienceYears: worker.experienceYears,
      expectedHourlyRate: worker.expectedHourlyRate,
      expectedDailyRate: worker.expectedDailyRate,
      isAvailable: worker.isAvailable,
      kycSubmittedAt: worker.kycSubmittedAt,
      verifiedAt: worker.verifiedAt,
      rejectedAt: worker.rejectedAt,
      createdAt: worker.createdAt,
      updatedAt: worker.updatedAt,
    };
  }

async uploadAadhaarDocument(
  userId: string,
  file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  },
) {
  const worker = await this.prisma.worker.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
      status: true,
      aadhaarDocumentKey: true,
    },
  });

  if (!worker) {
    throw new NotFoundException('Worker profile not found');
  }

  if (
    worker.status !== 'PENDING_KYC' &&
    worker.status !== 'REJECTED'
  ) {
    throw new BadRequestException(
      'Aadhaar can only be uploaded during KYC',
    );
  }

  const result =
    await this.storageService.uploadKycDocument(
      file.buffer,
      file.mimetype,
      `kyc/${worker.id}/aadhaar`,
      file.originalname,
    );

  await this.prisma.worker.update({
    where: {
      userId,
    },
    data: {
      aadhaarDocumentKey: result.key,
    },
  });

  return {
    message: 'Aadhaar document uploaded successfully',
  };
}

async uploadPoliceVerificationDocument(
  userId: string,
  file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  },
) {
  const worker = await this.prisma.worker.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!worker) {
    throw new NotFoundException('Worker profile not found');
  }

  if (
    worker.status !== 'PENDING_KYC' &&
    worker.status !== 'REJECTED'
  ) {
    throw new BadRequestException(
      'Police verification can only be uploaded during KYC',
    );
  }

  const result =
    await this.storageService.uploadPrivateObject(
      file.buffer,
      file.mimetype,
      `kyc/${worker.id}/police-verification`,
      file.originalname,
    );

  await this.prisma.worker.update({
    where: {
      userId,
    },
    data: {
      policeVerificationDocumentKey: result.key,
    },
  });

  return {
    message:
      'Police verification document uploaded successfully',
    documentKey: result.key,
  };
}

async uploadProfilePhoto(
  userId: string,
  file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  },
) {
  const worker = await this.prisma.worker.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!worker) {
    throw new NotFoundException('Worker profile not found');
  }

  if (
    worker.status !== 'DRAFT' &&
    worker.status !== 'REJECTED' &&
    worker.status !== 'VERIFIED'
  ) {
    throw new BadRequestException(
      'Profile photo can only be uploaded while completing or editing the worker profile',
    );
  }

  const result =
    await this.storageService.uploadProfileImage(
      file.buffer,
      file.mimetype,
      `workers/${worker.id}/profile`,
      file.originalname,
    );

  await this.prisma.worker.update({
    where: {
      userId,
    },
    data: {
      profilePhotoKey: result.key,
    },
  });

  return {
    message: 'Profile photo uploaded successfully',
    profilePhotoAvailable: true,
  };
}

  async getKycDocument(workerId: string, documentType: 'aadhaar' | 'policeVerification') {
    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId },
      select: {
        aadhaarDocumentKey: true,
        policeVerificationDocumentKey: true,
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker profile not found');
    }

    const key = documentType === 'aadhaar'
      ? worker.aadhaarDocumentKey
      : worker.policeVerificationDocumentKey;

    if (!key) {
      throw new NotFoundException('KYC document not found');
    }

    const expectedFolder = documentType === 'aadhaar'
      ? `kyc/${workerId}/aadhaar`
      : `kyc/${workerId}/police-verification`;

    if (!key.includes(expectedFolder)) {
      throw new BadRequestException('KYC document storage scope is invalid');
    }

    return this.storageService.downloadPrivateObject(key);
  }

}