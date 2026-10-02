# Prisma workflow

1. Set `DATABASE_URL` in your local `.env` to the PostgreSQL connection string.
2. Run `npm install` from the repository root.
3. Generate client: `npm run db:generate -w apps/api`.
4. Apply the initial migration: `npm run db:migrate -w apps/api`.
5. Validate schema: `npm run db:validate -w apps/api`.

Use `db:deploy` in deployment environments. Never run `migrate dev` against production.
