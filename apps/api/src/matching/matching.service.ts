import {
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
