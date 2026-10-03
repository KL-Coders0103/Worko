CREATE TABLE "requirement_drafts" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "requirement_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "requirement_drafts_client_id_key" ON "requirement_drafts"("client_id");
CREATE INDEX "requirement_drafts_updated_at_idx" ON "requirement_drafts"("updated_at");

ALTER TABLE "requirement_drafts"
ADD CONSTRAINT "requirement_drafts_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
