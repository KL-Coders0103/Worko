import {workoApi} from '../api/apiClient';
import type {ClientRequirement} from './types';

export type ClientCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
};

export type ClientSkill = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  sortOrder: number;
};

export type CreateRequirementInput = {
  categoryId: string;
  skillId?: string;
  title: string;
  description?: string;
  budget?: number;
  scheduledStart: string;
  scheduledEnd: string;
  address: string;
  latitude?: number;
  longitude?: number;
};

export type CreateRequirementResponse = {
  requirement: ClientRequirement;
  matching: {
    status: string;
    offersCreated: number;
  };
};

export const clientApi = {
  listRequirements: async (): Promise<ClientRequirement[]> => {
    const response = await workoApi.get<ClientRequirement[]>('/requirements');
    return response.data;
  },

  getRequirement: async (id: string): Promise<ClientRequirement> => {
    const response = await workoApi.get<ClientRequirement>(`/requirements/${id}`);
    return response.data;
  },

  listCategories: async (): Promise<ClientCategory[]> => {
    const response = await workoApi.get<ClientCategory[]>('/categories');
    return response.data;
  },

  listSkills: async (categoryId: string): Promise<ClientSkill[]> => {
    const response = await workoApi.get<ClientSkill[]>(`/categories/${categoryId}/skills`);
    return response.data;
  },

  createRequirement: async (
    input: CreateRequirementInput,
  ): Promise<CreateRequirementResponse> => {
    const response = await workoApi.post<CreateRequirementResponse>('/requirements', input);
    return response.data;
  },
};
