CREATE TABLE "reel_comments" (
    "id" UUID NOT NULL,
    "reel_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reel_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reel_comments_reel_id_created_at_idx" ON "reel_comments"("reel_id", "created_at");
ALTER TABLE "reel_comments" ADD CONSTRAINT "reel_comments_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reel_comments" ADD CONSTRAINT "reel_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
