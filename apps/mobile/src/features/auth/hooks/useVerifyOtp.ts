import {useState} from 'react';

import {
  verifyOtp,
  type VerifyOtpPayload,
} from '../../../services/authService';

import {useAuth} from '../../../context/AuthContext';
import {getApiErrorMessage} from '../../../utils/apiError';

export function useVerifyOtp() {
  const {setAuthenticatedUser} = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async (payload: VerifyOtpPayload) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await verifyOtp(payload);

      setAuthenticatedUser(response.user);

      return response;
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        'Unable to verify OTP. Please try again.',
      );

      setError(message);

      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    verify,
    isLoading,
    error,
  };
}