import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {PrismaService} from '../common/prisma/prisma.service';

import {
  ClientType,
  UpdateClientLocationDto,
  UpdateClientProfileDto,
} from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getMyProfile(userId: string) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          role: true,
          status: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          client: true,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    if (user.role !== 'CLIENT') {
      throw new BadRequestException(
        'Only client accounts can access a client profile',
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Your account is not active',
      );
    }

    return {
      client: user.client,
      user: {
        id: user.id,
        role: user.role,
        status: user.status,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    };
  }

  async createMyProfile(userId: string) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          role: true,
          status: true,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    if (user.role !== 'CLIENT') {
      throw new BadRequestException(
        'Only client accounts can create a client profile',
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Your account is not active',
      );
    }

    const existing =
      await this.prisma.client.findUnique({
        where: {
          userId,
        },
      });

    if (existing) {
      return {
        client: existing,
      };
    }

    const client =
      await this.prisma.client.create({
        data: {
          userId,
          type: 'INDIVIDUAL',
        },
      });

    return {
      client,
    };
  }

  async updateMyProfile(
    userId: string,
    dto: UpdateClientProfileDto,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          role: true,
          status: true,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    if (user.role !== 'CLIENT') {
      throw new BadRequestException(
        'Only client accounts can update a client profile',
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Your account is not active',
      );
    }

    const existing =
      await this.prisma.client.findUnique({
        where: {
          userId,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Client profile not found',
      );
    }

    if (dto.type === ClientType.INDIVIDUAL) {
      const client =
        await this.prisma.client.update({
          where: {
            userId,
          },
          data: {
            type: ClientType.INDIVIDUAL,
            companyName: null,
            gstin: null,
            contactPerson: null,
            businessAddress: null,
          },
        });

      return {
        client,
      };
    }

    const client =
      await this.prisma.client.update({
        where: {
          userId,
        },
        data: {
          type: ClientType.BUSINESS,
          companyName: dto.companyName!.trim(),
          gstin: dto.gstin?.trim() || null,
          contactPerson: dto.contactPerson!.trim(),
          businessAddress: dto.businessAddress!.trim(),
        },
      });

    return {
      client,
    };
  }

  async updateLocation(
  userId: string,
  dto: UpdateClientLocationDto,
) {
  const user =
    await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

  if (!user) {
    throw new NotFoundException(
      'User account not found',
    );
  }

  if (user.role !== 'CLIENT') {
    throw new BadRequestException(
      'Only client accounts can update client location',
    );
  }

  if (user.status !== 'ACTIVE') {
    throw new BadRequestException(
      'User account is not active',
    );
  }

  const client =
    await this.prisma.client.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

  if (!client) {
    throw new NotFoundException(
      'Client profile not found',
    );
  }

  const location =
    await this.prisma.userLocation.upsert({
      where: {
        userId,
      },
      create: {
        userId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracyMeters: dto.accuracyMeters,
      },
      update: {
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracyMeters: dto.accuracyMeters,
      },
    });

  return {
    message: 'Client location updated successfully',
    location,
  };
}
}