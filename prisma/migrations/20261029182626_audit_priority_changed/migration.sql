-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'PRIORITY_CHANGED';

-- CreateIndex
CREATE INDEX "Complaint_priority_idx" ON "Complaint"("priority");
