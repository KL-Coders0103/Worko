-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('OPEN', 'MATCHING', 'MATCHED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RequirementAssignmentStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Requirement" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "categoryName" TEXT NOT NULL,
    "skillId" UUID,
    "skillName" TEXT,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "budget" DECIMAL(12,2),
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "status" "RequirementStatus" NOT NULL DEFAULT 'OPEN',
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementAssignment" (
    "id" UUID NOT NULL,
    "requirementId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "status" "RequirementAssignmentStatus" NOT NULL DEFAULT 'OFFERED',
    "matchScore" DECIMAL(8,2),
    "distanceKm" DECIMAL(8,2),
    "respondedAt" TIMESTAMP(3),
    "responseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementAssignment_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "requirementId" UUID;

-- CreateIndex
CREATE INDEX "Requirement_clientId_status_idx" ON "Requirement"("clientId", "status");
CREATE INDEX "Requirement_categoryId_status_idx" ON "Requirement"("categoryId", "status");
CREATE INDEX "Requirement_skillId_status_idx" ON "Requirement"("skillId", "status");
CREATE INDEX "Requirement_status_idx" ON "Requirement"("status");
CREATE INDEX "Requirement_scheduledStart_idx" ON "Requirement"("scheduledStart");
CREATE INDEX "Requirement_scheduledEnd_idx" ON "Requirement"("scheduledEnd");
CREATE INDEX "Requirement_createdAt_idx" ON "Requirement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementAssignment_requirementId_workerId_key" ON "RequirementAssignment"("requirementId", "workerId");
CREATE INDEX "RequirementAssignment_workerId_status_idx" ON "RequirementAssignment"("workerId", "status");
CREATE INDEX "RequirementAssignment_requirementId_status_idx" ON "RequirementAssignment"("requirementId", "status");
CREATE INDEX "RequirementAssignment_status_idx" ON "RequirementAssignment"("status");
CREATE INDEX "RequirementAssignment_createdAt_idx" ON "RequirementAssignment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_requirementId_key" ON "Booking"("requirementId");

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementAssignment" ADD CONSTRAINT "RequirementAssignment_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementAssignment" ADD CONSTRAINT "RequirementAssignment_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
