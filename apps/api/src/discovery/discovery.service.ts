import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../common/prisma/prisma.service';

type DiscoveryQuery = {
  search?: string;
  category?: string;
  skill?: string;
  available?: string;
  verified?: string;
  latitude?: string;
  longitude?: string;
  radiusKm?: string;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getWorkers(query: DiscoveryQuery) {
    const search = query.search?.trim();
    const category = query.category?.trim().toLowerCase();
    const skill = query.skill?.trim().toLowerCase();

    const available = this.parseBoolean(
      query.available,
      'available',
    );

    const verified = this.parseBoolean(
      query.verified,
      'verified',
    );

    if (verified === false) {
      throw new BadRequestException(
        'Discovery only supports verified workers',
      );
    }

    const coordinates = this.parseCoordinates(query);

    const radiusKm = this.parseRadius(query.radiusKm);

    const workers = await this.prisma.worker.findMany({
      where: {
        status: 'VERIFIED',
        isAvailable: available ?? true,

        user: {
          status: 'ACTIVE',

          ...(search
            ? {
                OR: [
                  {
                    firstName: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    lastName: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    worker: {
                      bio: {
                        contains: search,
                        mode: 'insensitive',
                      },
                    },
                  },
                ],
              }
            : {}),
        },

        ...(category
          ? {
              categories: {
                some: {
                  category: {
                    slug: category,
                    status: 'ACTIVE',
                  },
                },
              },
            }
          : {}),

        ...(skill
          ? {
              skills: {
                some: {
                  skill: {
                    slug: skill,
                    status: 'ACTIVE',
                  },
                },
              },
            }
          : {}),
      },

      select: {
        id: true,
        status: true,
        profilePhotoKey: true,
        bio: true,
        experienceYears: true,
        expectedHourlyRate: true,
        expectedDailyRate: true,
        isAvailable: true,
        verifiedAt: true,

        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,

            location: {
              select: {
                latitude: true,
                longitude: true,
                accuracyMeters: true,
              },
            },
          },
        },

        categories: {
          where: {
            category: {
              status: 'ACTIVE',
            },
          },
          select: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },

        skills: {
          where: {
            skill: {
              status: 'ACTIVE',
            },
          },
          select: {
            skill: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },

      orderBy: [
        {
          verifiedAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });

    const mappedWorkers = workers
      .map((worker) => {
        const location = worker.user.location
          ? {
              latitude: Number(
                worker.user.location.latitude,
              ),
              longitude: Number(
                worker.user.location.longitude,
              ),
              accuracyMeters:
                worker.user.location.accuracyMeters
                  ? Number(
                      worker.user.location.accuracyMeters,
                    )
                  : null,
            }
          : null;

        const distanceKm =
          coordinates && location
            ? this.calculateDistance(
                coordinates,
                location,
              )
            : null;

        return {
          id: worker.id,

          name: [
            worker.user.firstName,
            worker.user.lastName,
          ]
            .filter(Boolean)
            .join(' '),

          profilePhotoKey:
            worker.profilePhotoKey,

          bio: worker.bio,

          experienceYears:
            worker.experienceYears,

          expectedHourlyRate:
            worker.expectedHourlyRate?.toString() ??
            null,

          expectedDailyRate:
            worker.expectedDailyRate?.toString() ??
            null,

          isAvailable:
            worker.isAvailable,

          verified:
            worker.status === 'VERIFIED',

          verifiedAt:
            worker.verifiedAt,

          categories:
            worker.categories.map(
              ({ category }) => category,
            ),

          skills:
            worker.skills.map(
              ({ skill }) => skill,
            ),

          location: location
            ? {
                latitude:
                  location.latitude.toString(),

                longitude:
                  location.longitude.toString(),

                accuracyMeters:
                  location.accuracyMeters?.toString() ??
                  null,
              }
            : null,

          distanceKm:
            distanceKm !== null
              ? Number(distanceKm.toFixed(2))
              : null,
        };
      })
      .filter((worker) => {
        if (
          coordinates &&
          radiusKm !== undefined
        ) {
          return (
            worker.distanceKm !== null &&
            worker.distanceKm <= radiusKm
          );
        }

        return true;
      });

    if (coordinates) {
      mappedWorkers.sort(
        (a, b) =>
          (a.distanceKm ?? Number.MAX_SAFE_INTEGER) -
          (b.distanceKm ?? Number.MAX_SAFE_INTEGER),
      );
    }

    return {
      workers: mappedWorkers,
      count: mappedWorkers.length,

      locationSearch: coordinates
        ? {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            radiusKm: radiusKm ?? null,
          }
        : null,
    };
  }

  private parseBoolean(
    value: string | undefined,
    field: string,
  ): boolean | undefined {
    if (value === undefined) {
      return undefined;
    }

    const normalized =
      value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }

    throw new BadRequestException(
      `${field} must be true or false`,
    );
  }

  private parseCoordinates(
    query: DiscoveryQuery,
  ): Coordinates | undefined {
    const hasLatitude =
      query.latitude !== undefined;

    const hasLongitude =
      query.longitude !== undefined;

    if (!hasLatitude && !hasLongitude) {
      return undefined;
    }

    if (!hasLatitude || !hasLongitude) {
      throw new BadRequestException(
        'latitude and longitude must be provided together',
      );
    }

    const latitude = Number(query.latitude);
    const longitude = Number(query.longitude);

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      throw new BadRequestException(
        'latitude must be between -90 and 90',
      );
    }

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new BadRequestException(
        'longitude must be between -180 and 180',
      );
    }

    return {
      latitude,
      longitude,
    };
  }

  private parseRadius(
    value: string | undefined,
  ): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    const radius = Number(value);

    if (
      !Number.isFinite(radius) ||
      radius <= 0 ||
      radius > 100
    ) {
      throw new BadRequestException(
        'radiusKm must be greater than 0 and at most 100',
      );
    }

    return radius;
  }

  private calculateDistance(
    origin: Coordinates,
    destination: Coordinates,
  ): number {
    const earthRadiusKm = 6371;

    const latitudeDifference =
      this.toRadians(
        destination.latitude -
          origin.latitude,
      );

    const longitudeDifference =
      this.toRadians(
        destination.longitude -
          origin.longitude,
      );

    const latitude1 =
      this.toRadians(origin.latitude);

    const latitude2 =
      this.toRadians(destination.latitude);

    const a =
      Math.sin(latitudeDifference / 2) ** 2 +
      Math.cos(latitude1) *
        Math.cos(latitude2) *
        Math.sin(longitudeDifference / 2) ** 2;

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a),
      );

    return earthRadiusKm * c;
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }
}