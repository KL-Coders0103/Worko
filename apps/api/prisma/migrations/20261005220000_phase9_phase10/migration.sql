CREATE TYPE "BookingPaymentStatus" AS ENUM ('HELD','RELEASED','REFUNDED','DISPUTED');
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT','DEBIT','COMMISSION','ADJUSTMENT');
CREATE TYPE "NotificationType" AS ENUM ('BOOKING','PAYMENT','CHAT','REVIEW','DISPUTE','SYSTEM');

CREATE TABLE "booking_payments" (
  "id" UUID NOT NULL,
  "booking_id" UUID NOT NULL,
  "gross_amount" DECIMAL(12,2) NOT NULL,
  "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 15,
  "commission_amount" DECIMAL(12,2) NOT NULL,
  "worker_amount" DECIMAL(12,2) NOT NULL,
  "status" "BookingPaymentStatus" NOT NULL DEFAULT 'HELD',
  "release_key" VARCHAR(180) NOT NULL,
  "released_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "booking_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "booking_payments_booking_id_key" UNIQUE ("booking_id"),
  CONSTRAINT "booking_payments_release_key_key" UNIQUE ("release_key"),
  CONSTRAINT "booking_payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "booking_payments_status_created_at_idx" ON "booking_payments"("status","created_at");

CREATE TABLE "wallets" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "currency" CHAR(3) NOT NULL DEFAULT 'INR',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "wallets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wallets_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "wallet_transactions" (
  "id" UUID NOT NULL,
  "wallet_id" UUID NOT NULL,
  "booking_id" UUID,
  "type" "WalletTransactionType" NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "balance_after" DECIMAL(14,2) NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "idempotency_key" VARCHAR(180) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wallet_transactions_idempotency_key_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "wallet_transactions_wallet_id_created_at_idx" ON "wallet_transactions"("wallet_id","created_at");
CREATE INDEX "wallet_transactions_booking_id_created_at_idx" ON "wallet_transactions"("booking_id","created_at");

CREATE TABLE "chat_messages" (
  "id" UUID NOT NULL,
  "booking_id" UUID NOT NULL,
  "sender_id" UUID NOT NULL,
  "content" VARCHAR(4000) NOT NULL,
  "attachment_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_messages_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "chat_messages_booking_id_created_at_idx" ON "chat_messages"("booking_id","created_at");

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "booking_id" UUID,
  "type" "NotificationType" NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "body" VARCHAR(1000) NOT NULL,
  "read_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notifications_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id","read_at","created_at");
CREATE INDEX "notifications_booking_id_created_at_idx" ON "notifications"("booking_id","created_at");

CREATE TABLE "disputes" (
  "id" UUID NOT NULL,
  "booking_id" UUID NOT NULL,
  "reporter_id" UUID NOT NULL,
  "reason" VARCHAR(120) NOT NULL,
  "description" VARCHAR(4000) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "disputes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "disputes_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "disputes_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "disputes_booking_id_created_at_idx" ON "disputes"("booking_id","created_at");
CREATE INDEX "disputes_reporter_id_status_created_at_idx" ON "disputes"("reporter_id","status","created_at");
