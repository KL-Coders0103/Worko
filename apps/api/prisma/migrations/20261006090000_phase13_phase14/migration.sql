-- Phase 13-14 admin, notification, support and retention foundation
ALTER TABLE "users" ADD COLUMN "deactivated_at" TIMESTAMPTZ(3);
ALTER TABLE "users" ADD COLUMN "deletion_requested_at" TIMESTAMPTZ(3);
ALTER TABLE "users" ADD COLUMN "deletion_scheduled_at" TIMESTAMPTZ(3);

CREATE TABLE "notification_preferences" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "user_id" UUID NOT NULL,
 "push_enabled" BOOLEAN NOT NULL DEFAULT true,
 "booking_enabled" BOOLEAN NOT NULL DEFAULT true,
 "payment_enabled" BOOLEAN NOT NULL DEFAULT true,
 "chat_enabled" BOOLEAN NOT NULL DEFAULT true,
 "review_enabled" BOOLEAN NOT NULL DEFAULT true,
 "dispute_enabled" BOOLEAN NOT NULL DEFAULT true,
 "system_enabled" BOOLEAN NOT NULL DEFAULT true,
 "quiet_hours_start" VARCHAR(5),
 "quiet_hours_end" VARCHAR(5),
 "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "notification_preferences_user_id_key" UNIQUE ("user_id")
);
CREATE TABLE "push_devices" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "user_id" UUID NOT NULL,
 "token" VARCHAR(1000) NOT NULL,
 "platform" VARCHAR(20) NOT NULL,
 "enabled" BOOLEAN NOT NULL DEFAULT true,
 "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "push_devices_token_key" UNIQUE ("token")
);
CREATE TABLE "notification_deliveries" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "notification_id" UUID NOT NULL,
 "user_id" UUID NOT NULL,
 "channel" VARCHAR(20) NOT NULL,
 "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
 "attempt_count" INTEGER NOT NULL DEFAULT 0,
 "next_attempt_at" TIMESTAMPTZ(3),
 "last_error" VARCHAR(1000),
 "dedupe_key" VARCHAR(255) NOT NULL,
 "delivered_at" TIMESTAMPTZ(3),
 "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "notification_deliveries_dedupe_key_key" UNIQUE ("dedupe_key")
);
CREATE TABLE "support_tickets" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "user_id" UUID NOT NULL,
 "subject" VARCHAR(180) NOT NULL,
 "description" VARCHAR(4000) NOT NULL,
 "category" VARCHAR(80) NOT NULL,
 "priority" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
 "status" VARCHAR(30) NOT NULL DEFAULT 'OPEN',
 "resolution" VARCHAR(4000),
 "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "audit_logs" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "actor_id" UUID,
 "action" VARCHAR(160) NOT NULL,
 "entity_type" VARCHAR(80) NOT NULL,
 "entity_id" UUID,
 "metadata" JSONB,
 "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "safety_alerts" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "reporter_id" UUID NOT NULL,
 "booking_id" UUID,
 "severity" VARCHAR(20) NOT NULL DEFAULT 'HIGH',
 "type" VARCHAR(80) NOT NULL,
 "message" VARCHAR(2000) NOT NULL,
 "status" VARCHAR(30) NOT NULL DEFAULT 'OPEN',
 "resolved_at" TIMESTAMPTZ(3),
 "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "safety_alerts_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "challenges" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "title" VARCHAR(180) NOT NULL,
 "description" VARCHAR(2000) NOT NULL,
 "reward_points" INTEGER NOT NULL DEFAULT 0,
 "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
 "starts_at" TIMESTAMPTZ(3),
 "ends_at" TIMESTAMPTZ(3),
 "created_by_id" UUID,
 "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "system_config" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "key" VARCHAR(120) NOT NULL,
 "value" JSONB NOT NULL,
 "description" VARCHAR(500),
 "updated_by" UUID,
 "updated_at" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "system_config_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "system_config_key_key" UNIQUE ("key")
);

CREATE INDEX "push_devices_user_id_enabled_idx" ON "push_devices"("user_id","enabled");
CREATE INDEX "notification_deliveries_status_next_attempt_at_idx" ON "notification_deliveries"("status","next_attempt_at");
CREATE INDEX "notification_deliveries_user_id_created_at_idx" ON "notification_deliveries"("user_id","created_at");
CREATE INDEX "support_tickets_user_id_status_created_at_idx" ON "support_tickets"("user_id","status","created_at");
CREATE INDEX "support_tickets_status_priority_created_at_idx" ON "support_tickets"("status","priority","created_at");
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id","created_at");
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type","entity_id","created_at");
CREATE INDEX "safety_alerts_status_severity_created_at_idx" ON "safety_alerts"("status","severity","created_at");
CREATE INDEX "safety_alerts_reporter_id_created_at_idx" ON "safety_alerts"("reporter_id","created_at");
CREATE INDEX "challenges_status_starts_at_ends_at_idx" ON "challenges"("status","starts_at","ends_at");

ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "safety_alerts" ADD CONSTRAINT "safety_alerts_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_alerts" ADD CONSTRAINT "safety_alerts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
