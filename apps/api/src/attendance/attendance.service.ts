import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AttendanceEvidenceType,
  AttendanceQrPurpose,
  BookingStatus,
  Prisma,
} from '@prisma/client';

import {
  createHash,
  randomBytes,
} from 'crypto';

import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { assertBookingTransition } from '../bookings/booking-state-machine';

export const ATTENDANCE_GEOFENCE_RADIUS_METERS = 100;

const MAX_LOCATION_ACCURACY_METERS = 50;
const MAX_LOCATION_AGE_MS = 2 * 60 * 1000;

const QR_TOKEN_TTL_MS = 60 * 1000;

export type ValidatedAttendanceLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: Date;
  distanceMeters: number;
};

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /*
   * ============================================================
   * 12.5–12.8 GPS + GEOFENCE
   * ============================================================
   */

  async validateBookingLocation(
    bookingId: string,
    latitude: number,
    longitude: number,
    accuracyMeters: number,
    capturedAt?: string,
  ): Promise<ValidatedAttendanceLocation> {
    const booking =
      await this.prisma.booking.findUnique({
        where: {
          id: bookingId,
        },
        select: {
          id: true,
          latitude: true,
          longitude: true,
        },
      });

    if (!booking) {
      throw new NotFoundException(
        'Booking not found',
      );
    }

    if (
      booking.latitude === null ||
      booking.longitude === null
    ) {
      throw new BadRequestException(
        'Booking does not have a valid work location',
      );
    }

    this.validateCoordinates(
      latitude,
      longitude,
    );

    this.validateAccuracy(
      accuracyMeters,
    );

    const locationTimestamp = capturedAt
      ? new Date(capturedAt)
      : new Date();

    if (
      Number.isNaN(
        locationTimestamp.getTime(),
      )
    ) {
      throw new BadRequestException(
        'Invalid location timestamp',
      );
    }

    this.validateFreshness(
      locationTimestamp,
    );

    const distanceMeters =
      this.calculateDistanceMeters(
        latitude,
        longitude,
        Number(booking.latitude),
        Number(booking.longitude),
      );

    if (
      distanceMeters >
      ATTENDANCE_GEOFENCE_RADIUS_METERS
    ) {
      throw new BadRequestException(
        `Worker is outside the ${ATTENDANCE_GEOFENCE_RADIUS_METERS} meter attendance geofence`,
      );
    }

    return {
      latitude,
      longitude,
      accuracyMeters,
      capturedAt: locationTimestamp,
      distanceMeters,
    };
  }

  /*
   * ============================================================
   * 12.9–12.10 QR TOKEN CREATION
   * ============================================================
   */

  async createQrToken(
    clientUserId: string,
    bookingId: string,
    purpose: AttendanceQrPurpose,
  ) {
    const booking =
      await this.prisma.booking.findUnique({
        where: {
          id: bookingId,
        },
        include: {
          client: {
            select: {
              userId: true,
            },
          },
        },
      });

    if (!booking) {
      throw new NotFoundException(
        'Booking not found',
      );
    }

    if (
      booking.client.userId !==
      clientUserId
    ) {
      throw new ForbiddenException(
        'You do not have access to this booking',
      );
    }

    if (
      booking.status === 'CANCELLED' ||
      booking.status === 'REJECTED'
    ) {
      throw new BadRequestException(
        'QR cannot be generated for this booking',
      );
    }

    /*
     * Revoke previously active QR tokens
     * for the same booking and purpose.
     */
    await this.prisma.attendanceQrToken.updateMany(
      {
        where: {
          bookingId,
          purpose,
          usedAt: null,
          revokedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        data: {
          revokedAt: new Date(),
        },
      },
    );

    const rawToken =
      randomBytes(32).toString(
        'base64url',
      );

    const tokenHash =
      this.hashQrToken(rawToken);

    const expiresAt = new Date(
      Date.now() + QR_TOKEN_TTL_MS,
    );

    await this.prisma.attendanceQrToken.create(
      {
        data: {
          bookingId,
          purpose,
          tokenHash,
          expiresAt,
        },
      },
    );

    return {
      bookingId,
      purpose,
      token: rawToken,
      expiresAt,
      expiresInSeconds: 60,
    };
  }

  /*
   * ============================================================
   * 12.11–12.13 QR VALIDATION
   * ============================================================
   */

  async validateAndConsumeQrToken(
    workerUserId: string,
    bookingId: string,
    token: string,
    purpose: AttendanceQrPurpose,
  ) {
    if (
      !token ||
      token.length < 40
    ) {
      throw new BadRequestException(
        'Invalid QR token',
      );
    }

    const worker =
      await this.prisma.worker.findUnique({
        where: {
          userId: workerUserId,
        },
        select: {
          id: true,
        },
      });

    if (!worker) {
      throw new ForbiddenException(
        'Worker profile not found',
      );
    }

    const booking =
      await this.prisma.booking.findUnique({
        where: {
          id: bookingId,
        },
        select: {
          id: true,
          workerId: true,
        },
      });

    if (!booking) {
      throw new NotFoundException(
        'Booking not found',
      );
    }

    if (
      booking.workerId !== worker.id
    ) {
      throw new ForbiddenException(
        'You do not have access to this booking',
      );
    }

    const tokenHash =
      this.hashQrToken(token);

    const qrToken =
      await this.prisma.attendanceQrToken.findUnique(
        {
          where: {
            tokenHash,
          },
        },
      );

    if (!qrToken) {
      throw new BadRequestException(
        'Invalid QR token',
      );
    }

    if (
      qrToken.bookingId !== bookingId
    ) {
      throw new BadRequestException(
        'QR token does not belong to this booking',
      );
    }

    if (
      qrToken.purpose !== purpose
    ) {
      throw new BadRequestException(
        'QR token is not valid for this attendance action',
      );
    }

    if (qrToken.revokedAt) {
      throw new BadRequestException(
        'QR token has been revoked',
      );
    }

    if (qrToken.usedAt) {
      throw new BadRequestException(
        'QR token has already been used',
      );
    }

    if (
      qrToken.expiresAt <= new Date()
    ) {
      throw new BadRequestException(
        'QR token has expired',
      );
    }

    /*
     * Atomic consume.
     *
     * Two simultaneous requests cannot
     * successfully consume the same token.
     */
    const consumed =
      await this.prisma.attendanceQrToken.updateMany(
        {
          where: {
            id: qrToken.id,
            usedAt: null,
            revokedAt: null,
            expiresAt: {
              gt: new Date(),
            },
          },
          data: {
            usedAt: new Date(),
          },
        },
      );

    if (consumed.count !== 1) {
      throw new BadRequestException(
        'QR token has already been used or expired',
      );
    }

    return {
      valid: true,
      bookingId,
      purpose,
      verifiedAt: new Date(),
    };
  }

  /*
   * ============================================================
   * GPS HELPERS
   * ============================================================
   */

  private validateCoordinates(
    latitude: number,
    longitude: number,
  ): void {
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      throw new BadRequestException(
        'Invalid latitude',
      );
    }

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new BadRequestException(
        'Invalid longitude',
      );
    }
  }

  private validateAccuracy(
    accuracyMeters: number,
  ): void {
    if (
      !Number.isFinite(
        accuracyMeters,
      ) ||
      accuracyMeters < 0
    ) {
      throw new BadRequestException(
        'Invalid GPS accuracy',
      );
    }

    if (
      accuracyMeters >
      MAX_LOCATION_ACCURACY_METERS
    ) {
      throw new BadRequestException(
        `GPS accuracy must be ${MAX_LOCATION_ACCURACY_METERS} meters or better`,
      );
    }
  }

  private validateFreshness(
    capturedAt: Date,
  ): void {
    const now = Date.now();
    const capturedTime =
      capturedAt.getTime();

    if (
      capturedTime >
      now + 30_000
    ) {
      throw new BadRequestException(
        'Location timestamp cannot be in the future',
      );
    }

    const age =
      now - capturedTime;

    if (
      age >
      MAX_LOCATION_AGE_MS
    ) {
      throw new BadRequestException(
        'Location data is too old',
      );
    }
  }

  private calculateDistanceMeters(
    latitude1: number,
    longitude1: number,
    latitude2: number,
    longitude2: number,
  ): number {
    const earthRadiusMeters =
      6_371_000;

    const lat1 =
      this.toRadians(latitude1);

    const lat2 =
      this.toRadians(latitude2);

    const deltaLatitude =
      this.toRadians(
        latitude2 - latitude1,
      );

    const deltaLongitude =
      this.toRadians(
        longitude2 - longitude1,
      );

    const a =
      Math.sin(deltaLatitude / 2) **
        2 +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLongitude / 2) **
          2;

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a),
      );

    return (
      earthRadiusMeters * c
    );
  }

  private toRadians(
    degrees: number,
  ): number {
    return (
      (degrees * Math.PI) / 180
    );
  }

  private hashQrToken(
    token: string,
  ): string {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }

  async createAttendanceEvidence(
  workerUserId: string,
  bookingId: string,
  dto: {
    type: AttendanceEvidenceType;
    fileKey: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    capturedAt?: string;
  },
) {
  const worker =
    await this.prisma.worker.findUnique({
      where: {
        userId: workerUserId,
      },
      select: {
        id: true,
      },
    });

  if (!worker) {
    throw new ForbiddenException(
      'Worker profile not found',
    );
  }

  const booking =
    await this.prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        id: true,
        workerId: true,
        attendance: {
          select: {
            id: true,
          },
        },
      },
    });

  if (!booking) {
    throw new NotFoundException(
      'Booking not found',
    );
  }

  if (
    booking.workerId !== worker.id
  ) {
    throw new ForbiddenException(
      'You do not have access to this booking',
    );
  }

  if (!booking.attendance) {
    throw new BadRequestException(
      'Attendance record has not been created for this booking',
    );
  }

  /*
   * Validate GPS on the server.
   * The mobile client cannot simply claim
   * that the photo was captured at the
   * customer's location.
   */
  const validatedLocation =
    await this.validateBookingLocation(
      bookingId,
      dto.latitude,
      dto.longitude,
      dto.accuracyMeters,
      dto.capturedAt,
    );

  /*
   * Only allow attendance-owned storage keys.
   *
   * Evidence must already have been uploaded
   * through the private storage layer.
   */
  if (
    !dto.fileKey.startsWith(
      `attendance/${bookingId}/`,
    )
  ) {
    throw new BadRequestException(
      'Invalid attendance evidence storage key',
    );
  }

  const capturedAt = validatedLocation.capturedAt;

  const evidence =
    await this.prisma.attendanceEvidence.create(
      {
        data: {
          attendanceId:
            booking.attendance.id,

          type: dto.type,

          storageKey:
            dto.fileKey,

          latitude:
            validatedLocation.latitude,

          longitude:
            validatedLocation.longitude,

          capturedAt,
        },
      },
    );

  return {
    evidence,
    location: {
      latitude:
        validatedLocation.latitude,

      longitude:
        validatedLocation.longitude,

      accuracyMeters:
        validatedLocation.accuracyMeters,

      distanceMeters:
        validatedLocation.distanceMeters,

      capturedAt:
        validatedLocation.capturedAt,
    },
  };
}

