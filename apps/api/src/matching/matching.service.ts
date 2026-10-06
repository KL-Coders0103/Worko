import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  MatchingRoundStatus,
  OfferStatus,
  Prisma,
  RequirementStatus,
  WorkerAvailabilityStatus,
  WorkerVerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingGateway } from './matching.gateway';
import { RedisService } from '../infrastructure/redis/redis.service';

type Preferences = {
  verifiedOnly?: boolean;
  experiencedOnly?: boolean;
  duration?: string;
};

const MATCHING_ROUNDS = [5, 10, 25] as const;
const MAX_DISTINCT_OFFERS = 20;
const OFFER_TTL_MS = 2 * 60_000;
const MATCHING_TICK_MS = 5_000;

type MatchingResult = {
  matched: boolean;
  reason: string;
  round?: number;
  radiusKm?: number;
  workerCount?: number;
  workers?: Array<{ workerId: string; distanceKm: number }>;
};

@Injectable()
export class MatchingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MatchingService.name);
  private interval?: ReturnType<typeof setInterval>;
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: MatchingGateway,
    private readonly redis: RedisService,
  ) {}

  onModuleInit(): void {
    this.interval = setInterval(() => {
      void this.processExpiries();
    }, MATCHING_TICK_MS);
    void this.processExpiries();
  }

  onModuleDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }

  async startMatching(requirementId: string) {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id: requirementId },
      select: {
        id: true,
        status: true,
        categoryId: true,
        latitude: true,
        longitude: true,
        preferences: true,
        payment: { select: { status: true } },
      },
    });

    if (!requirement || requirement.status !== RequirementStatus.MATCHING) {
      return { matched: false, reason: 'NOT_MATCHING' as const };
    }

    if (requirement.payment?.status !== 'CAPTURED') {
      return { matched: false, reason: 'PAYMENT_NOT_CAPTURED' as const };
    }

    return this.runNextRound(requirement);
  }

  private async runNextRound(requirement: {
    id: string;
    status: RequirementStatus;
    categoryId: string;
    latitude: Prisma.Decimal;
    longitude: Prisma.Decimal;
    preferences: Prisma.JsonValue | null;
  }): Promise<MatchingResult> {
    const distinctOfferCount = await this.prisma.matchingOffer.count({
      where: { requirementId: requirement.id },
    });

    if (distinctOfferCount >= MAX_DISTINCT_OFFERS) {
      this.gateway.emitToRequirement(requirement.id, 'matching.completed', {
        requirementId: requirement.id,
        reason: 'MAX_OFFERS_REACHED',
      });
      return { matched: false, reason: 'MAX_OFFERS_REACHED' as const };
    }

    const activeOffer = await this.prisma.matchingOffer.findFirst({
      where: {
        requirementId: requirement.id,
        status: OfferStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (activeOffer) return { matched: true, reason: 'OFFERS_ACTIVE' as const };

    const activeRound = await this.prisma.matchingRound.findFirst({
      where: { requirementId: requirement.id, status: MatchingRoundStatus.ACTIVE },
      orderBy: { roundNumber: 'desc' },
    });

    if (activeRound && activeRound.expiresAt > new Date()) {
      return this.createOffersForRound(requirement, activeRound.roundNumber, activeRound.radiusKm, activeRound.id);
    }

    if (activeRound) {
      await this.completeRound(activeRound.id);
    }

    const latestRound = await this.prisma.matchingRound.findFirst({
      where: { requirementId: requirement.id },
      orderBy: { roundNumber: 'desc' },
    });
    const nextRoundNumber = latestRound ? latestRound.roundNumber + 1 : 1;
    const radiusKm = MATCHING_ROUNDS[Math.min(nextRoundNumber - 1, MATCHING_ROUNDS.length - 1)];

    const round = await this.prisma.matchingRound.create({
      data: {
        requirementId: requirement.id,
        roundNumber: nextRoundNumber,
        radiusKm,
        status: MatchingRoundStatus.ACTIVE,
        expiresAt: new Date(Date.now() + OFFER_TTL_MS),
      },
    });

    this.gateway.emitToRequirement(requirement.id, 'matching.round', {
      requirementId: requirement.id,
      round: nextRoundNumber,
      radiusKm,
    });

    return this.createOffersForRound(requirement, nextRoundNumber, radiusKm, round.id);
  }

  private async createOffersForRound(
    requirement: {
      id: string;
      categoryId: string;
      latitude: Prisma.Decimal;
      longitude: Prisma.Decimal;
      preferences: Prisma.JsonValue | null;
    },
    roundNumber: number,
    radiusKm: number,
    roundId: string,
  ): Promise<MatchingResult> {
    const preferences =
      requirement.preferences &&
      typeof requirement.preferences === 'object' &&
      !Array.isArray(requirement.preferences)
        ? (requirement.preferences as Preferences)
        : {};

    const verifiedOnly = preferences.verifiedOnly !== false;
    const workers = await this.prisma.workerProfile.findMany({
      where: {
        availabilityStatus: WorkerAvailabilityStatus.AVAILABLE,
        verificationStatus: verifiedOnly ? WorkerVerificationStatus.VERIFIED : undefined,
        latitude: { not: null },
        longitude: { not: null },
        categories: { some: { categoryId: requirement.categoryId } },
      },
      select: {
        id: true,
        userId: true,
        latitude: true,
        longitude: true,
        preferredRadiusKm: true,
      },
      take: 500,
    });

    const existing = await this.prisma.matchingOffer.findMany({
      where: { requirementId: requirement.id },
      select: { workerId: true },
    });
    const existingWorkerIds = new Set(existing.map((offer) => offer.workerId));

    const remainingSlots = MAX_DISTINCT_OFFERS - existingWorkerIds.size;
    const candidates = workers
      .filter((worker) => !existingWorkerIds.has(worker.id))
      .map((worker) => ({
        worker,
        distanceKm: this.distanceKm(
          Number(requirement.latitude),
          Number(requirement.longitude),
          Number(worker.latitude),
          Number(worker.longitude),
        ),
      }))
      .filter(
        ({ worker, distanceKm }) =>
          distanceKm <= radiusKm &&
          distanceKm <= Math.max(10, Number(worker.preferredRadiusKm) || 10),
      )
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, Math.min(remainingSlots, 20));

    if (!candidates.length) {
      await this.completeRound(roundId);
      if (roundNumber < MATCHING_ROUNDS.length) {
        return this.runNextRound({
          id: requirement.id,
          status: RequirementStatus.MATCHING,
          categoryId: requirement.categoryId,
          latitude: requirement.latitude,
          longitude: requirement.longitude,
          preferences: requirement.preferences,
        });
      }
      return { matched: false, reason: 'NO_WORKER' as const, round: roundNumber, radiusKm };
    }

    const expiresAt = new Date(Date.now() + OFFER_TTL_MS);
    const createdOffers = await this.prisma.$transaction(async (tx) => {
      const created: Array<{ id: string; workerId: string; distanceKm: number; userId: string }> = [];
      for (const candidate of candidates) {
        const offer = await tx.matchingOffer.upsert({
          where: {
            requirementId_workerId: {
              requirementId: requirement.id,
              workerId: candidate.worker.id,
            },
          },
          create: {
            requirementId: requirement.id,
            workerId: candidate.worker.id,
            roundId,
            status: OfferStatus.PENDING,
            expiresAt,
          },
          update: {},
          select: { id: true },
        });
        created.push({
          id: offer.id,
          workerId: candidate.worker.id,
          distanceKm: candidate.distanceKm,
          userId: candidate.worker.userId,
        });
      }
      return created;
    });

    for (const offer of createdOffers) {
      this.gateway.emitToUser(offer.userId, 'matching.offer', {
        offerId: offer.id,
        requirementId: requirement.id,
        round: roundNumber,
        radiusKm,
        distanceKm: Number(offer.distanceKm.toFixed(2)),
        expiresAt: expiresAt.toISOString(),
      });
    }

    this.gateway.emitToRequirement(requirement.id, 'matching.offers', {
      requirementId: requirement.id,
      round: roundNumber,
      radiusKm,
      count: createdOffers.length,
      expiresAt: expiresAt.toISOString(),
    });

    this.logger.log(
      `Round ${roundNumber} (${radiusKm}km) created ${createdOffers.length} offers for requirement ${requirement.id}.`,
    );

    return {
      matched: true,
      reason: 'OFFERS_CREATED',
      round: roundNumber,
      radiusKm,
      workerCount: createdOffers.length,
      workers: createdOffers.map(({ workerId, distanceKm }) => ({ workerId, distanceKm })),
    };
  }

  private async processExpiries(): Promise<void> {
    if (this.processing) return;

    const lockToken = await this.redis.tryAcquireLock(
      'worko:matching:expiry:lock',
      30_000,
    );
    if (this.redis.isReady() && !lockToken) return;

    this.processing = true;
    try {
      const expiredOffers = await this.prisma.matchingOffer.findMany({
        where: {
          status: OfferStatus.PENDING,
          expiresAt: { lte: new Date() },
          requirement: { status: RequirementStatus.MATCHING },
        },
        select: {
          id: true,
          workerId: true,
          requirementId: true,
          worker: { select: { userId: true } },
        },
        take: 100,
      });

      for (const offer of expiredOffers) {
        const result = await this.prisma.matchingOffer.updateMany({
          where: {
            id: offer.id,
            status: OfferStatus.PENDING,
            expiresAt: { lte: new Date() },
          },
          data: { status: OfferStatus.EXPIRED, respondedAt: new Date() },
        });
        if (result.count === 0) continue;

        this.gateway.emitToUser(offer.worker.userId, 'matching.offer.expired', {
          offerId: offer.id,
          requirementId: offer.requirementId,
        });
        this.gateway.emitToRequirement(offer.requirementId, 'matching.offer.expired', {
          offerId: offer.id,
          requirementId: offer.requirementId,
        });
      }

      const requirements = await this.prisma.requirement.findMany({
        where: { status: RequirementStatus.MATCHING },
        select: {
          id: true,
          categoryId: true,
          latitude: true,
          longitude: true,
          preferences: true,
        },
        take: 100,
      });

      for (const requirement of requirements) {
        const active = await this.prisma.matchingOffer.findFirst({
          where: {
            requirementId: requirement.id,
            status: OfferStatus.PENDING,
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        });
        if (!active) {
          await this.startMatching(requirement.id);
        }
      }
    } catch (error) {
      this.logger.error('Matching expiry processing failed', error);
    } finally {
      this.processing = false;
      if (lockToken) {
        await this.redis.releaseLock('worko:matching:expiry:lock', lockToken).catch(() => undefined);
      }
    }
  }

  private async completeRound(roundId: string): Promise<void> {
    await this.prisma.matchingRound.updateMany({
      where: { id: roundId, status: MatchingRoundStatus.ACTIVE },
      data: { status: MatchingRoundStatus.COMPLETED, completedAt: new Date() },
    });
  }

  async retryMatching(clientId: string, requirementId: string) {
    const requirement = await this.prisma.requirement.findFirst({
      where: { id: requirementId, clientId },
      select: {
        id: true,
        status: true,
        categoryId: true,
        latitude: true,
        longitude: true,
        preferences: true,
        payment: { select: { status: true } },
      },
    });
    if (!requirement) return null;
    if (requirement.payment?.status !== 'CAPTURED') {
      return { matched: false, reason: 'PAYMENT_NOT_CAPTURED' as const };
    }

    if (requirement.status === RequirementStatus.MATCHED) {
      await this.prisma.requirement.updateMany({
        where: { id: requirementId, clientId, status: RequirementStatus.MATCHED },
        data: { status: RequirementStatus.MATCHING },
      });
    }

    return this.startMatching(requirementId);
  }

  async acceptOffer(workerUserId: string, offerId: string) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const offer = await tx.matchingOffer.findUnique({
            where: { id: offerId },
            select: {
              id: true,
              workerId: true,
              status: true,
              expiresAt: true,
              requirementId: true,
              requirement: { select: { clientId: true, status: true } },
            },
          });

          if (!offer) throw new NotFoundException('Matching offer not found.');
          const worker = await tx.workerProfile.findUnique({
            where: { id: offer.workerId },
            select: { userId: true },
          });
          if (!worker || worker.userId !== workerUserId) {
            throw new ConflictException('This offer does not belong to you.');
          }
          if (offer.status !== OfferStatus.PENDING || offer.expiresAt <= new Date()) {
            throw new ConflictException('This offer is no longer available.');
          }

          const claimed = await tx.matchingOffer.updateMany({
            where: {
              id: offer.id,
              workerId: offer.workerId,
              status: OfferStatus.PENDING,
              expiresAt: { gt: new Date() },
            },
            data: { status: OfferStatus.ACCEPTED, respondedAt: new Date() },
          });
          if (claimed.count !== 1) {
            throw new ConflictException('This offer was already accepted or expired.');
          }

          const existingBooking = await tx.booking.findUnique({
            where: { requirementId: offer.requirementId },
            select: { id: true },
          });
          if (existingBooking) {
            throw new ConflictException('Another worker already accepted this requirement.');
          }

          const booking = await tx.booking.create({
            data: {
              requirementId: offer.requirementId,
              clientId: offer.requirement.clientId,
              workerId: offer.workerId,
              status: 'CONFIRMED',
              workflow: {
                tasks: this.buildJobTasks(offer.requirementId),
                beforePhotos: [],
                afterPhotos: [],
                progressPhotos: [],
                progressNotes: [],
                finalNotes: '',
              },
              statusHistory: { create: { status: 'CONFIRMED', note: 'Worker accepted matching offer.' } },
            },
            select: { id: true, requirementId: true, workerId: true, status: true, createdAt: true },
          });

          await tx.matchingOffer.updateMany({
            where: {
              requirementId: offer.requirementId,
              id: { not: offer.id },
              status: OfferStatus.PENDING,
            },
            data: { status: OfferStatus.REJECTED, respondedAt: new Date() },
          });

          await tx.notification.createMany({
            data: [
              { userId: offer.requirement.clientId, bookingId: booking.id, type: 'BOOKING', title: 'Worker found', body: 'Your Worko request has been accepted by a worker.' },
              { userId: workerUserId, bookingId: booking.id, type: 'BOOKING', title: 'Booking confirmed', body: 'Your accepted offer is now a confirmed booking.' },
            ],
          });

          await tx.requirement.updateMany({
            where: { id: offer.requirementId, status: RequirementStatus.MATCHING },
            data: { status: RequirementStatus.MATCHED },
          });

          return booking;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) throw error;
      this.logger.warn(`Concurrent offer acceptance rejected for offer ${offerId}: ${String(error)}`);
      throw new ConflictException('This requirement was accepted by another worker.');
    }
  }

  private buildJobTasks(_requirementId: string) {
    return [
      { id: 'task-1', title: 'Review the client requirements', completed: false },
      { id: 'task-2', title: 'Complete the requested service', completed: false },
      { id: 'task-3', title: 'Check the completed work', completed: false },
      { id: 'task-4', title: 'Clean up and confirm completion', completed: false },
    ];
  }

  private async getOwnedBooking(workerUserId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, worker: { userId: workerUserId } },
      select: {
        id: true,
        workerId: true,
        status: true,
        startedAt: true,
        completedAt: true,
        workflow: true,
        requirement: {
          select: {
            id: true,
            title: true,
            description: true,
            photos: true,
            address: true,
            latitude: true,
            longitude: true,
            scheduledAt: true,
            budget: true,
            currency: true,
            category: { select: { name: true, slug: true } },
            client: { select: { id: true, phone: true, clientProfile: { select: { fullName: true, photoUrl: true, address: true } } } },
            payment: { select: { status: true, amount: true, currency: true } },
          },
        },
      },
    });
    if (!booking) throw new NotFoundException('Worker job not found.');
    const workflow = (booking.workflow && typeof booking.workflow === 'object' ? booking.workflow : {}) as Record<string, unknown>;
    return { booking, workflow };
  }

  async getWorkerJob(workerUserId: string, bookingId: string) {
    const { booking, workflow } = await this.getOwnedBooking(workerUserId, bookingId);
    return { data: this.serializeWorkerJob(booking, workflow) };
  }

  async markArrived(workerUserId: string, bookingId: string) {
    const { booking, workflow } = await this.getOwnedBooking(workerUserId, bookingId);
    if (booking.status !== 'CONFIRMED') throw new ConflictException('This job is no longer awaiting arrival.');
    workflow.arrivedAt = new Date().toISOString();
    await this.prisma.booking.update({ where: { id: booking.id }, data: { workflow: workflow as Prisma.InputJsonValue } });
    return { data: this.serializeWorkerJob({ ...booking, workflow }, workflow) };
  }

  async checkIn(workerUserId: string, bookingId: string, code: string) {
    const { booking, workflow } = await this.getOwnedBooking(workerUserId, bookingId);
    if (!workflow.arrivedAt) throw new ConflictException('Mark arrival before checking in.');
    const normalized = code.trim();
    const valid = normalized === booking.id || normalized === booking.id.slice(0, 8).toUpperCase() || normalized === ('WORKO-' + booking.id.slice(0, 8).toUpperCase());
    if (!valid) throw new ConflictException('Invalid check-in code.');
    workflow.checkedInAt = new Date().toISOString();
    await this.prisma.booking.update({ where: { id: booking.id }, data: { workflow: workflow as Prisma.InputJsonValue } });
    return { data: this.serializeWorkerJob({ ...booking, workflow }, workflow) };
  }

  async startJob(workerUserId: string, bookingId: string) {
    const { booking, workflow } = await this.getOwnedBooking(workerUserId, bookingId);
    if (!workflow.checkedInAt) throw new ConflictException('Complete check-in before starting the job.');
    if (!Array.isArray(workflow.beforePhotos) || workflow.beforePhotos.length === 0) throw new ConflictException('Submit before-work photos before starting the job.');
    if (booking.status === 'IN_PROGRESS') return { data: this.serializeWorkerJob(booking, workflow) };
    if (booking.status !== 'CONFIRMED') throw new ConflictException('This job cannot be started.');
    const now = new Date();
    workflow.startedAt = now.toISOString();
    await this.prisma.$transaction([
      this.prisma.booking.update({ where: { id: booking.id }, data: { status: 'IN_PROGRESS', startedAt: now, workflow: workflow as Prisma.InputJsonValue } }),
      this.prisma.bookingStatusHistory.create({ data: { bookingId: booking.id, status: 'IN_PROGRESS', note: 'Worker started the job on site.' } }),
      this.prisma.requirement.updateMany({ where: { id: booking.requirement.id, status: RequirementStatus.MATCHED }, data: { status: RequirementStatus.IN_PROGRESS } }),
    ]);
    return { data: this.serializeWorkerJob({ ...booking, status: 'IN_PROGRESS', startedAt: now, workflow }, workflow) };
  }

  async completeTask(workerUserId: string, bookingId: string, taskId: string) {
    const { booking, workflow } = await this.getOwnedBooking(workerUserId, bookingId);
    if (booking.status !== 'IN_PROGRESS') throw new ConflictException('Start the job before completing tasks.');
    const tasks = Array.isArray(workflow.tasks) ? workflow.tasks.map((task) => ({ ...(task as Record<string, unknown>) })) : [];
    const task = tasks.find(item => item.id === taskId);
    if (!task) throw new NotFoundException('Job task not found.');
    task.completed = true;
    workflow.tasks = tasks;
    await this.prisma.booking.update({ where: { id: booking.id }, data: { workflow: workflow as Prisma.InputJsonValue } });
    return { data: this.serializeWorkerJob({ ...booking, workflow }, workflow) };
  }

  async addJobEvidence(workerUserId: string, bookingId: string, type: 'before' | 'after' | 'progress', urls: string[]) {
    const { booking, workflow } = await this.getOwnedBooking(workerUserId, bookingId);
    const key = type === 'before' ? 'beforePhotos' : type === 'after' ? 'afterPhotos' : 'progressPhotos';
    const existing = Array.isArray(workflow[key]) ? workflow[key] : [];
    workflow[key] = [...existing, ...urls].slice(0, 20);
    await this.prisma.booking.update({ where: { id: booking.id }, data: { workflow: workflow as Prisma.InputJsonValue } });
    return { data: this.serializeWorkerJob({ ...booking, workflow }, workflow) };
  }

  async completeJob(workerUserId: string, bookingId: string, finalNotes?: string) {
    const { booking, workflow } = await this.getOwnedBooking(workerUserId, bookingId);
    const tasks = Array.isArray(workflow.tasks) ? workflow.tasks : [];
    if (booking.status !== 'IN_PROGRESS') throw new ConflictException('The job is not in progress.');
    if (tasks.some(task => !(task as Record<string, unknown>).completed)) throw new ConflictException('Complete all job tasks before ending the job.');
    if (!Array.isArray(workflow.beforePhotos) || workflow.beforePhotos.length === 0) throw new ConflictException('Before-work evidence is required.');
    if (!Array.isArray(workflow.afterPhotos) || workflow.afterPhotos.length === 0) throw new ConflictException('Submit at least one after-work photo before completing the job.');
    workflow.finalNotes = (finalNotes ?? '').trim();
    workflow.completedAt = new Date().toISOString();
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.booking.update({ where: { id: booking.id }, data: { status: 'COMPLETED', completedAt: now, workflow: workflow as Prisma.InputJsonValue } }),
      this.prisma.bookingStatusHistory.create({ data: { bookingId: booking.id, status: 'COMPLETED', note: 'Worker completed all job tasks.' } }),
      this.prisma.requirement.updateMany({ where: { id: booking.requirement.id, status: RequirementStatus.IN_PROGRESS }, data: { status: RequirementStatus.COMPLETED } }),
      this.prisma.workerProfile.update({ where: { id: booking.workerId }, data: { availabilityStatus: WorkerAvailabilityStatus.AVAILABLE } }),
    ]);
    return { data: this.serializeWorkerJob({ ...booking, status: 'COMPLETED', completedAt: now, workflow }, workflow) };
  }

  private serializeWorkerJob(booking: any, workflow: Record<string, any>) {
    const requirement = booking.requirement;
    return {
      bookingId: booking.id,
      status: booking.status,
      startedAt: booking.startedAt ?? null,
      completedAt: booking.completedAt ?? null,
      arrivedAt: workflow.arrivedAt ?? null,
      checkedInAt: workflow.checkedInAt ?? null,
      tasks: Array.isArray(workflow.tasks) ? workflow.tasks : [],
      beforePhotos: Array.isArray(workflow.beforePhotos) ? workflow.beforePhotos : [],
      afterPhotos: Array.isArray(workflow.afterPhotos) ? workflow.afterPhotos : [],
      progressPhotos: Array.isArray(workflow.progressPhotos) ? workflow.progressPhotos : [],
      finalNotes: typeof workflow.finalNotes === 'string' ? workflow.finalNotes : '',
      requirement: {
        id: requirement.id,
        title: requirement.title,
        description: requirement.description,
        photos: requirement.photos,
        address: requirement.address,
        latitude: Number(requirement.latitude),
        longitude: Number(requirement.longitude),
        scheduledAt: requirement.scheduledAt,
        budget: requirement.budget == null ? null : Number(requirement.budget),
        currency: requirement.currency,
        category: requirement.category,
        client: {
          name: requirement.client.clientProfile?.fullName ?? 'Client',
          phone: requirement.client.phone,
          photoUrl: requirement.client.clientProfile?.photoUrl ?? null,
          address: requirement.client.clientProfile?.address ?? null,
        },
        payment: requirement.payment ? { status: requirement.payment.status, amount: Number(requirement.payment.amount), currency: requirement.payment.currency } : null,
      },
    };
  }

  async getAcceptedOfferDetails(workerUserId: string, offerId: string) {
    const offer = await this.prisma.matchingOffer.findFirst({
      where: {
        id: offerId,
        worker: { userId: workerUserId },
        status: OfferStatus.ACCEPTED,
      },
      select: {
        id: true,
        status: true,
        offeredAt: true,
        expiresAt: true,
        requirement: {
          select: {
            id: true,
            title: true,
            description: true,
            photos: true,
            address: true,
            latitude: true,
            longitude: true,
            scheduledAt: true,
            budget: true,
            currency: true,
            category: { select: { id: true, name: true, slug: true } },
            client: {
              select: {
                id: true,
                phone: true,
                clientProfile: {
                  select: { fullName: true, photoUrl: true, address: true },
                },
              },
            },
            payment: {
              select: { status: true, amount: true, currency: true },
            },
            booking: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                startedAt: true,
                completedAt: true,
              },
            },
          },
        },
      },
    });

    if (!offer) throw new NotFoundException('Accepted offer not found.');

    return {
      data: {
        offerId: offer.id,
        status: offer.status,
        offeredAt: offer.offeredAt,
        expiresAt: offer.expiresAt,
        requirement: {
          ...offer.requirement,
          latitude: Number(offer.requirement.latitude),
          longitude: Number(offer.requirement.longitude),
          budget: offer.requirement.budget === null ? null : Number(offer.requirement.budget),
          client: {
            id: offer.requirement.client.id,
            name: offer.requirement.client.clientProfile?.fullName ?? 'Client',
            phone: offer.requirement.client.phone,
            photoUrl: offer.requirement.client.clientProfile?.photoUrl ?? null,
            address: offer.requirement.client.clientProfile?.address ?? null,
          },
          payment: offer.requirement.payment
            ? {
                status: offer.requirement.payment.status,
                amount: Number(offer.requirement.payment.amount),
                currency: offer.requirement.payment.currency,
              }
            : null,
          booking: offer.requirement.booking,
        },
      },
    };
  }

  async rejectOffer(workerUserId: string, offerId: string) {
    const offer = await this.prisma.matchingOffer.findUnique({
      where: { id: offerId },
      select: { id: true, workerId: true, requirementId: true },
    });
    if (!offer) throw new NotFoundException('Matching offer not found.');

    const worker = await this.prisma.workerProfile.findUnique({
      where: { id: offer.workerId },
      select: { userId: true },
    });
    if (!worker || worker.userId !== workerUserId) throw new ConflictException('This offer does not belong to you.');

    const result = await this.prisma.matchingOffer.updateMany({
      where: { id: offerId, workerId: offer.workerId, status: OfferStatus.PENDING, expiresAt: { gt: new Date() } },
      data: { status: OfferStatus.REJECTED, respondedAt: new Date() },
    });
    if (!result.count) throw new ConflictException('This offer is no longer available.');

    this.gateway.emitToRequirement(offer.requirementId, 'matching.offer.rejected', { offerId, requirementId: offer.requirementId });
    return { rejected: true };
  }

  async getWorkerOffers(workerUserId: string) {
    const worker = await this.prisma.workerProfile.findUnique({
      where: { userId: workerUserId },
      select: { id: true },
    });
    if (!worker) return { data: [] };

    await this.expireWorkerOffers(worker.id);
    const offers = await this.prisma.matchingOffer.findMany({
      where: { workerId: worker.id, status: OfferStatus.PENDING, expiresAt: { gt: new Date() } },
      orderBy: { offeredAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        offeredAt: true,
        expiresAt: true,
        requirement: {
          select: {
            id: true,
            title: true,
            description: true,
            address: true,
            scheduledAt: true,
            budget: true,
            currency: true,
            category: { select: { name: true, slug: true } },
          },
        },
      },
    });
    return { data: offers };
  }

  async getWorkerPreferences(workerUserId: string) {
    const worker = await this.prisma.workerProfile.findUnique({
      where: { userId: workerUserId },
      select: {
        preferredRadiusKm: true,
        serviceAreaAddress: true,
        serviceAreaLatitude: true,
        serviceAreaLongitude: true,
        minimumPayment: true,
        workSchedule: true,
        categories: { select: { categoryId: true } },
      },
    });
    if (!worker) throw new NotFoundException('Worker profile not found.');
    return {
      data: {
        categoryIds: worker.categories.map((x) => x.categoryId),
        serviceArea: {
          address: worker.serviceAreaAddress,
          latitude: worker.serviceAreaLatitude === null ? null : Number(worker.serviceAreaLatitude),
          longitude: worker.serviceAreaLongitude === null ? null : Number(worker.serviceAreaLongitude),
        },
        preferredRadiusKm: Number(worker.preferredRadiusKm),
        workSchedule: worker.workSchedule ?? {
          monday:{enabled:true,start:'09:00',end:'18:00'},tuesday:{enabled:true,start:'09:00',end:'18:00'},
          wednesday:{enabled:true,start:'09:00',end:'18:00'},thursday:{enabled:true,start:'09:00',end:'18:00'},
          friday:{enabled:true,start:'09:00',end:'18:00'},saturday:{enabled:true,start:'09:00',end:'18:00'},
          sunday:{enabled:false,start:'09:00',end:'18:00'},
        },
        minimumPayment: worker.minimumPayment === null ? 500 : Number(worker.minimumPayment),
      },
    };
  }

  async updateWorkerPreferences(workerUserId: string, body: {
    categoryIds?: string[];
    serviceArea?: { address?: string; latitude?: number; longitude?: number };
    preferredRadiusKm?: number;
    workSchedule?: Record<string, { enabled: boolean; start: string; end: string }>;
    minimumPayment?: number;
  }) {
    const worker = await this.prisma.workerProfile.findUnique({ where: { userId: workerUserId }, select: { id: true } });
    if (!worker) throw new NotFoundException('Worker profile not found.');
    if (body.preferredRadiusKm !== undefined && ![5,10,25].includes(Number(body.preferredRadiusKm))) {
      throw new ConflictException('Preferred radius must be 5, 10, or 25 km.');
    }
    if (body.minimumPayment !== undefined && (!Number.isFinite(body.minimumPayment) || body.minimumPayment < 0)) {
      throw new ConflictException('Minimum payment must be a valid non-negative amount.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.workerProfile.update({
        where: { id: worker.id },
        data: {
          ...(body.preferredRadiusKm !== undefined ? { preferredRadiusKm: body.preferredRadiusKm } : {}),
          ...(body.serviceArea ? {
            serviceAreaAddress: body.serviceArea.address ?? null,
            serviceAreaLatitude: body.serviceArea.latitude ?? null,
            serviceAreaLongitude: body.serviceArea.longitude ?? null,
          } : {}),
          ...(body.minimumPayment !== undefined ? { minimumPayment: body.minimumPayment } : {}),
          ...(body.workSchedule !== undefined ? { workSchedule: body.workSchedule } : {}),
        },
      });
      if (body.categoryIds) {
        await tx.workerCategory.deleteMany({ where: { workerId: worker.id } });
        if (body.categoryIds.length) {
          await tx.workerCategory.createMany({
            data: body.categoryIds.map((categoryId) => ({ workerId: worker.id, categoryId })),
            skipDuplicates: true,
          });
        }
      }
    });
    return this.getWorkerPreferences(workerUserId);
  }

  async getWorkerDashboard(workerUserId: string) {
    const worker = await this.prisma.workerProfile.findUnique({
      where: { userId: workerUserId },
      select: {
        id: true,
        verificationStatus: true,
        availabilityStatus: true,
        preferredRadiusKm: true,
        displayName: true,
        photoUrl: true,
        latitude: true,
        longitude: true,
        user: {
          select: {
            email: true,
          },
        },
        categories: {
          select: { categoryId: true },
        },
      },
    });

    if (!worker) return { data: null };

    await this.expireWorkerOffers(worker.id);

    const now = new Date();
    const [offers, activeBooking, completedJobs] = await Promise.all([
      this.prisma.matchingOffer.findMany({
        where: {
          workerId: worker.id,
          status: OfferStatus.PENDING,
          expiresAt: { gt: now },
        },
        orderBy: { offeredAt: 'desc' },
        take: 5,
        select: {
          id: true,
          offeredAt: true,
          expiresAt: true,
          requirement: {
            select: {
              id: true,
              title: true,
              description: true,
              address: true,
              scheduledAt: true,
              budget: true,
              currency: true,
              category: { select: { name: true, slug: true } },
            },
          },
        },
      }),
      this.prisma.booking.findFirst({
        where: {
          workerId: worker.id,
          status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
          startedAt: true,
          requirement: {
            select: {
              id: true,
              title: true,
              description: true,
              address: true,
              scheduledAt: true,
              budget: true,
              currency: true,
              category: { select: { name: true, slug: true } },
              client: { select: { phone: true } },
            },
          },
        },
      }),
      this.prisma.booking.count({
        where: { workerId: worker.id, status: 'COMPLETED' },
      }),
    ]);

    const profileSignals = [
      worker.verificationStatus === WorkerVerificationStatus.VERIFIED,
      worker.categories.length > 0,
      worker.latitude !== null && worker.longitude !== null,
      Number(worker.preferredRadiusKm) > 0,
      Boolean(worker.user.email),
    ];
    const profileCompletion = Math.round(
      (profileSignals.filter(Boolean).length / profileSignals.length) * 100,
    );

    return {
      data: {
        worker: {
          id: worker.id,
          displayName: worker.displayName ?? (worker.user.email
            ? worker.user.email.split('@')[0].replace(/[._-]+/g, ' ')
            : 'Worker'),
          verificationStatus: worker.verificationStatus,
          availabilityStatus: worker.availabilityStatus,
          preferredRadiusKm: Number(worker.preferredRadiusKm),
          profileCompletion,
          categoryCount: worker.categories.length,
        },
        counts: {
          newOffers: offers.length,
          activeJobs: activeBooking ? 1 : 0,
          completedJobs,
        },
        wallet: {
          balance: null,
          currency: 'INR',
          available: false,
        },
        offers,
        activeJob: activeBooking,
      },
    };
  }

  async getWorkerProfile(workerUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: workerUserId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        workerProfile: {
          select: {
            id: true,
            displayName: true,
            photoUrl: true,
            verificationStatus: true,
            availabilityStatus: true,
            preferredRadiusKm: true,
            serviceAreaAddress: true,
            minimumPayment: true,
            workSchedule: true,
            categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
          },
        },
      },
    });
    if (!user?.workerProfile) throw new NotFoundException('Worker profile not found.');
    return {
      data: {
        ...user,
        workerProfile: {
          ...user.workerProfile,
          preferredRadiusKm: Number(user.workerProfile.preferredRadiusKm),
          minimumPayment: user.workerProfile.minimumPayment == null ? null : Number(user.workerProfile.minimumPayment),
          categories: user.workerProfile.categories.map(item => item.category),
        },
      },
    };
  }

  async updateWorkerProfile(workerUserId: string, input: { displayName?: string; photoUrl?: string }) {
    const worker = await this.prisma.workerProfile.findUnique({
      where: { userId: workerUserId },
      select: { id: true },
    });
    if (!worker) throw new NotFoundException('Worker profile not found.');
    const displayName = input.displayName?.trim();
    if (displayName !== undefined && (displayName.length < 2 || displayName.length > 160)) {
      throw new BadRequestException('Display name must be between 2 and 160 characters.');
    }
    const updated = await this.prisma.workerProfile.update({
      where: { id: worker.id },
      data: {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl || null } : {}),
      },
      select: { displayName: true, photoUrl: true },
    });
    return { data: updated };
  }

  async setWorkerAvailability(workerUserId: string, available: boolean) {
    const worker = await this.prisma.workerProfile.findUnique({
      where: { userId: workerUserId },
      select: { id: true, verificationStatus: true, availabilityStatus: true },
    });

    if (!worker) throw new NotFoundException('Worker profile not found.');
    if (worker.verificationStatus !== WorkerVerificationStatus.VERIFIED) {
      throw new ConflictException('Worker verification is required before going available.');
    }

    const availabilityStatus = available
      ? WorkerAvailabilityStatus.AVAILABLE
      : WorkerAvailabilityStatus.OFFLINE;

    const updated = await this.prisma.workerProfile.update({
      where: { id: worker.id },
      data: { availabilityStatus },
      select: { availabilityStatus: true },
    });

    return { availabilityStatus: updated.availabilityStatus };
  }

  private async expireWorkerOffers(workerId: string) {
    await this.prisma.matchingOffer.updateMany({
      where: { workerId, status: OfferStatus.PENDING, expiresAt: { lte: new Date() } },
      data: { status: OfferStatus.EXPIRED, respondedAt: new Date() },
    });
  }

  async getClientState(clientId: string, requirementId: string) {
    const requirement = await this.prisma.requirement.findFirst({
      where: { id: requirementId, clientId },
      select: {
        id: true,
        title: true,
        status: true,
        address: true,
        scheduledAt: true,
        budget: true,
        currency: true,
        category: { select: { id: true, name: true, slug: true } },
        payment: { select: { status: true, amount: true, currency: true } },
        matchingRounds: {
          orderBy: { roundNumber: 'desc' },
          take: 1,
          select: { roundNumber: true, radiusKm: true, status: true, expiresAt: true },
        },
        offers: {
          where: { status: { in: [OfferStatus.PENDING, OfferStatus.ACCEPTED] } },
          orderBy: { offeredAt: 'desc' },
          take: 20,
          select: {
            id: true,
            status: true,
            offeredAt: true,
            expiresAt: true,
            worker: {
              select: {
                id: true,
                verificationStatus: true,
                user: { select: { id: true, clientProfile: { select: { fullName: true, photoUrl: true } } } },
              },
            },
          },
        },
        booking: { select: { id: true, workerId: true, status: true, createdAt: true } },
      },
    });

    if (!requirement) return null;

    const activeOffers = requirement.offers.filter((offer) => offer.expiresAt > new Date());
    const state = requirement.booking
      ? 'BOOKING_CONFIRMED'
      : activeOffers.length
        ? 'WORKER_FOUND'
        : requirement.status === RequirementStatus.MATCHING
          ? 'SEARCHING'
          : requirement.status === RequirementStatus.PAYMENT_PENDING
            ? 'PAYMENT_PENDING'
            : requirement.status;

    return {
      data: {
        ...requirement,
        matchingState: state,
        noWorkerFound: state === 'SEARCHING' && activeOffers.length === 0,
        offers: activeOffers,
      },
    };
  }

  private distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const earthRadiusKm = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }
}
