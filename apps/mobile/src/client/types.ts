export type RequirementStatus =
  | 'MATCHING'
  | 'OPEN'
  | 'MATCHED'
  | 'COMPLETED'
  | 'CANCELLED';

export type ClientRequirement = {
  id: string;
  status: RequirementStatus;
  title: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  skillId: string | null;
  skillName: string | null;
  budget: number | null;
  scheduledStart: string;
  scheduledEnd: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  booking: {
    id: string;
    status: string;
    worker: {
      firstName: string | null;
      lastName: string | null;
      hasProfilePhoto: boolean;
    } | null;
  } | null;
};
