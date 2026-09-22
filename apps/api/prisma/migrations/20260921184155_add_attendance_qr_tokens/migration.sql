-- CreateEnum
CREATE TYPE "AttendanceQrPurpose" AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- CreateTable
CREATE TABLE "AttendanceQrToken" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "purpose" "AttendanceQrPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceQrToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceQrToken_tokenHash_key" ON "AttendanceQrToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AttendanceQrToken_bookingId_idx" ON "AttendanceQrToken"("bookingId");

-- CreateIndex
CREATE INDEX "AttendanceQrToken_bookingId_purpose_idx" ON "AttendanceQrToken"("bookingId", "purpose");

-- CreateIndex
CREATE INDEX "AttendanceQrToken_expiresAt_idx" ON "AttendanceQrToken"("expiresAt");

-- CreateIndex
CREATE INDEX "AttendanceQrToken_usedAt_idx" ON "AttendanceQrToken"("usedAt");

-- AddForeignKey
ALTER TABLE "AttendanceQrToken" ADD CONSTRAINT "AttendanceQrToken_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
