import {useState} from 'react';

import {
  registerUser,
  type RegisterPayload,
} from '../../../services/authService';

import {getApiErrorMessage} from '../../../utils/apiError';

export function useRegister() {
  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const register = async (
    payload: RegisterPayload,
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      return await registerUser(payload);
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        'Unable to create your account. Please try again.',
      );

      setError(message);

      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    register,
    isLoading,
    error,
  };
}