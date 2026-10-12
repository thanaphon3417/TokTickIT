import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { app } from "../../src/app.js";
import { hashPassword } from "../../src/auth.js";
import { getPrisma } from "../../src/prisma.js";

const password = "LabFourWorkflowTest123!";
let ticketId = 0;

async function login(email: string) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password }).expect(200);
  return agent;
}

beforeEach(async () => {
  const prisma = getPrisma();
  await prisma.authSession.deleteMany();
  await prisma.user.updateMany({ where: { email: { in: ["iris.staff@toktickit.local", "amina.lee@example.com", "ben.carter@example.com"] } }, data: { passwordHash: await hashPassword(password), mustChangePassword: false, isActive: true } });
  const [requester, category, system] = await Promise.all([
    prisma.developmentRequester.findUniqueOrThrow({ where: { email: "amina.lee@example.com" } }),
    prisma.category.findFirstOrThrow(), prisma.relatedSystem.findFirstOrThrow(),
  ]);
  const ticket = await prisma.ticket.create({ data: { ticketNumber: `TKT-LAB4-WORKFLOW-${randomUUID()}`, requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id, summary: "Workflow API test", description: "Ticket for formal status and feedback tests.", requestedPriority: "MEDIUM", itPriority: "MEDIUM" } });
  ticketId = ticket.id;
});

afterEach(async () => {
  if (ticketId) await getPrisma().ticket.delete({ where: { id: ticketId } }).catch(() => undefined);
  ticketId = 0;
  const initialPasswordHash = await hashPassword("InitialPass123!");
  await getPrisma().user.updateMany({ where: { email: { in: ["iris.staff@toktickit.local", "amina.lee@example.com", "ben.carter@example.com"] } }, data: { passwordHash: initialPasswordHash, mustChangePassword: true, isActive: true } });
  await getPrisma().authSession.deleteMany();
});

