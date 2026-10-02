-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'WORKER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "WorkerVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkerAvailabilityStatus" AS ENUM ('OFFLINE', 'AVAILABLE', 'BUSY');

-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('DRAFT', 'PAYMENT_PENDING', 'OPEN', 'MATCHING', 'MATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ReelModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "EngagementType" AS ENUM ('VIEW', 'SAVE', 'REPORT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320),
    "phone" VARCHAR(20),
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "verification_status" "WorkerVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "availability_status" "WorkerAvailabilityStatus" NOT NULL DEFAULT 'OFFLINE',
    "preferred_radius_km" DECIMAL(6,2) NOT NULL DEFAULT 10,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "worker_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_categories" (
    "worker_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_categories_pkey" PRIMARY KEY ("worker_id","category_id")
);

-- CreateTable
CREATE TABLE "requirements" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RequirementStatus" NOT NULL DEFAULT 'DRAFT',
    "budget" DECIMAL(12,2),
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "scheduled_at" TIMESTAMPTZ(3),
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matching_offers" (
    "id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "offered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "responded_at" TIMESTAMPTZ(3),

    CONSTRAINT "matching_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_payments" (
    "id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "provider_reference" VARCHAR(180),
    "idempotency_key" VARCHAR(180) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "requirement_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "requirement_payment_id" UUID NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "provider_reference" VARCHAR(180),
    "idempotency_key" VARCHAR(180) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(2000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reels" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "media_url" VARCHAR(2048) NOT NULL,
    "caption" VARCHAR(2200),
    "moderation_status" "ReelModerationStatus" NOT NULL DEFAULT 'PENDING',
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reel_engagements" (
    "id" UUID NOT NULL,
    "reel_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "EngagementType" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reel_engagements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "worker_profiles_user_id_key" ON "worker_profiles"("user_id");

-- CreateIndex
CREATE INDEX "worker_profiles_verification_status_availability_status_idx" ON "worker_profiles"("verification_status", "availability_status");

-- CreateIndex
CREATE INDEX "worker_profiles_latitude_longitude_idx" ON "worker_profiles"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_is_active_name_idx" ON "categories"("is_active", "name");

-- CreateIndex
CREATE INDEX "worker_categories_category_id_worker_id_idx" ON "worker_categories"("category_id", "worker_id");

-- CreateIndex
CREATE INDEX "requirements_client_id_created_at_idx" ON "requirements"("client_id", "created_at");

-- CreateIndex
CREATE INDEX "requirements_status_category_id_created_at_idx" ON "requirements"("status", "category_id", "created_at");

-- CreateIndex
CREATE INDEX "requirements_status_scheduled_at_idx" ON "requirements"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "matching_offers_worker_id_status_expires_at_idx" ON "matching_offers"("worker_id", "status", "expires_at");

-- CreateIndex
CREATE INDEX "matching_offers_requirement_id_status_offered_at_idx" ON "matching_offers"("requirement_id", "status", "offered_at");

-- CreateIndex
CREATE UNIQUE INDEX "matching_offers_requirement_id_worker_id_key" ON "matching_offers"("requirement_id", "worker_id");

-- CreateIndex
CREATE UNIQUE INDEX "requirement_payments_requirement_id_key" ON "requirement_payments"("requirement_id");

-- CreateIndex
CREATE UNIQUE INDEX "requirement_payments_provider_reference_key" ON "requirement_payments"("provider_reference");

-- CreateIndex
CREATE UNIQUE INDEX "requirement_payments_idempotency_key_key" ON "requirement_payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "requirement_payments_status_created_at_idx" ON "requirement_payments"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_requirement_id_key" ON "bookings"("requirement_id");

-- CreateIndex
CREATE INDEX "bookings_client_id_status_created_at_idx" ON "bookings"("client_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "bookings_worker_id_status_created_at_idx" ON "bookings"("worker_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "booking_status_history_booking_id_created_at_idx" ON "booking_status_history"("booking_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_provider_reference_key" ON "payment_transactions"("provider_reference");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_idempotency_key_key" ON "payment_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "payment_transactions_requirement_payment_id_created_at_idx" ON "payment_transactions"("requirement_payment_id", "created_at");

-- CreateIndex
CREATE INDEX "payment_transactions_status_created_at_idx" ON "payment_transactions"("status", "created_at");

-- CreateIndex
CREATE INDEX "reviews_target_id_created_at_idx" ON "reviews"("target_id", "created_at");

-- CreateIndex
CREATE INDEX "reviews_booking_id_idx" ON "reviews"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_booking_id_author_id_key" ON "reviews"("booking_id", "author_id");

-- CreateIndex
CREATE INDEX "reels_moderation_status_published_at_idx" ON "reels"("moderation_status", "published_at");

-- CreateIndex
CREATE INDEX "reels_creator_id_created_at_idx" ON "reels"("creator_id", "created_at");

-- CreateIndex
CREATE INDEX "reel_engagements_user_id_type_created_at_idx" ON "reel_engagements"("user_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "reel_engagements_reel_id_type_created_at_idx" ON "reel_engagements"("reel_id", "type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reel_engagements_reel_id_user_id_type_key" ON "reel_engagements"("reel_id", "user_id", "type");

-- AddForeignKey
ALTER TABLE "worker_profiles" ADD CONSTRAINT "worker_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_categories" ADD CONSTRAINT "worker_categories_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "worker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_categories" ADD CONSTRAINT "worker_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matching_offers" ADD CONSTRAINT "matching_offers_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matching_offers" ADD CONSTRAINT "matching_offers_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "worker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_payments" ADD CONSTRAINT "requirement_payments_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "worker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_requirement_payment_id_fkey" FOREIGN KEY ("requirement_payment_id") REFERENCES "requirement_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reels" ADD CONSTRAINT "reels_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_engagements" ADD CONSTRAINT "reel_engagements_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_engagements" ADD CONSTRAINT "reel_engagements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
