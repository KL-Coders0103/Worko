-- CreateEnum
CREATE TYPE "ReelStatus" AS ENUM ('DRAFT', 'PROCESSING', 'PUBLISHED', 'REJECTED', 'DELETED');

-- CreateTable
CREATE TABLE "Reel" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "status" "ReelStatus" NOT NULL DEFAULT 'DRAFT',
    "title" VARCHAR(150),
    "description" TEXT,
    "videoKey" TEXT NOT NULL,
    "thumbnailKey" TEXT,
    "durationSeconds" INTEGER,
    "fileSizeBytes" BIGINT,
    "mimeType" VARCHAR(100) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reel_workerId_idx" ON "Reel"("workerId");

-- CreateIndex
CREATE INDEX "Reel_workerId_status_idx" ON "Reel"("workerId", "status");

-- CreateIndex
CREATE INDEX "Reel_status_idx" ON "Reel"("status");

-- CreateIndex
CREATE INDEX "Reel_publishedAt_idx" ON "Reel"("publishedAt");

-- CreateIndex
CREATE INDEX "Reel_createdAt_idx" ON "Reel"("createdAt");

-- AddForeignKey
ALTER TABLE "Reel" ADD CONSTRAINT "Reel_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
