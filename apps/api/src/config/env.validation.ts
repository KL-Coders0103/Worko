import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),

  PORT: Joi.number().port().default(3000),

  CORS_ORIGINS: Joi.string().default('http://localhost:8081'),

  API_PREFIX: Joi.string().default('api/v1'),
});
