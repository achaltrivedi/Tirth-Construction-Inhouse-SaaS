-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "addedBy" TEXT;

-- CreateTable
CREATE TABLE "Deduction" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deduction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deduction_workerId_idx" ON "Deduction"("workerId");

-- CreateIndex
CREATE INDEX "Deduction_date_idx" ON "Deduction"("date");

-- CreateIndex
CREATE INDEX "Deduction_workerId_date_idx" ON "Deduction"("workerId", "date");

-- AddForeignKey
ALTER TABLE "Deduction" ADD CONSTRAINT "Deduction_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
