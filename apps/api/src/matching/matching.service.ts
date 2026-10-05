import { Injectable, Logger } from '@nestjs/common';
import { OfferStatus, RequirementStatus, WorkerAvailabilityStatus, WorkerVerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Preferences = {
  verifiedOnly?: boolean;
  experiencedOnly?: boolean;
  duration?: string;
};

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(private readonly prisma: PrismaService) {}

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
        offers: { select: { workerId: true, status: true } },
      },
    });

    if (!requirement || requirement.status !== RequirementStatus.MATCHING) {
      return { matched: false, reason: 'NOT_MATCHING' as const };
    }

    const preferences = (requirement.preferences && typeof requirement.preferences === 'object' && !Array.isArray(requirement.preferences))
      ? requirement.preferences as Preferences
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
        latitude: true,
        longitude: true,
        preferredRadiusKm: true,
      },
      take: 100,
    });

    const existingWorkerIds = new Set(requirement.offers.map((offer) => offer.workerId));
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
      .filter(({ worker, distanceKm }) => distanceKm <= Math.max(10, Number(worker.preferredRadiusKm) || 10))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 10);

    if (!candidates.length) {
      this.logger.log(`No eligible worker found for requirement ${requirementId}; matching remains active.`);
      return { matched: false, reason: 'NO_WORKER' as const };
    }

    const expiresAt = new Date(Date.now() + 2 * 60_000);
    await this.prisma.$transaction(async (tx) => {
      for (const candidate of candidates) {
        await tx.matchingOffer.upsert({
          where: {
            requirementId_workerId: {
              requirementId,
              workerId: candidate.worker.id,
            },
          },
          create: {
            requirementId,
            workerId: candidate.worker.id,
            status: OfferStatus.PENDING,
            expiresAt,
          },
          update: {
            status: OfferStatus.PENDING,
            offeredAt: new Date(),
            expiresAt,
            respondedAt: null,
          },
        });
      }
      await tx.requirement.updateMany({
        where: { id: requirementId, status: RequirementStatus.MATCHING },
        data: { status: RequirementStatus.MATCHED },
      });
    });

    this.logger.log(`Created ${candidates.length} worker offers for requirement ${requirementId}.`);
    return {
      matched: true,
      workerCount: candidates.length,
      workers: candidates.map(({ worker, distanceKm }) => ({ workerId: worker.id, distanceKm })),
    };
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
        offers: {
          where: { status: { in: [OfferStatus.PENDING, OfferStatus.ACCEPTED] } },
          orderBy: { offeredAt: 'desc' },
          take: 10,
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
    const state = requirement.status === RequirementStatus.MATCHED || activeOffers.length
      ? 'WORKER_FOUND'
      : requirement.status === RequirementStatus.MATCHING
        ? 'SEARCHING'
        : requirement.status === RequirementStatus.PAYMENT_PENDING
          ? 'PAYMENT_PENDING'
          : requirement.booking
            ? 'BOOKING_CONFIRMED'
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
