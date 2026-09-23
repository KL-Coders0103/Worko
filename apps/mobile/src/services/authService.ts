import {api} from './api';

import {
  clearTokens,
  getTokens,
  saveTokens,
} from './authStorage';

export type RegisterPayload = {
  firstName: string;
  lastName?: string;
  email: string;
  phoneNumber: string;
  role: 'CLIENT' | 'WORKER';
};

export type RegisterResponse = {
  message: string;

  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
    role: string;
    status: string;
  };
};

export type OtpChannel = 'EMAIL' | 'SMS';

export type VerifyOtpPayload = {
  identifier: string;
  otp: string;
  purpose: 'REGISTRATION' | 'LOGIN';
  channel: OtpChannel;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type VerifyOtpResponse = {
  message: string;
  user: RegisterResponse['user'];
  tokens: AuthTokens;
};

export type CurrentUserResponse = {
  user: RegisterResponse['user'];
};

export async function registerUser(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  const response =
    await api.post<RegisterResponse>(
      '/auth/register',
      payload,
    );

  return response.data;
}

export async function verifyOtp(
  payload: VerifyOtpPayload,
): Promise<VerifyOtpResponse> {
  const response =
    await api.post<VerifyOtpResponse>(
      '/auth/verify-otp',
      payload,
    );

  await saveTokens(response.data.tokens);

  return response.data;
}

export async function refreshAccessToken(): Promise<string> {
  const tokens = await getTokens();

  if (!tokens?.refreshToken) {
    throw new Error(
      'No refresh token available',
    );
  }

  const response = await api.post(
    '/auth/refresh',
    {
      refreshToken: tokens.refreshToken,
    },
  );

  await saveTokens(response.data.tokens);

  return response.data.tokens.accessToken;
}

export async function logoutUser(): Promise<void> {
  const tokens = await getTokens();

  try {
    if (tokens?.refreshToken) {
      await api.post('/auth/logout', {
        refreshToken: tokens.refreshToken,
      });
    }
  } finally {
    await clearTokens();
  }
}

export async function sendLoginOtp(
  identifier: string,
  channel: OtpChannel,
): Promise<void> {
  await api.post('/auth/send-otp', {
    identifier,
    purpose: 'LOGIN',
    channel,
  });
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  const response =
    await api.get<CurrentUserResponse>(
      '/auth/me',
    );

  return response.data;
}