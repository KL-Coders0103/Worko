import {create} from 'zustand';
import {authApi} from '../auth/authApi';
import type {
  AuthResponse,
  RegisterResponse,
  GoogleAuthInput,
  LoginInput,
  OtpInput,
  RegisterInput,
  SendOtpInput,
  WorkoUser,
} from '../auth/types';
import {tokenStorage} from '../auth/tokenStorage';
import {
  getWorkoApiErrorMessage,
  workoApi,
} from '../api/apiClient';

type AuthStatus = 'hydrating' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: WorkoUser | null;
  error: string | null;
  initialize: () => Promise<void>;
  register: (input: RegisterInput) => Promise<RegisterResponse | null>;
  sendOtp: (input: SendOtpInput) => Promise<boolean>;
  verifyOtp: (input: OtpInput) => Promise<boolean>;
  login: (input: LoginInput) => Promise<boolean>;
  googleLogin: (input: GoogleAuthInput) => Promise<boolean>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  clearError: () => void;
}

const setAuthenticated = (set: (state: Partial<AuthState>) => void, response: AuthResponse) => {
  set({
    status: 'authenticated',
    user: response.user,
    error: null,
  });
};

export const useAuthStore = create<AuthState>(set => ({
  status: 'hydrating',
  user: null,
  error: null,

  initialize: async () => {
    set({status: 'hydrating', error: null});

    try {
      const tokens = await tokenStorage.load();

      if (!tokens) {
        set({status: 'unauthenticated', user: null});
        return;
      }

      const response = await workoApi.get<{user: WorkoUser}>('/auth/me');

      set({
        status: 'authenticated',
        user: response.data.user,
        error: null,
      });
    } catch {
      await tokenStorage.clear();
      set({
        status: 'unauthenticated',
        user: null,
        error: null,
      });
    }
  },

  register: async input => {
    set({error: null});

    try {
      return await authApi.register(input);
    } catch (error) {
      set({error: getWorkoApiErrorMessage(error)});
      return null;
    }
  },

  sendOtp: async input => {
    set({error: null});

    try {
      await authApi.sendOtp(input);
      return true;
    } catch (error) {
      set({error: getWorkoApiErrorMessage(error)});
      return false;
    }
  },

  verifyOtp: async input => {
    set({error: null});

    try {
      const response = await authApi.verifyOtp(input);
      await tokenStorage.save(response.tokens);
      setAuthenticated(set, response);
      return true;
    } catch (error) {
      set({error: getWorkoApiErrorMessage(error)});
      return false;
    }
  },

  login: async input => {
    set({error: null});

    try {
      const response = await authApi.login(input);
      await tokenStorage.save(response.tokens);
      setAuthenticated(set, response);
      return true;
    } catch (error) {
      set({error: getWorkoApiErrorMessage(error)});
      return false;
    }
  },

  googleLogin: async input => {
    set({error: null});

    try {
      const response = await authApi.google(input);
      await tokenStorage.save(response.tokens);
      setAuthenticated(set, response);
      return true;
    } catch (error) {
      set({error: getWorkoApiErrorMessage(error)});
      return false;
    }
  },

  logout: async () => {
    const refreshToken = tokenStorage.getRefreshToken();

    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Local session is still cleared if the server is unreachable.
    } finally {
      await tokenStorage.clear();
      set({status: 'unauthenticated', user: null, error: null});
    }
  },

  logoutAll: async () => {
    set({error: null});

    try {
      await workoApi.post('/auth/logout-all');
    } catch (error) {
      set({error: getWorkoApiErrorMessage(error)});
      return;
    }

    await tokenStorage.clear();
    set({status: 'unauthenticated', user: null, error: null});
  },

  clearError: () => set({error: null}),
}));

export const authSelectors = {
  isAuthenticated: (state: AuthState) => state.status === 'authenticated',
  isHydrating: (state: AuthState) => state.status === 'hydrating',
};
