import {useEffect, useState} from 'react';

import {
  sendOtp,
  type OtpChannel,
  type OtpPurpose,
} from '../../../services/authService';

import {getApiErrorMessage} from '../../../utils/apiError';

const RESEND_COOLDOWN_SECONDS = 60;

export function useResendOtp() {
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldown(previous => {
        if (previous <= 1) {
          clearInterval(timer);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const resend = async (
    identifier: string,
    purpose: OtpPurpose,
    channel: OtpChannel,
  ) => {
    if (cooldown > 0 || isResending) {
      return;
    }

    try {
      setIsResending(true);
      setError(null);
      setMessage(null);

      await sendOtp(
        identifier.trim(),
        purpose,
        channel,
      );

      setMessage('A new verification code has been sent.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      const apiMessage = getApiErrorMessage(
        error,
        'Unable to resend OTP. Please try again.',
      );

      setError(apiMessage);
      throw new Error(apiMessage);
    } finally {
      setIsResending(false);
    }
  };

  return {
    resend,
    isResending,
    error,
    message,
    cooldown,
  };
}