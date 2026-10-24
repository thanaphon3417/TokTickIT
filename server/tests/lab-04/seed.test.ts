import { describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 4 representative seed", () => {
  it("contains seeded zero, one, and multiple action examples and action states", async () => {
    const prisma = getPrisma();
    const demoTickets = await prisma.ticket.findMany({
      where: { ticketNumber: { in: ["TKT-2026-900001", "TKT-2026-900002", "TKT-2026-900003"] } },
      include: { actions: { select: { id: true, status: true, assigneeId: true, performedById: true } } },
    });
    expect(demoTickets).toHaveLength(3);
    const counts = demoTickets.map((ticket) => ticket.actions.length).sort();
    expect(counts).toEqual([0, 1, 2]);
    const statuses = new Set(demoTickets.flatMap((ticket) => ticket.actions.map((action) => action.status)));
    expect(statuses).toEqual(new Set(["PLANNED", "IN_PROGRESS", "COMPLETED"]));
    expect(demoTickets.flatMap((ticket) => ticket.actions).every((action) => action.performedById > 0)).toBe(true);
  });
});
