export class RequirementBookingResponseDto {
  id!: string;
  status!: string;
  worker?: {
    firstName: string | null;
    lastName: string | null;
    hasProfilePhoto: boolean;
  } | null;
}

export class ClientRequirementResponseDto {
  id!: string;
  categoryId!: string;
  categoryName!: string;
  skillId!: string | null;
  skillName!: string | null;
  title!: string;
  description!: string | null;
  budget!: string | number | null;
  scheduledStart!: Date;
  scheduledEnd!: Date;
  address!: string;
  latitude!: string | number | null;
  longitude!: string | number | null;
  status!: string;
  cancelledAt!: Date | null;
  cancellationReason!: string | null;
  completedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  booking!: RequirementBookingResponseDto | null;
}

export class WorkerRequirementAssignmentResponseDto {
  id!: string;
  status!: string;
  matchScore!: string | number | null;
  distanceKm!: string | number | null;
  respondedAt!: Date | null;
}

export class WorkerRequirementResponseDto {
  id!: string;
  categoryId!: string;
  categoryName!: string;
  skillId!: string | null;
  skillName!: string | null;
  title!: string;
  description!: string | null;
  budget!: string | number | null;
  scheduledStart!: Date;
  scheduledEnd!: Date;
  address!: string;
  latitude!: string | number | null;
  longitude!: string | number | null;
  status!: string;
  cancelledAt!: Date | null;
  cancellationReason!: string | null;
  completedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  assignment!: WorkerRequirementAssignmentResponseDto | null;
}
