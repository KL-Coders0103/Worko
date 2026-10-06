import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),

  PORT: Joi.number().port().default(3000),

  CORS_ORIGINS: Joi.string().default('http://localhost:8081'),

  API_PREFIX: Joi.string().default('api/v1'),

  REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).default('redis://127.0.0.1:16379'),

  FIREBASE_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  FIREBASE_PROJECT_ID: Joi.string().trim().allow('').default(''),
  FIREBASE_CLIENT_EMAIL: Joi.string().trim().allow('').default(''),
  FIREBASE_PRIVATE_KEY: Joi.string().allow('').default(''),

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

  SUPABASE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().trim().required(),
  SUPABASE_STORAGE_BUCKET: Joi.string().trim().min(1).max(100).default('worko-media'),

  RAZORPAY_KEY_ID: Joi.string().trim().allow('').default(''),
  RAZORPAY_KEY_SECRET: Joi.string().trim().allow('').default(''),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().trim().allow('').default(''),
  WORKO_TEST_PAYMENT_AMOUNT: Joi.number().positive().max(10000000).allow('').optional(),
  WORKO_DUMMY_PAYMENTS: Joi.boolean().truthy('true').falsy('false').default(false),
});