describe("Versioned ticket workflow", () => {
  it("enforces every permitted and forbidden status transition in BR-06", async () => {
    const staff = await login("iris.staff@toktickit.local");
    const prisma = getPrisma();
    const actor = await prisma.user.findUniqueOrThrow({ where: { email: "iris.staff@toktickit.local" } });
    const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
    const allowed: Record<(typeof statuses)[number], string[]> = { NEW: ["OPEN", "CANCELLED"], OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"], RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"], REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], CANCELLED: [] };
    for (const from of statuses) for (const to of statuses) {
      if (from === to) continue;
      await prisma.ticketAction.deleteMany({ where: { ticketId } });
      await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: from, version: 1 } });
      if (to === "RESOLVED") await prisma.ticketAction.create({ data: { ticketId, actionDateTime: new Date("2026-10-12T09:00:00Z"), description: "Completed verification", result: "Issue resolved", performedById: actor.id, status: "COMPLETED", idempotencyKey: randomUUID() } });
      const payload = { expectedVersion: 1, currentStatus: to, ...(["CANCELLED", "REOPENED"].includes(to) ? { resolutionReason: "Documented workflow reason" } : {}) };
      const response = await staff.patch(`/api/staff/tickets/${ticketId}`).send(payload);
      expect(response.status, `${from} -> ${to}`).toBe(allowed[from].includes(to) ? 200 : 409);
    }
  });

  it("permits only legal transitions, requires resolution evidence and reasons, and rejects stale writes", async () => {
    const staff = await login("iris.staff@toktickit.local");
    await staff.patch(`/api/staff/tickets/${ticketId}`).send({ currentStatus: "OPEN" }).expect(400);
    await staff.patch(`/api/staff/tickets/${ticketId}`).send({ currentStatus: "CLOSED", expectedVersion: 1 }).expect(409);
    await staff.patch(`/api/staff/tickets/${ticketId}`).send({ currentStatus: "CANCELLED", expectedVersion: 1 }).expect(400);
    const opened = await staff.patch(`/api/staff/tickets/${ticketId}`).send({ currentStatus: "OPEN", expectedVersion: 1 }).expect(200);
    expect(opened.body).toMatchObject({ currentStatus: "OPEN", version: 2 });
    const stale = await staff.patch(`/api/staff/tickets/${ticketId}`).send({ currentStatus: "IN_PROGRESS", expectedVersion: 1 }).expect(409);
    expect(stale.body).toMatchObject({ currentVersion: 2, currentStatus: "OPEN" });
    await staff.patch(`/api/staff/tickets/${ticketId}`).send({ currentStatus: "RESOLVED", expectedVersion: 2 }).expect(409);

    const emptyResult = await staff.post(`/api/tickets/${ticketId}/actions`).set("Idempotency-Key", randomUUID()).send({ actionDateTime: "2026-10-12T08:00:00Z", description: "Attempted repair", result: "   ", followUpRequired: false }).expect(201);
    await staff.patch(`/api/tickets/${ticketId}/actions/${emptyResult.body.id}`).send({ expectedVersion: 1, status: "COMPLETED" }).expect(200);
    await staff.patch(`/api/staff/tickets/${ticketId}`).send({ currentStatus: "RESOLVED", expectedVersion: 2 }).expect(409);
    const action = await staff.post(`/api/tickets/${ticketId}/actions`).set("Idempotency-Key", randomUUID()).send({ actionDateTime: "2026-10-12T09:00:00Z", description: "Completed repair", result: "System is working correctly", followUpRequired: false }).expect(201);
    await staff.patch(`/api/tickets/${ticketId}/actions/${action.body.id}`).send({ expectedVersion: 1, status: "COMPLETED" }).expect(200);
    const resolved = await staff.patch(`/api/staff/tickets/${ticketId}`).send({ currentStatus: "RESOLVED", expectedVersion: 2 }).expect(200);
    expect(resolved.body).toMatchObject({ currentStatus: "RESOLVED", version: 3 });
    await staff.patch(`/api/staff/tickets/${ticketId}`).send({ currentStatus: "CLOSED", expectedVersion: 3 }).expect(200);
    await staff.patch(`/api/staff/tickets/${ticketId}`).send({ currentStatus: "REOPENED", expectedVersion: 4 }).expect(400);
    const reopened = await staff.patch(`/api/staff/tickets/${ticketId}`).send({ currentStatus: "REOPENED", expectedVersion: 4, resolutionReason: "Requester reports the issue returned" }).expect(200);
    expect(reopened.body).toMatchObject({ currentStatus: "REOPENED", version: 5, resolutionReason: "Requester reports the issue returned" });
  });

  it("keeps requester feedback advisory, owned, nonterminal, and versioned", async () => {
    const requester = await login("amina.lee@example.com");
    const staff = await login("iris.staff@toktickit.local");
    const feedback = await requester.patch(`/api/tickets/${ticketId}/resolution-feedback`).send({ appearsResolved: true, expectedVersion: 1 }).expect(200);
    expect(feedback.body).toMatchObject({ requesterResolved: true, currentStatus: "NEW", version: 2 });
    expect((await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticketId } })).currentStatus).toBe("NEW");
    await requester.patch(`/api/tickets/${ticketId}/resolution-feedback`).send({ appearsResolved: false, expectedVersion: 1 }).expect(409);
    await staff.patch(`/api/tickets/${ticketId}/resolution-feedback`).send({ appearsResolved: false, expectedVersion: 2 }).expect(403);
    const other = await login("ben.carter@example.com");
    await other.patch(`/api/tickets/${ticketId}/resolution-feedback`).send({ appearsResolved: false, expectedVersion: 2 }).expect(404);
    const cleared = await requester.patch(`/api/tickets/${ticketId}/resolution-feedback`).send({ appearsResolved: false, expectedVersion: 2 }).expect(200);
    expect(cleared.body).toMatchObject({ requesterResolved: false, currentStatus: "NEW", version: 3 });
    await staff.patch(`/api/staff/tickets/${ticketId}`).send({ currentStatus: "CANCELLED", expectedVersion: 3, resolutionReason: "Duplicate request" }).expect(200);
    await requester.patch(`/api/tickets/${ticketId}/resolution-feedback`).send({ appearsResolved: false, expectedVersion: 4 }).expect(409);
  });
});
