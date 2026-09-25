import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  Prisma,
  RequirementAssignmentStatus,
  RequirementStatus,
  WorkerStatus,
} from '@prisma/client';

import {PrismaService} from '../common/prisma/prisma.service';
import {CreateRequirementDto} from './dto/create-requirement.dto';
import {RealtimeGateway} from '../realtime/realtime.gateway';
import {REALTIME_EVENTS} from '../realtime/realtime.types';
import {RequirementActionDto} from './dto/requirement-action.dto';
import {
  ClientRequirementResponseDto,
  WorkerRequirementResponseDto,
} from './dto/requirement-response.dto';

const MATCH_RADIUS_KM = 25;
const MAX_WORKER_OFFERS = 20;

const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.ACCEPTED,
  BookingStatus.CONFIRMED,
  BookingStatus.WORKER_EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.CHECKED_IN,
  BookingStatus.IN_PROGRESS,
] as const;

@Injectable()
export class RequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async create(userId: string, dto: CreateRequirementDto) {
    const client = await this.prisma.client.findUnique({
      where: {userId},
      select: {id: true},
    });

    if (!client) {
      throw new BadRequestException(
        'Complete your client profile before creating a requirement',
      );
    }

    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);

    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      start >= end
    ) {
      throw new BadRequestException(
        'Invalid scheduled time range',
      );
    }

    if (start <= new Date()) {
      throw new BadRequestException(
        'Requirement must be scheduled for a future time',
      );
    }

    if (
      (dto.latitude !== undefined &&
        dto.longitude === undefined) ||
      (dto.latitude === undefined &&
        dto.longitude !== undefined)
    ) {
      throw new BadRequestException(
        'Latitude and longitude must be provided together',
      );
    }

    if (!dto.title.trim() || !dto.address.trim()) {
      throw new BadRequestException(
        'Requirement title and work address are required',
      );
    }

    const category = await this.prisma.category.findFirst({
      where: {
        id: dto.categoryId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!category) {
      throw new BadRequestException(
        'Category not found or inactive',
      );
    }

    let skill:
      | {id: string; name: string}
      | null = null;

    if (dto.skillId) {
      skill = await this.prisma.skill.findFirst({
        where: {
          id: dto.skillId,
          categoryId: dto.categoryId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!skill) {
        throw new BadRequestException(
          'Skill not found or not associated with the category',
        );
      }
    }

    const requirement =
      await this.prisma.requirement.create({
        data: {
          clientId: client.id,
          categoryId: category.id,
          categoryName: category.name,
          skillId: skill?.id,
          skillName: skill?.name,
          title: dto.title.trim(),
          description: dto.description?.trim(),
          budget: dto.budget,
          scheduledStart: start,
          scheduledEnd: end,
          address: dto.address.trim(),
          latitude: dto.latitude,
          longitude: dto.longitude,
          status: RequirementStatus.MATCHING,
        },
      });

    const matching = await this.matchWorkers(
      requirement.id,
    );

    for (const offer of matching.offers) {
      this.realtime.notifyUser(
        offer.workerUserId,
        REALTIME_EVENTS.REQUIREMENT_OFFERED,
        {
          requirementId: requirement.id,
          title: requirement.title,
          categoryId: requirement.categoryId,
          categoryName: requirement.categoryName,
          skillId: requirement.skillId,
          skillName: requirement.skillName,
          budget: requirement.budget,
          scheduledStart: requirement.scheduledStart,
          scheduledEnd: requirement.scheduledEnd,
          address: requirement.address,
          latitude: requirement.latitude,
          longitude: requirement.longitude,
          assignmentId: offer.assignmentId,
          distanceKm: offer.distanceKm,
          matchScore: offer.matchScore,
        },
      );
    }

    return {
      requirement: await this.getClientRequirement(
        client.id,
        requirement.id,
      ),
      matching: {
        status: matching.status,
        offersCreated: matching.offers.length,
      },
    };
  }

  async listMine(
    userId: string,
    role: 'CLIENT' | 'WORKER',
  ) {
    if (role === 'CLIENT') {
      const client =
        await this.prisma.client.findUnique({
          where: {userId},
          select: {id: true},
        });

      if (!client) {
        throw new NotFoundException(
          'Client profile not found',
        );
      }

      const requirements = await this.prisma.requirement.findMany({
        where: {
          clientId: client.id,
        },
        include: {
          assignments: {
            select: {
              id: true,
              workerId: true,
              status: true,
              matchScore: true,
              distanceKm: true,
              createdAt: true,
            },
          },
          booking: {
            select: {
              id: true,
              status: true,
              worker: {
                select: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                  profilePhotoKey: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return requirements.map(requirement =>
        this.toClientRequirementResponse(requirement),
      );
    }

    const worker =
      await this.prisma.worker.findUnique({
        where: {userId},
        select: {id: true},
      });

    if (!worker) {
      throw new NotFoundException(
        'Worker profile not found',
      );
    }

    const requirements = await this.prisma.requirement.findMany({
      where: {
        assignments: {
          some: {
            workerId: worker.id,
          },
        },
      },
      include: {
        assignments: {
          where: {
            workerId: worker.id,
          },
          select: {
            id: true,
            workerId: true,
            status: true,
            matchScore: true,
            distanceKm: true,
            respondedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requirements.map(requirement =>
      this.toWorkerRequirementResponse(
        requirement,
        worker.id,
      ),
    );
  }

  async getOne(
    userId: string,
    role: 'CLIENT' | 'WORKER',
    requirementId: string,
  ) {
    const requirement =
      await this.prisma.requirement.findUnique({
        where: {id: requirementId},
        include: {
          assignments: {
            select: {
              id: true,
              workerId: true,
              status: true,
              matchScore: true,
              distanceKm: true,
              createdAt: true,
              respondedAt: true,
            },
          },
          booking: {
            select: {
              id: true,
              status: true,
              worker: {
                select: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                  profilePhotoKey: true,
                },
              },
            },
          },
        },
      });

    if (!requirement) {
      throw new NotFoundException(
        'Requirement not found',
      );
    }

    if (role === 'CLIENT') {
      const client =
        await this.prisma.client.findUnique({
          where: {userId},
          select: {id: true},
        });

      if (
        !client ||
        client.id !== requirement.clientId
      ) {
        throw new ForbiddenException(
          'You do not have access to this requirement',
        );
      }

      return this.toClientRequirementResponse(requirement);
    }

    const worker =
      await this.prisma.worker.findUnique({
        where: {userId},
        select: {id: true},
      });

    if (
      !worker ||
      !requirement.assignments.some(
        assignment =>
          assignment.workerId === worker.id,
      )
    ) {
      throw new ForbiddenException(
        'You do not have access to this requirement',
      );
    }

    return this.toWorkerRequirementResponse(
      requirement,
      worker.id,
    );
  }

  async accept(
    userId: string,
    requirementId: string,
  ) {
    const worker =
      await this.prisma.worker.findUnique({
        where: {userId},
        include: {
          user: {
            select: {
              status: true,
            },
          },
        },
      });

    if (!worker) {
      throw new ForbiddenException(
        'Worker profile not found',
      );
    }

    if (
      worker.status !== WorkerStatus.VERIFIED ||
      !worker.isAvailable ||
      worker.user.status !== 'ACTIVE'
    ) {
      throw new BadRequestException(
        'Worker is not currently eligible to accept work',
      );
    }

    let result: {
      booking: any;
    } | null = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        result = await this.prisma.$transaction(
          async tx => {
        const assignment =
          await tx.requirementAssignment.findUnique({
            where: {
              requirementId_workerId: {
                requirementId,
                workerId: worker.id,
              },
            },
            include: {
              requirement: true,
            },
          });

        if (!assignment) {
          throw new NotFoundException(
            'Requirement is not available to you',
          );
        }

        if (
          assignment.status !==
          RequirementAssignmentStatus.OFFERED
        ) {
          throw new BadRequestException(
            'This requirement offer is no longer pending',
          );
        }

        if (
          assignment.requirement.status !==
            RequirementStatus.MATCHING &&
          assignment.requirement.status !==
            RequirementStatus.OPEN
        ) {
          throw new BadRequestException(
            'Requirement is no longer available',
          );
        }

        const existingBooking =
          await tx.booking.findUnique({
            where: {
              requirementId,
            },
            select: {id: true},
          });

        if (existingBooking) {
          throw new BadRequestException(
            'This requirement has already been matched',
          );
        }

        const conflictingBooking =
          await tx.booking.findFirst({
            where: {
              workerId: worker.id,
              status: {
                in: ACTIVE_BOOKING_STATUSES as any,
              },
              scheduledStart: {
                lt: assignment.requirement.scheduledEnd,
              },
              scheduledEnd: {
                gt: assignment.requirement.scheduledStart,
              },
            },
            select: {id: true},
          });

        if (conflictingBooking) {
          throw new BadRequestException(
            'You already have another booking during this time',
          );
        }

        const booking =
          await tx.booking.create({
            data: {
              clientId:
                assignment.requirement.clientId,
              workerId: worker.id,
              requirementId,
              status: BookingStatus.ACCEPTED,
              categoryId:
                assignment.requirement.categoryId,
              categoryName:
                assignment.requirement.categoryName,
              skillId:
                assignment.requirement.skillId,
              skillName:
                assignment.requirement.skillName,
              serviceTitle:
                assignment.requirement.title,
              serviceDescription:
                assignment.requirement.description,
              hourlyRate:
                worker.expectedHourlyRate,
              dailyRate:
                worker.expectedDailyRate,
              scheduledStart:
                assignment.requirement.scheduledStart,
              scheduledEnd:
                assignment.requirement.scheduledEnd,
              address:
                assignment.requirement.address,
              latitude:
                assignment.requirement.latitude,
              longitude:
                assignment.requirement.longitude,
            },
          });

        await tx.attendance.create({
          data: {
            bookingId: booking.id,
            workerId: worker.id,
            status: 'NOT_STARTED',
          },
        });

        await tx.requirementAssignment.update({
          where: {id: assignment.id},
          data: {
            status:
              RequirementAssignmentStatus.ACCEPTED,
            respondedAt: new Date(),
          },
        });

        await tx.requirementAssignment.updateMany({
          where: {
            requirementId,
            id: {not: assignment.id},
            status:
              RequirementAssignmentStatus.OFFERED,
          },
          data: {
            status:
              RequirementAssignmentStatus.EXPIRED,
            respondedAt: new Date(),
          },
        });

        await tx.requirement.update({
          where: {id: requirementId},
          data: {
            status: RequirementStatus.MATCHED,
          },
        });

        return {
          booking,
        };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5000,
            timeout: 10000,
          },
        );
        break;
      } catch (error: unknown) {
        const code =
          error instanceof Prisma.PrismaClientKnownRequestError
            ? error.code
            : null;
        if (code === 'P2034' && attempt < 3) continue;
        if (code === 'P2002') {
          throw new BadRequestException('This requirement has already been matched');
        }
        throw error;
      }
    }

    if (!result) {
      throw new BadRequestException(
        'Unable to accept the requirement due to a concurrent update. Please try again.',
      );
    }

    const client = await this.prisma.client.findUnique({
      where: {
        id: result.booking.clientId,
      },
      select: {
        userId: true,
      },
    });

    if (client) {
      this.realtime.notifyUser(
        client.userId,
        REALTIME_EVENTS.REQUIREMENT_ACCEPTED,
        {
          requirementId,
          bookingId: result.booking.id,
          workerId: result.booking.workerId,
          status: result.booking.status,
        },
      );
    }

    return result;
  }

  async reject(
    userId: string,
    requirementId: string,
    dto: RequirementActionDto,
  ) {
    const worker =
      await this.prisma.worker.findUnique({
        where: {userId},
        select: {id: true},
      });

    if (!worker) {
      throw new ForbiddenException(
        'Worker profile not found',
      );
    }

    const assignment =
      await this.prisma.requirementAssignment.findUnique({
        where: {
          requirementId_workerId: {
            requirementId,
            workerId: worker.id,
          },
        },
        include: {
          requirement: {
            select: {id: true, status: true},
          },
        },
      });

    if (!assignment) {
      throw new NotFoundException(
        'Requirement is not available to you',
      );
    }

    if (
      assignment.status !==
      RequirementAssignmentStatus.OFFERED
    ) {
      throw new BadRequestException(
        'This requirement offer is no longer pending',
      );
    }

    const updated = await this.prisma.requirementAssignment.updateMany({
      where: {
        id: assignment.id,
        status: RequirementAssignmentStatus.OFFERED,
      },
      data: {
        status: RequirementAssignmentStatus.REJECTED,
        respondedAt: new Date(),
        responseReason: dto.reason?.trim(),
      },
    });

    if (updated.count !== 1) {
      throw new BadRequestException('This requirement offer is no longer pending');
    }

    const remainingOffers = await this.prisma.requirementAssignment.count({
      where: {
        requirementId,
        status: RequirementAssignmentStatus.OFFERED,
      },
    });

    let matching = null;
    if (
      remainingOffers === 0 &&
      (assignment.requirement.status === RequirementStatus.MATCHING ||
        assignment.requirement.status === RequirementStatus.OPEN)
    ) {
      matching = await this.matchWorkers(requirementId);
      for (const offer of matching.offers) {
        this.realtime.notifyUser(
          offer.workerUserId,
          REALTIME_EVENTS.REQUIREMENT_OFFERED,
          {
            requirementId,
            assignmentId: offer.assignmentId,
            distanceKm: offer.distanceKm,
            matchScore: offer.matchScore,
          },
        );
      }
    }

    return {
      assignment: {
        id: assignment.id,
        status: RequirementAssignmentStatus.REJECTED,
        respondedAt: new Date(),
        responseReason: dto.reason?.trim() || null,
      },
      matching: matching
        ? {
            status: matching.status,
            offersCreated: matching.offers.length,
          }
        : null,
    };
  }

  async cancel(
    userId: string,
    requirementId: string,
    dto: RequirementActionDto,
  ) {
    const client =
      await this.prisma.client.findUnique({
        where: {userId},
        select: {id: true},
      });

    if (!client) {
      throw new ForbiddenException(
        'Client profile not found',
      );
    }

    const requirement =
      await this.prisma.requirement.findUnique({
        where: {id: requirementId},
      });

    if (
      !requirement ||
      requirement.clientId !== client.id
    ) {
      throw new NotFoundException(
        'Requirement not found',
      );
    }

    const nonCancellableStatuses: RequirementStatus[] = [
      RequirementStatus.MATCHED,
      RequirementStatus.COMPLETED,
      RequirementStatus.CANCELLED,
    ];

    if (nonCancellableStatuses.includes(requirement.status)) {
      throw new BadRequestException(
        'Requirement cannot be cancelled in its current state',
      );
    }

    await this.prisma.$transaction([
      this.prisma.requirement.update({
        where: {id: requirementId},
        data: {
          status:
            RequirementStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason:
            dto.reason?.trim(),
        },
      }),
      this.prisma.requirementAssignment.updateMany({
        where: {
          requirementId,
          status:
            RequirementAssignmentStatus.OFFERED,
        },
        data: {
          status:
            RequirementAssignmentStatus.CANCELLED,
          respondedAt: new Date(),
          responseReason:
            dto.reason?.trim(),
        },
      }),
    ]);

    return this.getClientRequirement(
      client.id,
      requirementId,
    );
  }

  private async matchWorkers(
    requirementId: string,
  ) {
    const requirement =
      await this.prisma.requirement.findUnique({
        where: {id: requirementId},
      });

    if (!requirement) {
      throw new NotFoundException(
        'Requirement not found',
      );
    }

    if (
      requirement.status !== RequirementStatus.MATCHING &&
      requirement.status !== RequirementStatus.OPEN
    ) {
      throw new BadRequestException('Requirement is not eligible for matching');
    }

    if (requirement.status === RequirementStatus.OPEN) {
      await this.prisma.requirement.update({
        where: {id: requirementId},
        data: {status: RequirementStatus.MATCHING},
      });
    }

    const existingAssignments =
      await this.prisma.requirementAssignment.findMany({
        where: {requirementId},
        select: {workerId: true, status: true},
      });

    const excludedWorkerIds = new Set(
      existingAssignments
        .filter(assignment =>
          (
            [
              RequirementAssignmentStatus.ACCEPTED,
              RequirementAssignmentStatus.REJECTED,
              RequirementAssignmentStatus.EXPIRED,
              RequirementAssignmentStatus.CANCELLED,
            ] as RequirementAssignmentStatus[]
          ).includes(assignment.status),
        )
        .map(assignment => assignment.workerId),
    );

    const workers =
      await this.prisma.worker.findMany({
        where: {
          id: {notIn: [...excludedWorkerIds]},
          status: WorkerStatus.VERIFIED,
          isAvailable: true,
          user: {
            status: 'ACTIVE',
          },
          categories: {
            some: {
              categoryId:
                requirement.categoryId,
            },
          },
          ...(requirement.skillId
            ? {
                skills: {
                  some: {
                    skillId:
                      requirement.skillId,
                  },
                },
              }
            : {}),
        },
        select: {
          id: true,
          experienceYears: true,
          user: {
            select: {
              location: {
                select: {
                  latitude: true,
                  longitude: true,
                },
              },
            },
          },
        },
        orderBy: {createdAt: 'asc'},
        take: 500,
      });

    const workerIds =
      workers.map(worker => worker.id);

    const conflicts =
      workerIds.length > 0
        ? await this.prisma.booking.findMany({
            where: {
              workerId: {
                in: workerIds,
              },
              status: {
                in: ACTIVE_BOOKING_STATUSES as any,
              },
              scheduledStart: {
                lt: requirement.scheduledEnd,
              },
              scheduledEnd: {
                gt: requirement.scheduledStart,
              },
            },
            select: {
              workerId: true,
            },
          })
        : [];

    const conflictedWorkerIds =
      new Set(
        conflicts
          .map(item => item.workerId)
          .filter(
            (id): id is string =>
              Boolean(id),
          ),
      );

    const candidates = workers
      .filter(
        worker =>
          !conflictedWorkerIds.has(
            worker.id,
          ),
      )
      .map(worker => {
        let distanceKm:
          | number
          | null = null;

        if (
          requirement.latitude !== null &&
          requirement.longitude !== null
        ) {
          const location =
            worker.user.location;

          if (!location) {
            return null;
          }

          distanceKm =
            this.distanceInKm(
              Number(
                requirement.latitude,
              ),
              Number(
                requirement.longitude,
              ),
              Number(
                location.latitude,
              ),
              Number(
                location.longitude,
              ),
            );

          if (
            distanceKm >
            MATCH_RADIUS_KM
          ) {
            return null;
          }
        }

        const experienceScore =
          Math.min(
            worker.experienceYears ?? 0,
            10,
          ) * 5;

        const distanceScore =
          distanceKm === null
            ? 20
            : Math.max(
                0,
                30 - distanceKm,
              );

        const skillScore =
          requirement.skillId ? 25 : 15;

        const score = Number(
          (
            experienceScore +
            distanceScore +
            skillScore
          ).toFixed(2),
        );

        return {
          workerId: worker.id,
          distanceKm,
          score,
        };
      })
      .filter(
        (
          candidate,
        ): candidate is {
          workerId: string;
          distanceKm: number | null;
          score: number;
        } => Boolean(candidate),
      )
      .sort(
        (a, b) =>
          b.score - a.score,
      )
      .slice(0, MAX_WORKER_OFFERS);

    if (!candidates.length) {
      await this.prisma.requirement.update({
        where: {id: requirementId},
        data: {
          status:
            RequirementStatus.OPEN,
        },
      });

      return {
        matchedWorkers: 0,
        offers: [],
        status: RequirementStatus.OPEN,
      };
    }

    const assignments =
      await this.prisma.$transaction(
        candidates.map(
          candidate =>
            this.prisma.requirementAssignment.create({
              data: {
                requirementId,
                workerId:
                  candidate.workerId,
                status:
                  RequirementAssignmentStatus.OFFERED,
                matchScore:
                  candidate.score,
                distanceKm:
                  candidate.distanceKm,
              },
              select: {
                id: true,
                workerId: true,
                matchScore: true,
                distanceKm: true,
                worker: {
                  select: {
                    userId: true,
                  },
                },
              },
            }),
        ),
      );

    return {
      matchedWorkers:
        assignments.length,
      offers: assignments.map(
        assignment => ({
          assignmentId:
            assignment.id,
          workerUserId:
            assignment.worker.userId,
          matchScore:
            Number(
              assignment.matchScore ??
                0,
            ),
          distanceKm:
            assignment.distanceKm === null
              ? null
              : Number(
                  assignment.distanceKm,
                ),
        }),
      ),
      status: RequirementStatus.MATCHING,
    };
  }

  private async getClientRequirement(
    clientId: string,
    requirementId: string,
  ) {
    const requirement =
      await this.prisma.requirement.findFirst({
        where: {
          id: requirementId,
          clientId,
        },
        include: {
          assignments: {
            select: {
              id: true,
              workerId: true,
              status: true,
              matchScore: true,
              distanceKm: true,
              createdAt: true,
            },
          },
          booking: {
            select: {
              id: true,
              status: true,
              worker: {
                select: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                  profilePhotoKey: true,
                },
              },
            },
          },
        },
      });

    return requirement
      ? this.toClientRequirementResponse(requirement)
      : null;
  }

  private toClientRequirementResponse(
    requirement: {
      id: string;
      categoryId: string;
      categoryName: string;
      skillId: string | null;
      skillName: string | null;
      title: string;
      description: string | null;
      budget: unknown;
      scheduledStart: Date;
      scheduledEnd: Date;
      address: string;
      latitude: unknown;
      longitude: unknown;
      status: string;
      cancelledAt: Date | null;
      cancellationReason: string | null;
      completedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      booking: {
        id: string;
        status: string;
        worker: {
          user: {
            firstName: string;
            lastName: string;
          };
          profilePhotoKey: string | null;
        };
      } | null;
    },
  ): ClientRequirementResponseDto {
    return {
      id: requirement.id,
      categoryId: requirement.categoryId,
      categoryName: requirement.categoryName,
      skillId: requirement.skillId,
      skillName: requirement.skillName,
      title: requirement.title,
      description: requirement.description,
      budget:
        requirement.budget === null
          ? null
          : String(requirement.budget),
      scheduledStart: requirement.scheduledStart,
      scheduledEnd: requirement.scheduledEnd,
      address: requirement.address,
      latitude:
        requirement.latitude === null
          ? null
          : String(requirement.latitude),
      longitude:
        requirement.longitude === null
          ? null
          : String(requirement.longitude),
      status: requirement.status,
      cancelledAt: requirement.cancelledAt,
      cancellationReason: requirement.cancellationReason,
      completedAt: requirement.completedAt,
      createdAt: requirement.createdAt,
      updatedAt: requirement.updatedAt,
      booking: requirement.booking
        ? {
            id: requirement.booking.id,
            status: requirement.booking.status,
            worker: {
              firstName:
                requirement.booking.worker.user.firstName,
              lastName:
                requirement.booking.worker.user.lastName,
              hasProfilePhoto:
                Boolean(requirement.booking.worker.profilePhotoKey),
            },
          }
        : null,
    };
  }

  private toWorkerRequirementResponse(
    requirement: {
      id: string;
      categoryId: string;
      categoryName: string;
      skillId: string | null;
      skillName: string | null;
      title: string;
      description: string | null;
      budget: unknown;
      scheduledStart: Date;
      scheduledEnd: Date;
      address: string;
      latitude: unknown;
      longitude: unknown;
      status: string;
      cancelledAt: Date | null;
      cancellationReason: string | null;
      completedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      assignments: Array<{
        id: string;
        workerId: string;
        status: string;
        matchScore: unknown;
        distanceKm: unknown;
        respondedAt?: Date | null;
      }>;
    },
    workerId: string,
  ): WorkerRequirementResponseDto {
    const assignment =
      requirement.assignments.find(
        item => item.workerId === workerId,
      );

    return {
      id: requirement.id,
      categoryId: requirement.categoryId,
      categoryName: requirement.categoryName,
      skillId: requirement.skillId,
      skillName: requirement.skillName,
      title: requirement.title,
      description: requirement.description,
      budget:
        requirement.budget === null
          ? null
          : String(requirement.budget),
      scheduledStart: requirement.scheduledStart,
      scheduledEnd: requirement.scheduledEnd,
      address: requirement.address,
      latitude:
        requirement.latitude === null
          ? null
          : String(requirement.latitude),
      longitude:
        requirement.longitude === null
          ? null
          : String(requirement.longitude),
      status: requirement.status,
      cancelledAt: requirement.cancelledAt,
      cancellationReason: requirement.cancellationReason,
      completedAt: requirement.completedAt,
      createdAt: requirement.createdAt,
      updatedAt: requirement.updatedAt,
      assignment: assignment
        ? {
            id: assignment.id,
            status: assignment.status,
            matchScore:
              assignment.matchScore === null
                ? null
                : String(assignment.matchScore),
            distanceKm:
              assignment.distanceKm === null
                ? null
                : String(assignment.distanceKm),
            respondedAt:
              assignment.respondedAt ?? null,
          }
        : null,
    };
  }

  private distanceInKm(
    latitude1: number,
    longitude1: number,
    latitude2: number,
    longitude2: number,
  ) {
    const earthRadiusKm = 6371;
    const dLat = this.toRadians(
      latitude2 - latitude1,
    );
    const dLon = this.toRadians(
      longitude2 - longitude1,
    );

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(
        this.toRadians(latitude1),
      ) *
        Math.cos(
          this.toRadians(latitude2),
        ) *
        Math.sin(dLon / 2) ** 2;

    return (
      2 *
      earthRadiusKm *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a),
      )
    );
  }

  private toRadians(value: number) {
    return (
      (value * Math.PI) / 180
    );
  }
}
