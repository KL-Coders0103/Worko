import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  RequirementAssignmentStatus,
  RequirementStatus,
  WorkerStatus,
} from '@prisma/client';

import {PrismaService} from '../common/prisma/prisma.service';
import {CreateRequirementDto} from './dto/create-requirement.dto';
import {RealtimeGateway} from '../realtime/realtime.gateway';
import {REALTIME_EVENTS} from '../realtime/realtime.types';
import {RequirementActionDto} from './dto/requirement-action.dto';

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

    if (matching.offers.length) {
      this.realtime.notifyWorkers(
        matching.offers.map(
          offer => offer.workerUserId,
        ),
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
          offers: matching.offers.map(
            offer => ({
              assignmentId: offer.assignmentId,
              distanceKm: offer.distanceKm,
              matchScore: offer.matchScore,
            }),
          ),
        },
      );
    }

    return {
      requirement: await this.getClientRequirement(
        client.id,
        requirement.id,
      ),
      matching,
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

      return this.prisma.requirement.findMany({
        where: {
          clientId: client.id,
        },
        include: {
          assignments: {
            select: {
              id: true,
              status: true,
              workerId: true,
              matchScore: true,
              distanceKm: true,
            },
          },
          booking: {
            select: {
              id: true,
              workerId: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
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

    return this.prisma.requirement.findMany({
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
              workerId: true,
              status: true,
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

      return requirement;
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

    return requirement;
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

    return this.prisma.$transaction(
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
    );
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

    return this.prisma.requirementAssignment.update({
      where: {id: assignment.id},
      data: {
        status:
          RequirementAssignmentStatus.REJECTED,
        respondedAt: new Date(),
        responseReason:
          dto.reason?.trim(),
      },
    });
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

    if (
      [
        RequirementStatus.MATCHED,
        RequirementStatus.COMPLETED,
        RequirementStatus.CANCELLED,
      ].includes(requirement.status)
    ) {
      throw new BadRequestException(
        'Requirement cannot be cancelled in its current state',
      );
    }

    return this.prisma.$transaction([
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

    const workers =
      await this.prisma.worker.findMany({
        where: {
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
        take: 100,
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
      };
    }

    const assignments =
      await this.prisma.$transaction(
        candidates.map(
          candidate =>
            this.prisma.requirementAssignment.upsert({
              where: {
                requirementId_workerId: {
                  requirementId,
                  workerId:
                    candidate.workerId,
                },
              },
              create: {
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
              update: {
                status:
                  RequirementAssignmentStatus.OFFERED,
                matchScore:
                  candidate.score,
                distanceKm:
                  candidate.distanceKm,
                respondedAt: null,
                responseReason: null,
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
    };
  }

  private async getClientRequirement(
    clientId: string,
    requirementId: string,
  ) {
    return this.prisma.requirement.findFirst({
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
            workerId: true,
            status: true,
          },
        },
      },
    });
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
