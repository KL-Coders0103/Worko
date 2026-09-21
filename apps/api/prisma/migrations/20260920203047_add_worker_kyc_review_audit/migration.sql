-- CreateEnum
CREATE TYPE "KycReviewDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "WorkerKycReview" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "reviewerId" UUID NOT NULL,
    "decision" "KycReviewDecision",
    "rejectionReason" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerKycReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkerKycReview_workerId_idx" ON "WorkerKycReview"("workerId");

-- CreateIndex
CREATE INDEX "WorkerKycReview_reviewerId_idx" ON "WorkerKycReview"("reviewerId");

-- CreateIndex
CREATE INDEX "WorkerKycReview_decision_idx" ON "WorkerKycReview"("decision");

-- CreateIndex
CREATE INDEX "WorkerKycReview_createdAt_idx" ON "WorkerKycReview"("createdAt");

-- AddForeignKey
ALTER TABLE "WorkerKycReview" ADD CONSTRAINT "WorkerKycReview_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerKycReview" ADD CONSTRAINT "WorkerKycReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
