export type WorkerStatus =
  | 'DRAFT'
  | 'PENDING_KYC'
  | 'KYC_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'BLOCKED';

export type WorkerCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
};

export type WorkerSkill = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  sortOrder: number;
};

export type WorkerProfile = {
  id: string;
  userId: string;
  status: WorkerStatus;
  profilePhotoKey?: string | null;
  bio?: string | null;
  experienceYears?: number | null;
  expectedHourlyRate?: number | null;
  expectedDailyRate?: number | null;
  isAvailable: boolean;
  aadhaarDocumentKey?: string | null;
  policeVerificationDocumentKey?: string | null;
  kycSubmittedAt?: string | null;
  verifiedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
  };
  categories: Array<{
    category: WorkerCategory;
  }>;
  skills: Array<{
    skill: WorkerSkill;
  }>;
};

export type CreateWorkerProfilePayload = {
  bio?: string;
  experienceYears?: number;
  expectedHourlyRate?: number;
  expectedDailyRate?: number;
  isAvailable?: boolean;
  profilePhotoKey?: string;
};

export type UpdateWorkerProfilePayload =
  CreateWorkerProfilePayload;