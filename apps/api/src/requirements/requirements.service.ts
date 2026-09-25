import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RequirementStatus, RequirementAssignmentStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { RequirementActionDto } from './dto/requirement-action.dto';

@Injectable()
export class RequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingsService: BookingsService,
  ) {}

  async create(userId: string, dto: CreateRequirementDto) {
    const client = await this.prisma.client.findUnique({ where: { userId } });
    if (!client) throw new BadRequestException('Complete your client profile before creating a requirement');

    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) {
      throw new BadRequestException('Invalid scheduled time range');
    }
    if (start <= new Date()) throw new BadRequestException('Requirement must be scheduled for a future time');

    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, status: 'ACTIVE' },
      select: { id: true, name: true },
    });
    if (!category) throw new BadRequestException('Category not found or inactive');

    let skillName: string | null = null;
    if (dto.skillId) {
      const skill = await this.prisma.skill.findFirst({
        where: { id: dto.skillId, categoryId: dto.categoryId, status: 'ACTIVE' },
        select: { id: true, name: true },
      });
      if (!skill) throw new BadRequestException('Skill not found or not associated with the category');
      skillName = skill.name;
    }

    const requirement = await this.prisma.requirement.create({
      data: {
        clientId: client.id,
        categoryId: category.id,
        categoryName: category.name,
        skillId: dto.skillId,
        skillName,
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

    const workers = await this.prisma.worker.findMany({
      where: {
        status: 'VERIFIED',
        isAvailable: true,
        user: { status: 'ACTIVE' },
        categories: { some: { categoryId: dto.categoryId } },
        ...(dto.skillId ? { skills: { some: { skillId: dto.skillId } } } : {}),
      },
      select: { id: true },
      take: 20,
    });

    if (workers.length) {
      await this.prisma.requirementAssignment.createMany({
        data: workers.map(worker => ({
          requirementId: requirement.id,
          workerId: worker.id,
          status: RequirementAssignmentStatus.OFFERED,
        })),
        skipDuplicates: true,
      });
    }

    return this.getOne(userId, 'CLIENT', requirement.id);
  }

  async listMine(userId: string, role: 'CLIENT' | 'WORKER') {
    if (role === 'CLIENT') {
      const client = await this.prisma.client.findUnique({ where: { userId }, select: { id: true } });
      if (!client) throw new NotFoundException('Client profile not found');
      return this.prisma.requirement.findMany({
        where: { clientId: client.id },
        include: { assignments: { select: { id: true, status: true, workerId: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    const worker = await this.prisma.worker.findUnique({ where: { userId }, select: { id: true } });
    if (!worker) throw new NotFoundException('Worker profile not found');
    return this.prisma.requirement.findMany({
      where: { assignments: { some: { workerId: worker.id, status: RequirementAssignmentStatus.OFFERED } } },
      include: { assignments: { where: { workerId: worker.id }, select: { id: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(userId: string, role: 'CLIENT' | 'WORKER', requirementId: string) {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id: requirementId },
      include: { assignments: { select: { id: true, workerId: true, status: true, createdAt: true } } },
    });
    if (!requirement) throw new NotFoundException('Requirement not found');

    if (role === 'CLIENT') {
      const client = await this.prisma.client.findUnique({ where: { userId }, select: { id: true } });
      if (!client || client.id !== requirement.clientId) throw new ForbiddenException('You do not have access to this requirement');
    } else {
      const worker = await this.prisma.worker.findUnique({ where: { userId }, select: { id: true } });
      if (!worker || !requirement.assignments.some(a => a.workerId === worker.id)) {
        throw new ForbiddenException('You do not have access to this requirement');
      }
    }

    return requirement;
  }

  async accept(userId: string, requirementId: string) {
    const worker = await this.prisma.worker.findUnique({ where: { userId }, select: { id: true } });
    if (!worker) throw new ForbiddenException('Worker profile not found');

    const assignment = await this.prisma.requirementAssignment.findFirst({
      where: { requirementId, workerId: worker.id, status: RequirementAssignmentStatus.OFFERED },
      include: { requirement: true },
    });
    if (!assignment) throw new NotFoundException('Requirement is not available to you');

    if (assignment.requirement.status !== RequirementStatus.MATCHING && assignment.requirement.status !== RequirementStatus.OPEN) {
      throw new BadRequestException('Requirement is no longer available');
    }

    const booking = await this.bookingsService.createBooking(userId, {
      workerId: worker.id,
      categoryId: assignment.requirement.categoryId,
      skillId: assignment.requirement.skillId ?? undefined,
      serviceTitle: assignment.requirement.title,
      serviceDescription: assignment.requirement.description ?? undefined,
      scheduledStart: assignment.requirement.scheduledStart.toISOString(),
      scheduledEnd: assignment.requirement.scheduledEnd.toISOString(),
      address: assignment.requirement.address,
      latitude: assignment.requirement.latitude ? Number(assignment.requirement.latitude) : undefined,
      longitude: assignment.requirement.longitude ? Number(assignment.requirement.longitude) : undefined,
    });

    await this.prisma.$transaction([
      this.prisma.requirementAssignment.update({
        where: { id: assignment.id },
        data: { status: RequirementAssignmentStatus.ACCEPTED, respondedAt: new Date() },
      }),
      this.prisma.requirement.update({
        where: { id: requirementId },
        data: { status: RequirementStatus.MATCHED },
      }),
    ]);

    return booking;
  }

  async reject(userId: string, requirementId: string, dto: RequirementActionDto) {
    const worker = await this.prisma.worker.findUnique({ where: { userId }, select: { id: true } });
    if (!worker) throw new ForbiddenException('Worker profile not found');

    const assignment = await this.prisma.requirementAssignment.findFirst({
      where: { requirementId, workerId: worker.id, status: RequirementAssignmentStatus.OFFERED },
    });
    if (!assignment) throw new NotFoundException('Requirement is not available to you');

    return this.prisma.requirementAssignment.update({
      where: { id: assignment.id },
      data: { status: RequirementAssignmentStatus.REJECTED, respondedAt: new Date(), responseReason: dto.reason?.trim() },
    });
  }

  async cancel(userId: string, requirementId: string, dto: RequirementActionDto) {
    const client = await this.prisma.client.findUnique({ where: { userId }, select: { id: true } });
    if (!client) throw new ForbiddenException('Client profile not found');

    const requirement = await this.prisma.requirement.findUnique({ where: { id: requirementId } });
    if (!requirement || requirement.clientId !== client.id) throw new NotFoundException('Requirement not found');
    if ([RequirementStatus.MATCHED, RequirementStatus.COMPLETED, RequirementStatus.CANCELLED].includes(requirement.status)) {
      throw new BadRequestException('Requirement cannot be cancelled in its current state');
    }

    return this.prisma.$transaction([
      this.prisma.requirement.update({
        where: { id: requirementId },
        data: { status: RequirementStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: dto.reason?.trim() },
      }),
      this.prisma.requirementAssignment.updateMany({
        where: { requirementId, status: RequirementAssignmentStatus.OFFERED },
        data: { status: RequirementAssignmentStatus.EXPIRED, respondedAt: new Date() },
      }),
    ]);
  }
}
