ALTER TABLE "worker_profiles"
  ADD COLUMN "service_area_address" VARCHAR(500),
  ADD COLUMN "service_area_latitude" DECIMAL(10,7),
  ADD COLUMN "service_area_longitude" DECIMAL(10,7),
  ADD COLUMN "minimum_payment" DECIMAL(12,2),
  ADD COLUMN "work_schedule" JSONB;
