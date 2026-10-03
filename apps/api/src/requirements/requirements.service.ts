import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RequirementStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RequirementsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForClient(clientId: string) {
    const requirements = await this.prisma.requirement.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, title: true, description: true, status: true, budget: true,
        currency: true, scheduledAt: true, address: true, createdAt: true,
        updatedAt: true, category: { select: { id: true, name: true, slug: true } },
        payment: { select: { status: true } }, booking: { select: { id: true, status: true } },
      },
    });
    return { data: requirements };
  }

  async createForClient(clientId: string, input: Record<string, unknown>) {
    const user = await this.prisma.user.findUnique({ where: { id: clientId }, select: { role: true } });
    if (!user || user.role !== UserRole.CLIENT) throw new ForbiddenException('Only client accounts can create requirements.');

    const categoryId = typeof input.categoryId === 'string' ? input.categoryId : '';
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const description = typeof input.description === 'string' ? input.description.trim() : '';
    const address = typeof input.address === 'string' ? input.address.trim() : '';
    const latitude = Number(input.latitude);
    const longitude = Number(input.longitude);
    if (!categoryId || title.length < 4 || title.length > 160 || description.length < 10 || address.length < 5 || address.length > 500) {
      throw new BadRequestException('Provide a category, valid title, detailed description, and complete address.');
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new BadRequestException('Valid location coordinates are required.');
    }
    const category = await this.prisma.category.findFirst({ where: { id: categoryId, isActive: true }, select: { id: true } });
    if (!category) throw new NotFoundException('The selected category is unavailable.');
    const photos = Array.isArray(input.photos) ? input.photos : [];
    if (photos.length > 5 || photos.some((photo) => typeof photo !== 'string' || photo.length > 2048)) {
      throw new BadRequestException('A maximum of five valid photo references is allowed.');
    }
    const preferences = input.preferences && typeof input.preferences === 'object' && !Array.isArray(input.preferences)
      ? input.preferences as object : undefined;
    const scheduledAt = input.scheduledAt == null ? null : new Date(String(input.scheduledAt));
    if (scheduledAt && (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now())) {
      throw new BadRequestException('Scheduled work must be set for a future date and time.');
    }
    const budget = input.budget == null ? null : Number(input.budget);
    if (budget !== null && (!Number.isFinite(budget) || budget < 0 || budget > 10000000)) {
      throw new BadRequestException('The estimated budget is invalid.');
    }

    const requirement = await this.prisma.requirement.create({
      data: {
        clientId, categoryId, title, description, address, latitude, longitude,
        scheduledAt, budget, photos: photos as string[], preferences,
        status: RequirementStatus.PAYMENT_PENDING,
      },
      select: { id: true, title: true, status: true, budget: true, currency: true, createdAt: true },
    });
    return { data: requirement };
  }
}
