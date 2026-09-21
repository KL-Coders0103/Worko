import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../common/prisma/prisma.service';

import {
  CreateWorkerProfileDto,
  UpdateWorkerCategoriesDto,
  UpdateWorkerKycDocumentsDto,
  UpdateWorkerLocationDto,
  UpdateWorkerProfileDto,
  UpdateWorkerSkillsDto,
} from './dto/worker.dto';
import { StorageService } from '../storage/storage.service';
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
      worker,
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
        profilePhotoKey: dto.profilePhotoKey,
      },
    });

    return {
      message: 'Worker profile created successfully',
      worker,
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
        profilePhotoKey: dto.profilePhotoKey,
      },
    });

    return {
      message: 'Worker profile updated successfully',
      worker: updatedWorker,
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
      worker: updatedWorker,
    };
  }

  async submitKycDocuments(
  userId: string,
  dto: UpdateWorkerKycDocumentsDto,
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

  if (worker.status !== 'PENDING_KYC') {
    throw new BadRequestException(
      'Worker must complete profile submission before submitting KYC documents',
    );
  }

  const updatedWorker = await this.prisma.worker.update({
    where: {
      userId,
    },
    data: {
      aadhaarDocumentKey: dto.aadhaarDocumentKey,
      policeVerificationDocumentKey:
        dto.policeVerificationDocumentKey,
      status: 'KYC_SUBMITTED',
      kycSubmittedAt: new Date(),
    },
  });

  return {
    message: 'KYC documents submitted successfully',
    worker: updatedWorker,
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
    await this.storageService.uploadPrivateObject(
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
    documentKey: result.key,
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
    await this.storageService.uploadPrivateObject(
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
    profilePhotoKey: result.key,
  };
}
}