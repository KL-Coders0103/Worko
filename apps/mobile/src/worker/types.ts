export type WorkerStatus = 'DRAFT' | 'PENDING_KYC' | 'KYC_SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED' | 'BLOCKED';

export type WorkerProfile = {
  id: string; userId: string; status: WorkerStatus; profilePhotoAvailable: boolean;
  bio: string | null; experienceYears: number | null;
  expectedHourlyRate: string | number | null; expectedDailyRate: string | number | null;
  isAvailable: boolean; kycSubmittedAt: string | null; verifiedAt: string | null; rejectedAt: string | null;
  createdAt: string; updatedAt: string;
  user: {id:string; firstName:string|null; lastName:string|null; email:string|null; phoneNumber:string|null; role:string; status:string};
  categories: Array<{categoryId:string; category:{id:string; name:string}}>;
  skills: Array<{skillId:string; skill:{id:string; name:string; categoryId:string}}>;
};

export type WorkerCategory = {id:string; name:string; slug:string; description:string|null; sortOrder:number};
export type WorkerSkill = {id:string; categoryId:string; name:string; slug:string; sortOrder:number};

export type WorkerRequirementAssignment = {
  id: string;
  status: string;
  matchScore: string | number | null;
  distanceKm: string | number | null;
  respondedAt: string | null;
};

export type WorkerRequirement = {
  id: string;
  categoryId: string;
  categoryName: string;
  skillId: string | null;
  skillName: string | null;
  title: string;
  description: string | null;
  budget: string | number | null;
  scheduledStart: string;
  scheduledEnd: string;
  address: string;
  latitude: string | number | null;
  longitude: string | number | null;
  status: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignment: WorkerRequirementAssignment | null;
};

export type WorkerAcceptResponse = {
  booking: {
    id: string;
    status: string;
    requirementId: string;
    scheduledStart: string;
    scheduledEnd: string;
  };
};
