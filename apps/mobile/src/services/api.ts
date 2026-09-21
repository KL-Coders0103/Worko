import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

import {ENV} from '../config/env';
import {getTokens} from './authStorage';

export const api = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig,
  ) => {
    const tokens = await getTokens();

    if (tokens?.accessToken) {
      config.headers.Authorization =
        `Bearer ${tokens.accessToken}`;
    }

    /*
     * IMPORTANT:
     * Do not force application/json globally.
     *
     * Axios automatically sets the correct
     * multipart Content-Type + boundary when
     * FormData is used.
     */
    if (
      config.data instanceof FormData
    ) {
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] =
        'application/json';
    }

    return config;
  },
);

let isRefreshing = false;

type QueueItem = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

let failedQueue: QueueItem[] = [];

const processQueue = (
  error: unknown,
  token?: string,
): void => {
  failedQueue.forEach(
    ({resolve, reject}) => {
      if (error) {
        reject(error);
      } else if (token) {
        resolve(token);
      }
    },
  );

  failedQueue = [];
};

api.interceptors.response.use(
  response => response,

  async (error: AxiosError) => {
    const originalRequest =
      error.config as
        | (InternalAxiosRequestConfig & {
            _retry?: boolean;
          })
        | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes(
        '/auth/refresh',
      )
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise(
        (resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization =
                `Bearer ${token}`;

              resolve(api(originalRequest));
            },
            reject,
          });
        },
      );
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const tokens = await getTokens();

      if (!tokens?.refreshToken) {
        throw new Error(
          'No refresh token',
        );
      }

      const response = await axios.post(
        `${ENV.API_BASE_URL}/auth/refresh`,
        {
          refreshToken:
            tokens.refreshToken,
        },
        {
          headers: {
            'Content-Type':
              'application/json',
            Accept:
              'application/json',
          },
          timeout: 30000,
        },
      );

      const newTokens =
        response.data.tokens;

      const {saveTokens} =
        await import('./authStorage');

      await saveTokens(newTokens);

      processQueue(
        null,
        newTokens.accessToken,
      );

      originalRequest.headers.Authorization =
        `Bearer ${newTokens.accessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);

      return Promise.reject(
        refreshError,
      );
    } finally {
      isRefreshing = false;
    }
  },
);