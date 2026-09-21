import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getActiveCategories() {
    return this.prisma.category.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          name: 'asc',
        },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        sortOrder: true,
      },
    });
  }

  async getActiveCategoryById(categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        sortOrder: true,
      },
    });

    if (!category) {
      throw new NotFoundException(
        'Category not found',
      );
    }

    return category;
  }

  async getActiveSkills(categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new NotFoundException(
        'Category not found',
      );
    }

    return this.prisma.skill.findMany({
      where: {
        categoryId,
        status: 'ACTIVE',
      },
      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          name: 'asc',
        },
      ],
      select: {
        id: true,
        categoryId: true,
        name: true,
        slug: true,
        sortOrder: true,
      },
    });
  }
}