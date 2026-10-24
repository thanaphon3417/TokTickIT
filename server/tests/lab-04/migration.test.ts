import { describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 4 additive migration", () => {
  it("keeps prior ticket/user records queryable and gives legacy tickets version 1", async () => {
    const prisma = getPrisma();
    const [ticketCount, userCount, legacyTicket] = await Promise.all([
      prisma.ticket.count(), prisma.user.count(),
      prisma.ticket.findFirst({ orderBy: { id: "asc" }, select: { id: true, version: true } }),
    ]);
    expect(ticketCount).toBeGreaterThan(0);
    expect(userCount).toBeGreaterThan(0);
    expect(legacyTicket).not.toBeNull();
    expect(legacyTicket?.version).toBe(1);
    if (legacyTicket) expect(await prisma.ticketAction.count({ where: { ticketId: legacyTicket.id } })).toBe(0);
  });
});
