-- Persist client onboarding profile and selected service location.
CREATE TABLE "client_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "full_name" VARCHAR(160) NOT NULL,
    "date_of_birth" DATE,
    "gender" VARCHAR(40),
    "photo_url" VARCHAR(2048),
    "address" VARCHAR(500),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "client_profiles_user_id_key" ON "client_profiles"("user_id");
CREATE INDEX "client_profiles_latitude_longitude_idx" ON "client_profiles"("latitude", "longitude");
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
