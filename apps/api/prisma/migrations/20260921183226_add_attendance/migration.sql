-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('NOT_STARTED', 'CHECKED_IN', 'IN_PROGRESS', 'CHECKED_OUT', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AttendanceEventType" AS ENUM ('ARRIVED', 'CHECK_IN', 'CHECK_OUT');

-- CreateEnum
CREATE TYPE "AttendanceEvidenceType" AS ENUM ('BEFORE_PHOTO', 'AFTER_PHOTO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BookingStatus" ADD VALUE 'CONFIRMED';
ALTER TYPE "BookingStatus" ADD VALUE 'WORKER_EN_ROUTE';
ALTER TYPE "BookingStatus" ADD VALUE 'ARRIVED';
ALTER TYPE "BookingStatus" ADD VALUE 'CHECKED_IN';
ALTER TYPE "BookingStatus" ADD VALUE 'CHECKED_OUT';
ALTER TYPE "BookingStatus" ADD VALUE 'PAYMENT_RELEASED';

-- CreateTable
CREATE TABLE "Attendance" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "checkInLatitude" DECIMAL(10,7),
    "checkInLongitude" DECIMAL(10,7),
    "checkOutLatitude" DECIMAL(10,7),
    "checkOutLongitude" DECIMAL(10,7),
    "checkInAccuracyMeters" DECIMAL(8,2),
    "checkOutAccuracyMeters" DECIMAL(8,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceEvent" (
    "id" UUID NOT NULL,
    "attendanceId" UUID NOT NULL,
    "type" "AttendanceEventType" NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "accuracyMeters" DECIMAL(8,2),
    "qrVerified" BOOLEAN NOT NULL DEFAULT false,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceEvidence" (
    "id" UUID NOT NULL,
    "attendanceId" UUID NOT NULL,
    "type" "AttendanceEvidenceType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_bookingId_key" ON "Attendance"("bookingId");

-- CreateIndex
CREATE INDEX "Attendance_workerId_idx" ON "Attendance"("workerId");

-- CreateIndex
CREATE INDEX "Attendance_status_idx" ON "Attendance"("status");

-- CreateIndex
CREATE INDEX "Attendance_checkInAt_idx" ON "Attendance"("checkInAt");

-- CreateIndex
CREATE INDEX "Attendance_checkOutAt_idx" ON "Attendance"("checkOutAt");

-- CreateIndex
CREATE INDEX "AttendanceEvent_attendanceId_idx" ON "AttendanceEvent"("attendanceId");

-- CreateIndex
CREATE INDEX "AttendanceEvent_type_idx" ON "AttendanceEvent"("type");

-- CreateIndex
CREATE INDEX "AttendanceEvent_occurredAt_idx" ON "AttendanceEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "AttendanceEvidence_attendanceId_idx" ON "AttendanceEvidence"("attendanceId");

-- CreateIndex
CREATE INDEX "AttendanceEvidence_type_idx" ON "AttendanceEvidence"("type");

-- CreateIndex
CREATE INDEX "AttendanceEvidence_capturedAt_idx" ON "AttendanceEvidence"("capturedAt");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEvidence" ADD CONSTRAINT "AttendanceEvidence_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
