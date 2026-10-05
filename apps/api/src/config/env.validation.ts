import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),

  PORT: Joi.number().port().default(3000),

  CORS_ORIGINS: Joi.string().default('http://localhost:8081'),

  API_PREFIX: Joi.string().default('api/v1'),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),

  JWT_ACCESS_TTL: Joi.string().default('15m'),

  JWT_REFRESH_TTL_DAYS: Joi.number()
    .integer()
    .min(1)
    .max(90)
    .default(30),

  AUTH_OTP_SECRET: Joi.string().min(32).required(),

  AUTH_OTP_TTL_MINUTES: Joi.number()
    .integer()
    .min(1)
    .max(15)
    .default(5),

  AUTH_OTP_COOLDOWN_SECONDS: Joi.number()
    .integer()
    .min(30)
    .default(60),

  AUTH_OTP_MAX_ATTEMPTS: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .default(5),

  R2_ACCOUNT_ID: Joi.string().trim().required(),
  R2_ACCESS_KEY_ID: Joi.string().trim().required(),
  R2_SECRET_ACCESS_KEY: Joi.string().trim().required(),
  R2_BUCKET_NAME: Joi.string().trim().min(3).max(64).required(),
  R2_PUBLIC_BASE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
});
