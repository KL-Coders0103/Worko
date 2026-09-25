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
      throw new BadRequestException('Invalid scheduled time range');
    }

    if (start <= new Date()) {
      throw new BadRequestException(
        'Requirement must be scheduled for a future time',
      );
    }

    if (
      (dto.latitude !== undefined && dto.longitude === undefined) ||
      (dto.latitude === undefined && dto.longitude !== undefined)
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

    let skill: {id: string; name: string} | null = null;

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

    const requirement = await this.prisma.requirement.create({
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

    const matching = await this.matchWorkers(requirement.id);

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

  async listMine(userId: string, role: 'CLIENT' | 'WORKER') {
    if (role === 'CLIENT') {
      const client = await this.prisma.client.findUnique({
        where: {userId},
        select: {id: true},
      });

      if (!client) {
        throw new NotFoundException('Client profile not found');
      }

      const requirements = await this.prisma.requirement.findMany({
        where: {clientId: client.id},
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
        orderBy: {createdAt: 'desc'},
      });

      return requirements.map(requirement =>
        this.toClientRequirementResponse(requirement),
      );
    }

    const worker = await this.prisma.worker.findUnique({
      where: {userId},
      select: {id: true},
    });

    if (!worker) {
      throw new NotFoundException('Worker profile not found');
    }

    const requirements = await this.prisma.requirement.findMany({
      where: {
        assignments: {
          some: {workerId: worker.id},
        },
      },
      include: {
        assignments: {
          where: {workerId: worker.id},
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
      orderBy: {createdAt: 'desc'},
    });

    return requirements.map(requirement =>
      this.toWorkerRequirementResponse(requirement, worker.id),
    );
  }

  async getOne(
    userId: string,
    role: 'CLIENT' | 'WORKER',
    requirementId: string,
  ) {
    const requirement = await this.prisma.requirement.findUnique({
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
      throw new NotFoundException('Requirement not found');
    }

    if (role === 'CLIENT') {
      const client = await this.prisma.client.findUnique({
        where: {userId},
        select: {id: true},
      });

      if (!client || client.id !== requirement.clientId) {
        throw new ForbiddenException(
          'You do not have access to this requirement',
        );
      }

      return this.toClientRequirementResponse(requirement);
    }

    const worker = await this.prisma.worker.findUnique({
      where: {userId},
      select: {id: true},
    });

    if (
      !worker ||
      !requirement.assignments.some(
        assignment => assignment.workerId === worker.id,
      )
    ) {
      throw new ForbiddenException(
        'You do not have access to this requirement',
      );
    }

    return this.toWorkerRequirementResponse(requirement, worker.id);
  }

  async accept(userId: string, requirementId: string) {
    const worker = await this.prisma.worker.findUnique({
      where: {userId},
      include: {
        user: {
          select: {status: true},
        },
      },
    });

    if (!worker) {
      throw new ForbiddenException('Worker profile not found');
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

    let result: {booking: any} | null = null;

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
                include: {requirement: true},
              });

            if (!assignment) {
              throw new NotFoundException(
                'Requirement is not available to you',
              );
            }

            if (assignment.status !== RequirementAssignmentStatus.OFFERED) {
              throw new BadRequestException(
                'This requirement offer is no longer pending',
              );
            }

            if (
              assignment.requirement.status !== RequirementStatus.MATCHING &&
              assignment.requirement.status !== RequirementStatus.OPEN
            ) {
              throw new BadRequestException(
                'Requirement is no longer available',
              );
            }

            const existingBooking = await tx.booking.findUnique({
              where: {requirementId},
              select: {id: true},
            });

            if (existingBooking) {
              throw new BadRequestException(
                'This requirement has already been matched',
              );
            }

            const conflictingBooking = await tx.booking.findFirst({
              where: {
                workerId: worker.id,
                status: {in: ACTIVE_BOOKING_STATUSES as any},
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

            const booking = await tx.booking.create({
              data: {
                clientId: assignment.requirement.clientId,
                workerId: worker.id,
                requirementId,
                status: BookingStatus.ACCEPTED,
                categoryId: assignment.requirement.categoryId,
                categoryName: assignment.requirement.categoryName,
                skillId: assignment.requirement.skillId,
                skillName: assignment.requirement.skillName,
                serviceTitle: assignment.requirement.title,
                serviceDescription: assignment.requirement.description,
                hourlyRate: worker.expectedHourlyRate,
                dailyRate: worker.expectedDailyRate,
                scheduledStart: assignment.requirement.scheduledStart,
                scheduledEnd: assignment.requirement.scheduledEnd,
                address: assignment.requirement.address,
                latitude: assignment.requirement.latitude,
                longitude: assignment.requirement.longitude,
              },
            });

            await tx.attendance.create({
              data: {
                bookingId: booking.id,
                workerId: worker.id,
                status: 'NOT_STARTED',
              },
            });

            const updatedAssignment =
              await tx.requirementAssignment.updateMany({
                where: {
                  id: assignment.id,
                  status: RequirementAssignmentStatus.OFFERED,
                },
                data: {
                  status: RequirementAssignmentStatus.ACCEPTED,
                  respondedAt: new Date(),
                },
              });

            if (updatedAssignment.count !== 1) {
              throw new BadRequestException(
                'This requirement offer is no longer pending',
              );
            }

            await tx.requirementAssignment.updateMany({
              where: {
                requirementId,
                id: {not: assignment.id},
                status: RequirementAssignmentStatus.OFFERED,
              },
              data: {
                status: RequirementAssignmentStatus.EXPIRED,
                respondedAt: new Date(),
              },
            });

            const updatedRequirement =
              await tx.requirement.updateMany({
                where: {
                  id: requirementId,
                  status: {
                    in: [
                      RequirementStatus.MATCHING,
                      RequirementStatus.OPEN,
                    ],
                  },
                },
                data: {
                  status: RequirementStatus.MATCHED,
                },
              });

            if (updatedRequirement.count !== 1) {
              throw new BadRequestException(
                'Requirement was matched by another worker',
              );
            }

            return {booking};
          },
          {
            isolationLevel:
              Prisma.TransactionIsolationLevel.Serializable,
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

        if (code === 'P2034' && attempt < 3) {
          continue;
        }

        if (code === 'P2002') {
          throw new BadRequestException(
            'This requirement has already been matched',
          );
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
      where: {id: result.booking.clientId},
      select: {userId: true},
    });

    if (client) {
      this.realtime.notifyUser(
        client.userId,
        REALTIME_EVENTS.REQUIREMENT_ACCEPTED,
        {
          requirementId,
          bookingId: result.booking.id,
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
    const worker = await this.prisma.worker.findUnique({
      where: {userId},
      select: {id: true},
    });

    if (!worker) {
      throw new ForbiddenException('Worker profile not found');
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

    if (assignment.status !== RequirementAssignmentStatus.OFFERED) {
      throw new BadRequestException(
        'This requirement offer is no longer pending',
      );
    }

    const respondedAt = new Date();
    const updated =
      await this.prisma.requirementAssignment.updateMany({
        where: {
          id: assignment.id,
          status: RequirementAssignmentStatus.OFFERED,
        },
        data: {
          status: RequirementAssignmentStatus.REJECTED,
          respondedAt,
          responseReason: dto.reason?.trim() || null,
        },
      });

    if (updated.count !== 1) {
      throw new BadRequestException(
        'This requirement offer is no longer pending',
      );
    }

    const remainingOffers =
      await this.prisma.requirementAssignment.count({
        where: {
          requirementId,
          status: RequirementAssignmentStatus.OFFERED,
        },
      });

    let matching:
      | Awaited<ReturnType<RequirementsService['matchWorkers']>>
      | null = null;

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
        respondedAt,
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
    const client = await this.prisma.client.findUnique({
      where: {userId},
      select: {id: true},
    });

    if (!client) {
      throw new ForbiddenException('Client profile not found');
    }

    const requirement = await this.prisma.requirement.findUnique({
      where: {id: requirementId},
    });

    if (!requirement || requirement.clientId !== client.id) {
      throw new NotFoundException('Requirement not found');
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

    const cancelledAt = new Date();

    const result = await this.prisma.$transaction(async tx => {
      const updated = await tx.requirement.updateMany({
        where: {
          id: requirementId,
          clientId: client.id,
          status: requirement.status,
        },
        data: {
          status: RequirementStatus.CANCELLED,
          cancelledAt,
          cancellationReason: dto.reason?.trim() || null,
        },
      });

      if (updated.count !== 1) {
        throw new BadRequestException(
          'Requirement state changed; refresh and try again',
        );
      }

      await tx.requirementAssignment.updateMany({
        where: {
          requirementId,
          status: {
            in: [
              RequirementAssignmentStatus.OFFERED,
              RequirementAssignmentStatus.ACCEPTED,
            ],
          },
        },
        data: {
          status: RequirementAssignmentStatus.CANCELLED,
          respondedAt: cancelledAt,
          responseReason: dto.reason?.trim() || null,
        },
      });

      return tx.requirement.findUniqueOrThrow({
        where: {id: requirementId},
      });
    });

    const workerUserIds =
      await this.prisma.worker.findMany({
        where: {
          requirementAssignments: {
            some: {
              requirementId,
              status: RequirementAssignmentStatus.CANCELLED,
            },
          },
        },
        select: {userId: true},
      });

    this.realtime.notifyWorkers(
      workerUserIds.map(worker => worker.userId),
      REALTIME_EVENTS.REQUIREMENT_CANCELLED,
      {requirementId},
    );

    return this.toClientRequirementResponse(result);
  }

  private async matchWorkers(requirementId: string) {
    const requirement =
      await this.prisma.requirement.findUnique({
        where: {id: requirementId},
        select: {
          id: true,
          clientId: true,
          categoryId: true,
          categoryName: true,
          skillId: true,
          skillName: true,
          title: true,
          description: true,
          budget: true,
          scheduledStart: true,
          scheduledEnd: true,
          address: true,
          latitude: true,
          longitude: true,
          status: true,
        },
      });

    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    const candidates = await this.prisma.worker.findMany({
      where: {
        status: WorkerStatus.VERIFIED,
        isAvailable: true,
        user: {status: 'ACTIVE'},
        categories: {
          some: {categoryId: requirement.categoryId},
        },
        ...(requirement.skillId
          ? {
              skills: {
                some: {skillId: requirement.skillId},
              },
            }
          : {}),
        ...(requirement.latitude !== null &&
        requirement.longitude !== null
          ? {
              user: {
                is: {
                  location: {
                    is: {},
                  },
                },
              },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            location: {
              select: {
                latitude: true,
                longitude: true,
              },
            },
          },
        },
        bookingsAsWorker: {
          where: {
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
          select: {id: true},
        },
        skills: {
          select: {
            skillId: true,
          },
        },
      },
      take: 500,
    });

    const ranked = candidates
      .map(worker => {
        let distanceKm: number | null = null;

        if (
          requirement.latitude !== null &&
          requirement.longitude !== null &&
          worker.user.location
        ) {
          distanceKm = this.calculateDistanceKm(
            Number(requirement.latitude),
            Number(requirement.longitude),
            Number(worker.user.location.latitude),
            Number(worker.user.location.longitude),
          );

          if (distanceKm > MATCH_RADIUS_KM) {
            return null;
          }
        }

        const skillMatch =
          requirement.skillId === null
            ? 0
            : worker.skills.some(
                skill => skill.skillId === requirement.skillId,
              )
              ? 1
              : 0;

        const experienceScore =
          Math.min(worker.experienceYears ?? 0, 20) / 20;

        const distanceScore =
          distanceKm === null
            ? 0.5
            : Math.max(
                0,
                1 - distanceKm / MATCH_RADIUS_KM,
              );

        const matchScore =
          Math.round(
            (experienceScore * 0.4 +
              skillMatch * 0.4 +
              distanceScore * 0.2) *
              100,
          ) / 100;

        return {
          worker,
          distanceKm,
          matchScore,
        };
      })
      .filter(
        (
          item,
        ): item is {
          worker: (typeof candidates)[number];
          distanceKm: number | null;
          matchScore: number;
        } => item !== null,
      )
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }

        const distanceA = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
        const distanceB = b.distanceKm ?? Number.MAX_SAFE_INTEGER;

        if (distanceA !== distanceB) {
          return distanceA - distanceB;
        }

        return a.worker.id.localeCompare(b.worker.id);
      })
      .slice(0, MAX_WORKER_OFFERS);

    if (ranked.length === 0) {
      await this.prisma.requirement.update({
        where: {id: requirementId},
        data: {status: RequirementStatus.OPEN},
      });

      return {
        status: RequirementStatus.OPEN,
        offers: [],
      };
    }

    const createdOffers = await this.prisma.$transaction(
      ranked.map(item =>
        this.prisma.requirementAssignment.upsert({
          where: {
            requirementId_workerId: {
              requirementId,
              workerId: item.worker.id,
            },
          },
          create: {
            requirementId,
            workerId: item.worker.id,
            status: RequirementAssignmentStatus.OFFERED,
            matchScore: item.matchScore,
            distanceKm: item.distanceKm,
          },
          update: {
            status: RequirementAssignmentStatus.OFFERED,
            matchScore: item.matchScore,
            distanceKm: item.distanceKm,
            respondedAt: null,
            responseReason: null,
          },
        }),
      ),
    );

    if (createdOffers.length > 0) {
      await this.prisma.requirement.update({
        where: {id: requirementId},
        data: {status: RequirementStatus.MATCHING},
      });
    }

    return {
      status: RequirementStatus.MATCHING,
      offers: ranked.map((item, index) => ({
        assignmentId: createdOffers[index].id,
        workerUserId: item.worker.user.id,
        distanceKm: item.distanceKm,
        matchScore: item.matchScore,
      })),
    };
  }

  private calculateDistanceKm(
    latitude1: number,
    longitude1: number,
    latitude2: number,
    longitude2: number,
  ): number {
    const earthRadiusKm = 6371;

    const lat1 = (latitude1 * Math.PI) / 180;
    const lat2 = (latitude2 * Math.PI) / 180;
    const deltaLatitude =
      ((latitude2 - latitude1) * Math.PI) / 180;
    const deltaLongitude =
      ((longitude2 - longitude1) * Math.PI) / 180;

    const a =
      Math.sin(deltaLatitude / 2) ** 2 +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLongitude / 2) ** 2;

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a),
      );

    return earthRadiusKm * c;
  }

  private toClientRequirementResponse(
    requirement: any,
  ): ClientRequirementResponseDto {
    return {
      id: requirement.id,
      status: requirement.status,
      title: requirement.title,
      description: requirement.description,
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
      cancelledAt: requirement.cancelledAt ?? null,
      cancellationReason: requirement.cancellationReason ?? null,
      completedAt: requirement.completedAt ?? null,
      createdAt: requirement.createdAt,
      updatedAt: requirement.updatedAt,
      booking: requirement.booking
        ? {
            id: requirement.booking.id,
            status: requirement.booking.status,
            worker: requirement.booking.worker
              ? {
                  firstName:
                    requirement.booking.worker.user.firstName,
                  lastName:
                    requirement.booking.worker.user.lastName,
                  hasProfilePhoto:
                    Boolean(
                      requirement.booking.worker
                        .profilePhotoKey,
                    ),
                }
              : null,
          }
        : null,
    };
  }

  private toWorkerRequirementResponse(
    requirement: any,
    workerId: string,
  ): WorkerRequirementResponseDto {
    const assignment = requirement.assignments.find(
      (item: {workerId: string}) =>
        item.workerId === workerId,
    );

    return {
      id: requirement.id,
      status: requirement.status,
      title: requirement.title,
      description: requirement.description,
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
      cancelledAt: requirement.cancelledAt ?? null,
      cancellationReason: requirement.cancellationReason ?? null,
      completedAt: requirement.completedAt ?? null,
      createdAt: requirement.createdAt,
      updatedAt: requirement.updatedAt,
      assignment: assignment
        ? {
            id: assignment.id,
            status: assignment.status,
            matchScore: assignment.matchScore,
            distanceKm: assignment.distanceKm,
            respondedAt: assignment.respondedAt,
          }
        : null,
    };
  }

  private async getClientRequirement(
    clientId: string,
    requirementId: string,
  ) {
    const requirement = await this.prisma.requirement.findFirst({
      where: {
        id: requirementId,
        clientId,
      },
      include: {
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
      throw new NotFoundException('Requirement not found');
    }

    return this.toClientRequirementResponse(requirement);
  }
}
