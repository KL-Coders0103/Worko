-- CreateTable
CREATE TABLE "WorkerCategory" (
    "workerId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerCategory_pkey" PRIMARY KEY ("workerId","categoryId")
);

-- CreateIndex
CREATE INDEX "WorkerCategory_categoryId_idx" ON "WorkerCategory"("categoryId");

-- AddForeignKey
ALTER TABLE "WorkerCategory" ADD CONSTRAINT "WorkerCategory_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerCategory" ADD CONSTRAINT "WorkerCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