async uploadAttendanceEvidence(
  workerUserId: string,
  bookingId: string,
  buffer: Buffer,
  contentType: string,
  originalName?: string,
) {
  const worker =
    await this.prisma.worker.findUnique({
      where: {
        userId: workerUserId,
      },
      select: {
        id: true,
      },
    });

  if (!worker) {
    throw new ForbiddenException(
      'Worker profile not found',
    );
  }

  const booking =
    await this.prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        id: true,
        workerId: true,
      },
    });

  if (!booking) {
    throw new NotFoundException(
      'Booking not found',
    );
  }

  if (
    booking.workerId !== worker.id
  ) {
    throw new ForbiddenException(
      'You do not have access to this booking',
    );
  }

  if (
    !contentType.startsWith('image/')
  ) {
    throw new BadRequestException(
      'Only image evidence is allowed',
    );
  }

  /*
   * Keep evidence private.
   */
  return this.storageService.uploadPrivateObject(
    buffer,
    contentType,
    `attendance/${bookingId}`,
    originalName,
  );
}

async getAttendanceEvidence(
  userId: string,
  bookingId: string,
) {
  const booking =
    await this.prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        id: true,
        client: {
          select: {
            userId: true,
          },
        },
        worker: {
          select: {
            userId: true,
          },
        },
        attendance: {
          include: {
            evidence: {
              orderBy: {
                capturedAt: 'asc',
              },
            },
          },
        },
      },
    });

  if (!booking) {
    throw new NotFoundException(
      'Booking not found',
    );
  }

  if (
    booking.client.userId !== userId &&
    booking.worker?.userId !== userId
  ) {
    throw new ForbiddenException(
      'You do not have access to this booking',
    );
  }

  return {
    bookingId,
    attendance:
      booking.attendance,
  };
}

