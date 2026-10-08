CREATE TYPE "public"."TaskApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REVISION_REQUESTED');

CREATE TYPE "public"."RecurrenceFrequency" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

CREATE TYPE "public"."MailDeliveryStatus" AS ENUM ('SKIPPED', 'SENT', 'FAILED');

ALTER TABLE "public"."Task"
  ADD COLUMN "assignedToId" TEXT,
  ADD COLUMN "approvalStatus" "public"."TaskApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "approvalNote" TEXT,
  ADD COLUMN "approvedById" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "recurrenceFrequency" "public"."RecurrenceFrequency" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "recurrenceInterval" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "recurrenceSourceTaskId" TEXT;

CREATE TABLE "public"."TaskAttachment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "mimeType" TEXT,
  "size" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."MailDelivery" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "taskId" TEXT,
  "recipients" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "public"."MailDeliveryStatus" NOT NULL DEFAULT 'SKIPPED',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Task_userId_assignedToId_idx" ON "public"."Task"("userId" ASC, "assignedToId" ASC);
CREATE INDEX "Task_userId_approvalStatus_idx" ON "public"."Task"("userId" ASC, "approvalStatus" ASC);
CREATE INDEX "Task_userId_recurrenceFrequency_idx" ON "public"."Task"("userId" ASC, "recurrenceFrequency" ASC);
CREATE INDEX "TaskAttachment_userId_taskId_idx" ON "public"."TaskAttachment"("userId" ASC, "taskId" ASC);
CREATE INDEX "MailDelivery_userId_createdAt_idx" ON "public"."MailDelivery"("userId" ASC, "createdAt" ASC);
CREATE INDEX "MailDelivery_taskId_createdAt_idx" ON "public"."MailDelivery"("taskId" ASC, "createdAt" ASC);
CREATE INDEX "MailDelivery_status_idx" ON "public"."MailDelivery"("status" ASC);

ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."TaskAttachment" ADD CONSTRAINT "TaskAttachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."TaskAttachment" ADD CONSTRAINT "TaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."MailDelivery" ADD CONSTRAINT "MailDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."MailDelivery" ADD CONSTRAINT "MailDelivery_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
