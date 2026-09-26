import {workoApi} from '../api/apiClient';
import type {ClientRequirement} from './types';

export const clientApi = {
  listRequirements: async (): Promise<ClientRequirement[]> => {
    const response = await workoApi.get<ClientRequirement[]>('/requirements');
    return response.data;
  },

  getRequirement: async (id: string): Promise<ClientRequirement> => {
    const response = await workoApi.get<ClientRequirement>(`/requirements/${id}`);
    return response.data;
  },
};