async checkIn(
  workerUserId: string,
  bookingId: string,
  dto: {
    qrToken: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    capturedAt?: string;
  },
) {
  const worker =
    await this.prisma.worker.findUnique({
      where: {
        userId: workerUserId,
      },
      select: {
        id: true,
      },
    });

  if (!worker) {
    throw new ForbiddenException(
      'Worker profile not found',
    );
  }

  const booking =
    await this.prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      include: {
        attendance: true,
      },
    });

  if (!booking) {
    throw new NotFoundException(
      'Booking not found',
    );
  }

  if (
    booking.workerId !== worker.id
  ) {
    throw new ForbiddenException(
      'You do not have access to this booking',
    );
  }

  if (booking.status !== 'ARRIVED') {
    throw new BadRequestException(
      'Worker must arrive before check-in',
    );
  }

  if (
    booking.attendance?.status ===
    'CHECKED_IN'
  ) {
    throw new BadRequestException(
      'Worker is already checked in',
    );
  }

  /*
   * 12.5–12.8
   * Server-authoritative GPS validation.
   */
  const location =
    await this.validateBookingLocation(
      bookingId,
      dto.latitude,
      dto.longitude,
      dto.accuracyMeters,
      dto.capturedAt,
    );

  /*
   * 12.11
   * Validate and consume booking-specific
   * CHECK_IN QR.
   */
  await this.validateAndConsumeQrToken(
    workerUserId,
    bookingId,
    dto.qrToken,
    'CHECK_IN',
  );

  /*
   * BEFORE_PHOTO is mandatory.
   */
  if (!booking.attendance) {
    throw new BadRequestException(
      'Attendance record is not initialized',
    );
  }

  const beforePhoto =
    await this.prisma.attendanceEvidence.findFirst(
      {
        where: {
          attendanceId:
            booking.attendance.id,
          type: 'BEFORE_PHOTO',
        },
      },
    );

  if (!beforePhoto) {
    throw new BadRequestException(
      'Before-work photo is required before check-in',
    );
  }

  const now = new Date();

  const result =
    await this.prisma.$transaction(
      async tx => {
        const attendance =
          await tx.attendance.update({
            where: {
              id: booking.attendance!.id,
            },
            data: {
              status: 'CHECKED_IN',

              checkInAt: now,

              checkInLatitude:
                location.latitude,

              checkInLongitude:
                location.longitude,

              checkInAccuracyMeters:
                location.accuracyMeters,
            },
          });

        await tx.attendanceEvent.create({
          data: {
            attendanceId:
              attendance.id,

            type: 'CHECK_IN',

            latitude:
              location.latitude,

            longitude:
              location.longitude,

            accuracyMeters:
              location.accuracyMeters,

            qrVerified: true,

            occurredAt: now,
          },
        });

        assertBookingTransition(
          BookingStatus.ARRIVED,
          BookingStatus.CHECKED_IN,
        );

        const updatedBooking =
          await tx.booking.update({
            where: {
              id: booking.id,
            },
            data: {
              status: BookingStatus.CHECKED_IN,
            },
            include: {
              attendance: true,
            },
          });

        return {
          attendance,
          booking: updatedBooking,
          location,
        };
      },
    );

  return result;
}

