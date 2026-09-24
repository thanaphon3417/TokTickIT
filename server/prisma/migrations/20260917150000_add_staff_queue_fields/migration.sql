ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'RESOLVED';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CLOSED';

ALTER TABLE "Ticket" ADD COLUMN "itPriority" "RequestedPriority";
UPDATE "Ticket" SET "itPriority" = "requestedPriority" WHERE "itPriority" IS NULL;
ALTER TABLE "Ticket" ALTER COLUMN "itPriority" SET NOT NULL;
ALTER TABLE "Ticket" ALTER COLUMN "itPriority" SET DEFAULT 'MEDIUM';
ALTER TABLE "Ticket" ADD COLUMN "ownerId" INTEGER;

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Ticket_ownerId_currentStatus_idx" ON "Ticket"("ownerId", "currentStatus");
CREATE INDEX "Ticket_itPriority_idx" ON "Ticket"("itPriority");
