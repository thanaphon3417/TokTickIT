import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { app } from "../../src/app.js";
import { hashPassword } from "../../src/auth.js";
import { getPrisma } from "../../src/prisma.js";

const password = "LabFourDashboardTest123!";
let ticketIds: number[] = [];
async function login(email: string) { const agent = request.agent(app); await agent.post("/api/auth/login").send({ email, password }).expect(200); return agent; }

beforeEach(async () => {
  const prisma = getPrisma(); ticketIds = []; await prisma.authSession.deleteMany();
  await prisma.user.updateMany({ where: { email: { in: ["amina.lee@example.com", "ben.carter@example.com", "iris.staff@toktickit.local"] } }, data: { passwordHash: await hashPassword(password), mustChangePassword: false, isActive: true } });
  const [amina, ben, category, system] = await Promise.all([prisma.developmentRequester.findUniqueOrThrow({ where: { email: "amina.lee@example.com" } }), prisma.developmentRequester.findUniqueOrThrow({ where: { email: "ben.carter@example.com" } }), prisma.category.findFirstOrThrow(), prisma.relatedSystem.findFirstOrThrow()]);
  for (const [requesterId, suffix] of [[amina.id, "owned"], [ben.id, "foreign"]] as const) {
    const ticket = await prisma.ticket.create({ data: { ticketNumber: `TKT-DASH-${suffix}-${randomUUID()}`, requesterId, categoryId: category.id, relatedSystemId: system.id, summary: `Dashboard ${suffix}`, description: "Dashboard ownership test ticket", currentStatus: "WAITING_FOR_REQUESTER" } }); ticketIds.push(ticket.id);
  }
  const stale = await prisma.ticket.create({ data: { ticketNumber: `TKT-DASH-stale-${randomUUID()}`, requesterId: amina.id, categoryId: category.id, relatedSystemId: system.id, summary: "Old dashboard ticket", description: "Outside the dashboard seven-day window", currentStatus: "OPEN", updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 60_000) } }); ticketIds.push(stale.id);
});

afterEach(async () => {
  await getPrisma().ticket.deleteMany({ where: { id: { in: ticketIds } } }); ticketIds = [];
  const initial = await hashPassword("InitialPass123!");
  await getPrisma().user.updateMany({ where: { email: { in: ["amina.lee@example.com", "ben.carter@example.com", "iris.staff@toktickit.local"] } }, data: { passwordHash: initial, mustChangePassword: true, isActive: true } });
  await getPrisma().authSession.deleteMany();
});

describe("Requester dashboard API", () => {
  it("requires requester authentication and scopes all metrics and rows to the session owner", async () => {
    expect((await request(app).get("/api/requester/dashboard")).status).toBe(401);
    const staff = await login("iris.staff@toktickit.local"); expect((await staff.get("/api/requester/dashboard")).status).toBe(403);
    const agent = await login("amina.lee@example.com");
    const amina = await getPrisma().developmentRequester.findUniqueOrThrow({ where: { email: "amina.lee@example.com" } });
    const now = new Date(); const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const expected = await Promise.all([
      getPrisma().ticket.count({ where: { requesterId: amina.id, currentStatus: { notIn: ["CLOSED", "CANCELLED"] } } }),
      getPrisma().ticket.count({ where: { requesterId: amina.id, currentStatus: "WAITING_FOR_REQUESTER" } }),
      getPrisma().ticket.count({ where: { requesterId: amina.id, updatedAt: { gte: since, lte: now } } }),
      getPrisma().ticket.count({ where: { requesterId: amina.id, currentStatus: { in: ["RESOLVED", "CLOSED"] }, updatedAt: { gte: since, lte: now } } }),
    ]);
    const response = await agent.get("/api/requester/dashboard?requesterId=999").expect(200);
    const owned = await getPrisma().ticket.findMany({ where: { id: ticketIds[0] }, select: { id: true } });
    expect(response.body.metrics).toEqual({ open: expected[0], waitingForRequester: expected[1], recentlyUpdated: expected[2], recentlyResolved: expected[3] });
    expect(response.body.metrics.waitingForRequester).toBeGreaterThanOrEqual(1);
    expect(response.body.attentionTickets.map((row: { id: number }) => row.id)).toContain(owned[0].id);
    expect(response.body.attentionTickets.map((row: { id: number }) => row.id)).not.toContain(ticketIds[1]);
    expect(response.body.recentTickets.map((row: { id: number }) => row.id)).not.toContain(ticketIds[1]);
    expect(response.body.recentTickets.map((row: { id: number }) => row.id)).not.toContain(ticketIds[2]);
    expect(response.body.recentTickets.every((row: { updatedAt: string }) => Date.parse(row.updatedAt) >= Date.now() - 7 * 24 * 60 * 60 * 1000)).toBe(true);
    expect(response.body.recentTickets.length).toBeLessThanOrEqual(5);
  });

  it("returns ticket lists in stable updated-time and ID order", async () => {
    const agent = await login("amina.lee@example.com");
    const response = await agent.get("/api/requester/dashboard").expect(200);
    const rows = response.body.recentTickets as Array<{ id: number; updatedAt: string }>;
    expect(rows.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < rows.length; i++) { const previous = rows[i - 1]; const current = rows[i]; expect(Date.parse(previous.updatedAt)).toBeGreaterThanOrEqual(Date.parse(current.updatedAt)); if (previous.updatedAt === current.updatedAt) expect(previous.id).toBeGreaterThan(current.id); }
  });
});