async checkOut(
  workerUserId: string,
  bookingId: string,
  dto: {
    qrToken: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    capturedAt?: string;
  },
) {
  const worker =
    await this.prisma.worker.findUnique({
      where: {
        userId: workerUserId,
      },
      select: {
        id: true,
      },
    });

  if (!worker) {
    throw new ForbiddenException(
      'Worker profile not found',
    );
  }

  const booking =
    await this.prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      include: {
        attendance: true,
        payment: true,
      },
    });

  if (!booking) {
    throw new NotFoundException(
      'Booking not found',
    );
  }

  if (
    booking.workerId !== worker.id
  ) {
    throw new ForbiddenException(
      'You do not have access to this booking',
    );
  }

  if (booking.status !== 'IN_PROGRESS') {
    throw new BadRequestException(
      'Booking must be in progress before check-out',
    );
  }

  if (!booking.attendance) {
    throw new BadRequestException(
      'Attendance record not found',
    );
  }

  if (
    booking.attendance.status !==
    'CHECKED_IN'
  ) {
    throw new BadRequestException(
      'Worker has not checked in',
    );
  }

  /*
   * 12.5–12.8
   */
  const location =
    await this.validateBookingLocation(
      bookingId,
      dto.latitude,
      dto.longitude,
      dto.accuracyMeters,
      dto.capturedAt,
    );

  /*
   * 12.12
   */
  await this.validateAndConsumeQrToken(
    workerUserId,
    bookingId,
    dto.qrToken,
    'CHECK_OUT',
  );

  /*
   * AFTER_PHOTO mandatory.
   */
  const afterPhoto =
    await this.prisma.attendanceEvidence.findFirst(
      {
        where: {
          attendanceId:
            booking.attendance.id,
          type: 'AFTER_PHOTO',
        },
      },
    );

  if (!afterPhoto) {
    throw new BadRequestException(
      'After-work photo is required before check-out',
    );
  }

  const now = new Date();

  const result =
    await this.prisma.$transaction(
      async tx => {
        const attendance =
          await tx.attendance.update({
            where: {
              id: booking.attendance!.id,
            },
            data: {
              status: 'CHECKED_OUT',

              checkOutAt: now,

              checkOutLatitude:
                location.latitude,

              checkOutLongitude:
                location.longitude,

              checkOutAccuracyMeters:
                location.accuracyMeters,
            },
          });

        await tx.attendanceEvent.create({
          data: {
            attendanceId:
              attendance.id,

            type: 'CHECK_OUT',

            latitude:
              location.latitude,

            longitude:
              location.longitude,

            accuracyMeters:
              location.accuracyMeters,

            qrVerified: true,

            occurredAt: now,
          },
        });

        /*
        assertBookingTransition(
          BookingStatus.IN_PROGRESS,
          BookingStatus.CHECKED_OUT,
        );

        const checkedOutBooking =
          await tx.booking.update({
            where: {
              id: booking.id,
            },
            data: {
              status: 'CHECKED_OUT',
            },
            include: {
              attendance: true,
              payment: true,
            },
          });

        return {
          attendance,
          booking: checkedOutBooking,
          paymentReleased: false,
          location,
        };
      },
    );

  return result;
}
}