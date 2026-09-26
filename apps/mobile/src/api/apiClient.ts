import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import {API_BASE_URL, API_TIMEOUT_MS} from '../config/api';
import {authApi} from '../auth/authApi';
import {tokenStorage} from '../auth/tokenStorage';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _workoRetry?: boolean;
};

export interface WorkoApiError {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

let refreshPromise: Promise<string | null> | null = null;

export const createApiClient = () => axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(async config => {
  const accessToken = tokenStorage.getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = tokenStorage.getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    try {
      const tokens = await authApi.refresh(refreshToken);
      await tokenStorage.save(tokens);
      return tokens.accessToken;
    } catch {
      await tokenStorage.clear();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const axiosError = error as AxiosError;
    const originalRequest = axiosError.config as
      | RetryableRequestConfig
      | undefined;

    if (
      axiosError.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._workoRetry
    ) {
      return Promise.reject(error);
    }

    originalRequest._workoRetry = true;

    const accessToken = await refreshAccessToken();

    if (!accessToken) {
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${accessToken}`;

    return apiClient(originalRequest);
  },
);

export const workoApi = createApiClient();

export const getWorkoApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<WorkoApiError>(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }

    if (error.code === 'ECONNABORTED') {
      return 'The request timed out. Please try again.';
    }

    if (!error.response) {
      return 'Unable to reach Worko. Check your internet connection.';
    }
  }

  return 'Something went wrong. Please try again.';
};
