import {useState} from 'react';

import {
  sendOtp,
  type OtpChannel,
} from '../../../services/authService';

import {getApiErrorMessage} from '../../../utils/apiError';

export function useLogin() {
  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const login = async (
    identifier: string,
    channel: OtpChannel,
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      await sendOtp(
        identifier.trim(),
        'LOGIN',
        channel,
      );
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        'Unable to send OTP. Please try again.',
      );

      setError(message);

      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    isLoading,
    error,
  };
}