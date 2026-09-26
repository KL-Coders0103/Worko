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
