import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { hashPassword } from "../../src/auth.js";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const password = "LabFourDashboardTest123!";
async function login(email: string) { const agent = request.agent(app); await agent.post("/api/auth/login").send({ email, password }).expect(200); return agent; }

beforeEach(async () => {
  const prisma = getPrisma(); await prisma.authSession.deleteMany();
  await prisma.user.updateMany({ where: { email: { in: ["iris.staff@toktickit.local", "amina.lee@example.com", "avery.admin@toktickit.local"] } }, data: { passwordHash: await hashPassword(password), mustChangePassword: false, isActive: true } });
});
afterEach(async () => {
  const initial = await hashPassword("InitialPass123!");
  await getPrisma().user.updateMany({ where: { email: { in: ["iris.staff@toktickit.local", "amina.lee@example.com", "avery.admin@toktickit.local"] } }, data: { passwordHash: initial, mustChangePassword: true, isActive: true } });
  await getPrisma().user.update({ where: { email: "avery.admin@toktickit.local" }, data: { mustChangePassword: false } }); await getPrisma().authSession.deleteMany();
});

describe("Staff dashboard API", () => {
  it("enforces staff roles and returns database-matched nonterminal metrics and bounded stable lists", async () => {
    expect((await request(app).get("/api/staff/dashboard")).status).toBe(401);
    const requester = await login("amina.lee@example.com"); expect((await requester.get("/api/staff/dashboard")).status).toBe(403);
    const staff = await login("iris.staff@toktickit.local");
    const response = await staff.get("/api/staff/dashboard").expect(200);
    const prisma = getPrisma();
    const staffUser = await prisma.user.findUniqueOrThrow({ where: { email: "iris.staff@toktickit.local" } });
    const [unassigned, ownedByMe, myOpenActions, nonterminal, high] = await Promise.all([
      prisma.ticket.count({ where: { ownerId: null, currentStatus: { notIn: ["CLOSED", "CANCELLED"] } } }),
      prisma.ticket.count({ where: { ownerId: staffUser.id, currentStatus: { notIn: ["CLOSED", "CANCELLED"] } } }),
      prisma.ticketAction.count({ where: { assigneeId: staffUser.id, status: { in: ["PLANNED", "IN_PROGRESS"] } } }),
      prisma.ticket.count({ where: { currentStatus: { notIn: ["CLOSED", "CANCELLED"] } } }),
      prisma.ticket.count({ where: { currentStatus: { notIn: ["CLOSED", "CANCELLED"] }, itPriority: "HIGH" } }),
    ]);
    expect(response.body.metrics).toMatchObject({ unassigned, ownedByMe, myOpenActions });
    expect(Object.keys(response.body.metrics.byStatus).sort()).toEqual(["CANCELLED", "CLOSED", "IN_PROGRESS", "NEW", "OPEN", "REOPENED", "RESOLVED", "WAITING_FOR_REQUESTER"].sort());
    expect(Object.values(response.body.metrics.byStatus).reduce((sum: number, value: unknown) => sum + Number(value), 0)).toBe(nonterminal);
    expect(Object.values(response.body.metrics.byPriority).reduce((sum: number, value: unknown) => sum + Number(value), 0)).toBe(nonterminal);
    expect(response.body.urgentTickets.length).toBeLessThanOrEqual(5); expect(high).toBeGreaterThanOrEqual(response.body.urgentTickets.length);
    for (const key of ["recentTickets", "urgentTickets", "myActions"]) {
      expect(response.body[key].length).toBeLessThanOrEqual(5);
      const rows = response.body[key] as Array<{ id: number; updatedAt: string }>;
      for (let index = 1; index < rows.length; index++) { const previous = rows[index - 1]; const current = rows[index]; expect(Date.parse(previous.updatedAt)).toBeGreaterThanOrEqual(Date.parse(current.updatedAt)); if (previous.updatedAt === current.updatedAt) expect(previous.id).toBeGreaterThan(current.id); }
    }
    const admin = await login("avery.admin@toktickit.local"); expect((await admin.get("/api/staff/dashboard")).status).toBe(200);
  });

  it("maps dashboard drill-down filters to staff ticket queries", async () => {
    const staff = await login("iris.staff@toktickit.local");
    const dashboard = await staff.get("/api/staff/dashboard").expect(200);
    const unassigned = await staff.get("/api/staff/tickets?owner=unassigned&activeOnly=true").expect(200);
    const owned = await staff.get("/api/staff/tickets?owner=me&activeOnly=true").expect(200);
    expect(unassigned.body.pagination.totalItems).toBe(dashboard.body.metrics.unassigned);
    expect(owned.body.pagination.totalItems).toBe(dashboard.body.metrics.ownedByMe);
    await staff.get("/api/staff/tickets?itPriority=HIGH&activeOnly=true").expect(200);
    await staff.get("/api/staff/tickets?currentStatus=OPEN&activeOnly=true").expect(200);
    await staff.get("/api/staff/tickets?owner=someone").expect(400);
    await staff.get("/api/staff/tickets?activeOnly=maybe").expect(400);
  });
});
