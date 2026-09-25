import { Logger } from '@nestjs/common';

const TRUE_VALUES = new Set(['true', '1', 'yes']);
const FALSE_VALUES = new Set(['false', '0', 'no']);

function requireValue(
  env: Record<string, unknown>,
  key: string,
): string {
  const value = env[key];

  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value.trim();
}

function optionalValue(
  env: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = env[key];

  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`Environment variable ${key} must be a string`);
  }

  return value.trim();
}

function parsePort(env: Record<string, unknown>): number {
  const raw = optionalValue(env, 'PORT') ?? '3000';
  const port = Number(raw);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return port;
}

function parseBoolean(
  env: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const value = optionalValue(env, key);

  if (value === undefined) {
    return fallback;
  }

  const normalized = value.toLowerCase();

  if (TRUE_VALUES.has(normalized)) {
    if (env.NODE_ENV === 'production' && !env.PAYMENT_WEBHOOK_SECRET) {
    throw new Error('PAYMENT_WEBHOOK_SECRET is required in production');
  }

  if (env.PAYMENT_WEBHOOK_SECRET && env.PAYMENT_WEBHOOK_SECRET.length < 32) {
    throw new Error('PAYMENT_WEBHOOK_SECRET must be at least 32 characters');
  }

  return true;
  }

  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  throw new Error(`${key} must be a boolean value`);
}

function validateProduction(
  env: Record<string, unknown>,
): void {
  requireValue(env, 'CORS_ORIGINS');
  requireValue(env, 'GOOGLE_CLIENT_ID');
  requireValue(env, 'GOOGLE_CLIENT_SECRET');
  requireValue(env, 'GOOGLE_REFRESH_TOKEN');
  requireValue(env, 'GOOGLE_EMAIL');
  requireValue(env, 'GOOGLE_OAUTH_REDIRECT_URI');
  requireValue(env, 'CLOUDINARY_CLOUD_NAME');
  requireValue(env, 'CLOUDINARY_API_KEY');
  requireValue(env, 'CLOUDINARY_API_SECRET');
}

export function validateEnv(
  env: Record<string, unknown>,
): Record<string, unknown> {
  const nodeEnv =
    optionalValue(env, 'NODE_ENV') ?? 'development';

  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error(
      'NODE_ENV must be development, test, or production',
    );
  }

  const databaseUrl = requireValue(env, 'DATABASE_URL');
  const jwtAccessSecret = requireValue(
    env,
    'JWT_ACCESS_SECRET',
  );
  const otpHashSecret = requireValue(
    env,
    'OTP_HASH_SECRET',
  );

  if (jwtAccessSecret.length < 32) {
    throw new Error(
      'JWT_ACCESS_SECRET must be at least 32 characters',
    );
  }

  if (otpHashSecret.length < 32) {
    throw new Error(
      'OTP_HASH_SECRET must be at least 32 characters',
    );
  }

  parsePort(env);
  parseBoolean(env, 'TRUST_PROXY', false);
  parseBoolean(
    env,
    'SWAGGER_ENABLED',
    nodeEnv !== 'production',
  );

  if (nodeEnv === 'production') {
    validateProduction(env);
  }

  const storageProvider =
    optionalValue(env, 'STORAGE_PROVIDER') ?? 'cloudinary';

  if (storageProvider !== 'cloudinary') {
    throw new Error(
      'STORAGE_PROVIDER must be cloudinary because the API currently uses CloudinaryStorageService',
    );
  }

  if (nodeEnv !== 'test') {
    new Logger('Config').log(
      `Environment configuration validated for ${nodeEnv}`,
    );
  }

  return {
    ...env,
    NODE_ENV: nodeEnv,
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: jwtAccessSecret,
    OTP_HASH_SECRET: otpHashSecret,
    STORAGE_PROVIDER: storageProvider,
  };
}
