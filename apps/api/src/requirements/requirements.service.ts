import { Injectable } from '@nestjs/common';
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
        id: true,
        title: true,
        description: true,
        status: true,
        budget: true,
        currency: true,
        scheduledAt: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { id: true, name: true, slug: true } },
        payment: { select: { status: true } },
        booking: { select: { id: true, status: true } },
      },
    });
    return { data: requirements };
  }
}
