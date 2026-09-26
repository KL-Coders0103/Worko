export type AppEnvironment = 'development' | 'production';

export const APP_ENVIRONMENT: AppEnvironment = __DEV__
  ? 'development'
  : 'production';

export const APP_CONFIG = {
  environment: APP_ENVIRONMENT,
  apiBaseUrl: 'https://worko-api-xyxj.onrender.com/api/v1',
  apiTimeoutMs: 15_000,
} as const;
