export const AUTH_CONSTANTS = {
  accessTokenExpiresIn: '15m',
  accessTokenExpiresInSeconds: 15 * 60,
  refreshTokenExpiresInDays: 30,
  otpExpiryMinutes: 5,
  otpCooldownSeconds: 60,
  maxOtpAttempts: 5,
} as const;
