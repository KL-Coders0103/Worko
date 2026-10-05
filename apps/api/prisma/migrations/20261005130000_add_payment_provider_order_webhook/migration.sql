ALTER TABLE "requirement_payments"
ADD COLUMN "provider_order_id" VARCHAR(180);

CREATE UNIQUE INDEX "requirement_payments_provider_order_id_key"
ON "requirement_payments"("provider_order_id");

CREATE TABLE "payment_webhook_events" (
  "id" UUID NOT NULL,
  "event_id" VARCHAR(180) NOT NULL,
  "event_type" VARCHAR(120) NOT NULL,
  "payload" JSONB NOT NULL,
  "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_webhook_events_event_id_key"
ON "payment_webhook_events"("event_id");

CREATE INDEX "payment_webhook_events_event_type_received_at_idx"
ON "payment_webhook_events"("event_type", "received_at");
