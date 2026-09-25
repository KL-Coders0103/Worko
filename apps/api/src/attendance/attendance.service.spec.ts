import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { AttendanceService } from './attendance.service';

describe('AttendanceService location validation', () => {
  const prisma = {
    booking: {
      findUnique: jest.fn(),
    },
  };

  const storage = {};
  const realtime = {};

  let service: AttendanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AttendanceService(
      prisma as never,
      storage as never,
      realtime as never,
    );
  });

  it('rejects a missing booking', async () => {
    prisma.booking.findUnique.mockResolvedValue(null);

    await expect(
      service.validateBookingLocation(
        'booking-1',
        18.5204,
        73.8567,
        10,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects bookings without a work location', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      latitude: null,
      longitude: null,
    });

    await expect(
      service.validateBookingLocation(
        'booking-1',
        18.5204,
        73.8567,
        10,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid coordinates and poor GPS accuracy', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      latitude: 18.5204,
      longitude: 73.8567,
    });

    await expect(
      service.validateBookingLocation(
        'booking-1',
        91,
        73.8567,
        10,
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.validateBookingLocation(
        'booking-1',
        18.5204,
        73.8567,
        51,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts a fresh location inside the 100m geofence', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      latitude: 18.5204,
      longitude: 73.8567,
    });

    const result =
      await service.validateBookingLocation(
        'booking-1',
        18.5204,
        73.8567,
        10,
      );

    expect(result.distanceMeters).toBe(0);
    expect(result.accuracyMeters).toBe(10);
  });

  it('rejects stale location data', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      latitude: 18.5204,
      longitude: 73.8567,
    });

    const stale = new Date(
      Date.now() - 3 * 60 * 1000,
    ).toISOString();

    await expect(
      service.validateBookingLocation(
        'booking-1',
        18.5204,
        73.8567,
        10,
        stale,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
