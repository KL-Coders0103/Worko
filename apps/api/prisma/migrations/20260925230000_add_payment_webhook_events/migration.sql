-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" UUID NOT NULL,
    "eventId" VARCHAR(200) NOT NULL,
    "paymentId" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_eventId_key" ON "PaymentWebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_paymentId_idx" ON "PaymentWebhookEvent"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_createdAt_idx" ON "PaymentWebhookEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
