import {workoApi} from '../api/apiClient';
import type {WorkerCategory, WorkerProfile, WorkerSkill} from './types';

export type WorkerProfileInput = {
  bio?: string; experienceYears?: number; expectedHourlyRate?: number; expectedDailyRate?: number; isAvailable?: boolean;
};

export const workerApi = {
  getMyProfile: async (): Promise<WorkerProfile> => (await workoApi.get<{worker:WorkerProfile}>('/workers/me')).data.worker,
  createProfile: async (input:WorkerProfileInput): Promise<WorkerProfile> => (await workoApi.post<{worker:WorkerProfile}>('/workers/me', input)).data.worker,
  updateProfile: async (input:WorkerProfileInput): Promise<WorkerProfile> => (await workoApi.patch<{worker:WorkerProfile}>('/workers/me', input)).data.worker,
  listCategories: async (): Promise<WorkerCategory[]> => (await workoApi.get<WorkerCategory[]>('/categories')).data,
  listSkills: async (categoryId:string): Promise<WorkerSkill[]> => (await workoApi.get<WorkerSkill[]>(\`/categories/\${categoryId}/skills\`)).data,
  updateCategories: async (categoryIds:string[]): Promise<void> => { await workoApi.patch('/workers/me/categories',{categoryIds}); },
  updateSkills: async (skillIds:string[]): Promise<void> => { await workoApi.patch('/workers/me/skills',{skillIds}); },
};
