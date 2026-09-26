FROM node:22.22.3-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json

RUN npm ci

COPY apps/api ./apps/api

# Prisma config requires DATABASE_URL during client generation.
# This is build-time only; the real DATABASE_URL is provided at runtime.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

RUN npm run prisma:generate --workspace=apps/api
RUN npm run build --workspace=apps/api


FROM node:22.22.3-bookworm-slim AS production

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json

COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]