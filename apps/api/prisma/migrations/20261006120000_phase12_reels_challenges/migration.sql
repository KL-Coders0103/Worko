-- Phase 12: reels publishing, analytics, categories and challenge participation
ALTER TABLE "reels" ADD COLUMN "category_id" UUID;
ALTER TABLE "reels" ADD COLUMN "view_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "reels" ADD COLUMN "like_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "reels" ADD COLUMN "share_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "reels" ADD COLUMN "duration_seconds" INTEGER;
ALTER TABLE "reels" ADD COLUMN "rejection_reason" VARCHAR(500);
ALTER TABLE "reels" ADD CONSTRAINT "reels_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "reels_category_id_moderationStatus_publishedAt_idx" ON "reels"("category_id","moderation_status","published_at");
CREATE TABLE "challenge_participations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "challenge_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "reel_id" UUID,
  "status" VARCHAR(30) NOT NULL DEFAULT 'JOINED',
  "points_awarded" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "challenge_participations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "challenge_participations_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "challenge_participations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "challenge_participations_challenge_id_user_id_key" ON "challenge_participations"("challenge_id","user_id");
CREATE INDEX "challenge_participations_user_id_created_at_idx" ON "challenge_participations"("user_id","created_at");
CREATE INDEX "challenge_participations_challenge_id_status_created_at_idx" ON "challenge_participations"("challenge_id","status","created_at");