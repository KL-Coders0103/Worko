import {create} from 'zustand';
import {clientApi} from '../client/clientApi';
import type {ClientRequirement} from '../client/types';
import {getWorkoApiErrorMessage} from '../api/apiClient';

type ClientState = {
  requirements: ClientRequirement[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  loadRequirements: () => Promise<void>;
  clearError: () => void;
};

export const useClientStore = create<ClientState>(set => ({
  requirements: [],
  status: 'idle',
  error: null,

  loadRequirements: async () => {
    set({status: 'loading', error: null});

    try {
      const requirements = await clientApi.listRequirements();
      set({requirements, status: 'success', error: null});
    } catch (error) {
      set({
        status: 'error',
        error: getWorkoApiErrorMessage(error),
      });
    }
  },

  clearError: () => set({error: null}),
}));
