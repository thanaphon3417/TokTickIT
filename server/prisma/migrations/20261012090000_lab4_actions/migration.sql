ALTER TABLE "Ticket" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Ticket" ADD COLUMN "resolutionReason" TEXT;

CREATE TYPE "TicketActionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "TicketAction" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "actionDateTime" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "result" TEXT,
    "performedById" INTEGER NOT NULL,
    "assigneeId" INTEGER,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNote" TEXT,
    "attachmentNotes" TEXT,
    "status" "TicketActionStatus" NOT NULL DEFAULT 'PLANNED',
    "idempotencyKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TicketAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TicketAction_performedById_idempotencyKey_key" ON "TicketAction"("performedById", "idempotencyKey");
CREATE INDEX "TicketAction_ticketId_actionDateTime_id_idx" ON "TicketAction"("ticketId", "actionDateTime", "id");
CREATE INDEX "TicketAction_assigneeId_status_idx" ON "TicketAction"("assigneeId", "status");

ALTER TABLE "TicketAction" ADD CONSTRAINT "TicketAction_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketAction" ADD CONSTRAINT "TicketAction_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketAction" ADD CONSTRAINT "TicketAction_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
