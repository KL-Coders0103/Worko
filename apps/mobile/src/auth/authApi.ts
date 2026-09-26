import axios from 'axios';
import {API_BASE_URL, API_TIMEOUT_MS} from '../config/api';
import type {
  AuthResponse,
  GoogleAuthInput,
  LoginInput,
  OtpInput,
  RegisterInput,
  SendOtpInput,
} from './types';

const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export const authApi = {
  async register(input: RegisterInput) {
    const response = await authClient.post<AuthResponse | {message: string}>(
      '/auth/register',
      input,
    );

    return response.data;
  },

  async sendOtp(input: SendOtpInput) {
    const response = await authClient.post<{message: string}>(
      '/auth/send-otp',
      input,
    );

    return response.data;
  },

  async verifyOtp(input: OtpInput): Promise<AuthResponse> {
    const response = await authClient.post<AuthResponse>(
      '/auth/verify-otp',
      input,
    );

    return response.data;
  },

  async login(input: LoginInput): Promise<AuthResponse> {
    const response = await authClient.post<AuthResponse>(
      '/auth/login',
      input,
    );

    return response.data;
  },

  async refresh(refreshToken: string) {
    const response = await authClient.post<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>('/auth/refresh', {refreshToken});

    return response.data;
  },

  async logout(refreshToken: string) {
    await authClient.post('/auth/logout', {refreshToken});
  },

  async google(input: GoogleAuthInput): Promise<AuthResponse> {
    const response = await authClient.post<AuthResponse>(
      '/auth/google',
      input,
    );

    return response.data;
  },
};
