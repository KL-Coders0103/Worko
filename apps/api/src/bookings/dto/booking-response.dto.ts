import { BookingStatus } from '@prisma/client';

export class BookingParticipantResponseDto {
  firstName!: string;
  lastName!: string;
}

export class BookingResponseDto {
  id!: string;
  requirementId!: string | null;
  status!: BookingStatus;
  categoryId!: string;
  categoryName!: string;
  skillId!: string | null;
  skillName!: string | null;
  serviceTitle!: string;
  serviceDescription!: string | null;
  hourlyRate!: string | number | null;
  dailyRate!: string | number | null;
  scheduledStart!: Date;
  scheduledEnd!: Date;
  address!: string;
  latitude!: string | number | null;
  longitude!: string | number | null;
  completedAt!: Date | null;
  cancelledAt!: Date | null;
  cancellationReason!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  client?: BookingParticipantResponseDto;
  worker?: BookingParticipantResponseDto;
}
