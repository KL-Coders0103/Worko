-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "categoryId" UUID,
    "categoryName" TEXT,
    "skillId" UUID,
    "skillName" TEXT,
    "serviceTitle" VARCHAR(150) NOT NULL,
    "serviceDescription" TEXT,
    "hourlyRate" DECIMAL(10,2),
    "dailyRate" DECIMAL(10,2),
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" UUID,
    "cancellationReason" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Booking_clientId_idx" ON "Booking"("clientId");

-- CreateIndex
CREATE INDEX "Booking_workerId_idx" ON "Booking"("workerId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_scheduledStart_idx" ON "Booking"("scheduledStart");

-- CreateIndex
CREATE INDEX "Booking_scheduledEnd_idx" ON "Booking"("scheduledEnd");

-- CreateIndex
CREATE INDEX "Booking_createdAt_idx" ON "Booking"("createdAt");

-- CreateIndex
CREATE INDEX "Booking_workerId_status_idx" ON "Booking"("workerId", "status");

-- CreateIndex
CREATE INDEX "Booking_clientId_status_idx" ON "Booking"("clientId", "status");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
