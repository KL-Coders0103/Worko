CREATE TYPE "MatchingRoundStatus" AS ENUM ('ACTIVE', 'COMPLETED');

CREATE TABLE "matching_rounds" (
  "id" UUID NOT NULL,
  "requirement_id" UUID NOT NULL,
  "round_number" INTEGER NOT NULL,
  "radius_km" INTEGER NOT NULL,
  "status" "MatchingRoundStatus" NOT NULL DEFAULT 'ACTIVE',
  "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "completed_at" TIMESTAMPTZ(3),
  CONSTRAINT "matching_rounds_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "matching_offers" ADD COLUMN "round_id" UUID;

CREATE UNIQUE INDEX "matching_rounds_requirement_id_round_number_key"
  ON "matching_rounds"("requirement_id", "round_number");

CREATE INDEX "matching_rounds_status_expires_at_idx"
  ON "matching_rounds"("status", "expires_at");

CREATE INDEX "matching_offers_round_id_idx"
  ON "matching_offers"("round_id");

ALTER TABLE "matching_rounds"
  ADD CONSTRAINT "matching_rounds_requirement_id_fkey"
  FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "matching_offers"
  ADD CONSTRAINT "matching_offers_round_id_fkey"
  FOREIGN KEY ("round_id") REFERENCES "matching_rounds"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
