import {create} from 'zustand';
import * as Keychain from 'react-native-keychain';

const SERVICE = 'worko-onboarding';
const KEY = 'completed';

type OnboardingStatus = 'checking' | 'required' | 'completed';

type OnboardingState = {
  status: OnboardingStatus;
  initialize: () => Promise<void>;
  complete: () => Promise<void>;
};

export const useOnboardingStore = create<OnboardingState>(set => ({
  status: 'checking',
  initialize: async () => {
    try {
      const credentials = await Keychain.getGenericPassword({service: SERVICE});
      set({status: credentials?.password === KEY ? 'completed' : 'required'});
    } catch {
      set({status: 'required'});
    }
  },
  complete: async () => {
    try {
      await Keychain.setGenericPassword('worko', KEY, {service: SERVICE});
    } finally {
      set({status: 'completed'});
    }
  },
}));
