import { AUTH_CONSTANTS } from './auth.constants';

describe('Auth security constants', () => {
  it('uses the hardened access and refresh token lifetimes', () => {
    expect(AUTH_CONSTANTS.accessTokenExpiresIn).toBe('15m');
    expect(AUTH_CONSTANTS.accessTokenExpiresInSeconds).toBe(15 * 60);
    expect(AUTH_CONSTANTS.refreshTokenExpiresInDays).toBe(30);
  });

  it('uses bounded OTP security settings', () => {
    expect(AUTH_CONSTANTS.otpExpiryMinutes).toBe(5);
    expect(AUTH_CONSTANTS.otpCooldownSeconds).toBe(60);
    expect(AUTH_CONSTANTS.maxOtpAttempts).toBe(5);
  });
});
