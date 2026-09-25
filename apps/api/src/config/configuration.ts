export function parseCorsOrigins(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}

export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
    trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
    swaggerEnabled: parseBoolean(
      process.env.SWAGGER_ENABLED,
      process.env.NODE_ENV !== 'production',
    ),
  },

  auth: {
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
    otpHashSecret: process.env.OTP_HASH_SECRET,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    googleEmail: process.env.GOOGLE_EMAIL,
    googleOAuthRedirectUri:
      process.env.GOOGLE_OAUTH_REDIRECT_URI,
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  payments: {
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
    demoEnabled: process.env.PAYMENT_DEMO_ENABLED === 'true',
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER ?? 'cloudinary',
    cloudinaryCloudName:
      process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey:
      process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret:
      process.env.CLOUDINARY_API_SECRET,
  },
});
