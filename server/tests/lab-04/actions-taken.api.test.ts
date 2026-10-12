import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { app } from "../../src/app.js";
import { hashPassword } from "../../src/auth.js";
import { getPrisma } from "../../src/prisma.js";

const password = "LabFourActionsTest123!";
let ticketId = 0;

async function login(email: string) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password }).expect(200);
  return agent;
}

beforeEach(async () => {
  const prisma = getPrisma();
  await prisma.authSession.deleteMany();
  await prisma.user.updateMany({ where: { email: { in: ["iris.staff@toktickit.local", "noah.staff@toktickit.local", "avery.admin@toktickit.local", "amina.lee@example.com", "ben.carter@example.com"] } }, data: { passwordHash: await hashPassword(password), mustChangePassword: false, isActive: true } });
  const [requester, category, system] = await Promise.all([
    prisma.developmentRequester.findUniqueOrThrow({ where: { email: "amina.lee@example.com" } }),
    prisma.category.findFirstOrThrow(), prisma.relatedSystem.findFirstOrThrow(),
  ]);
  const ticket = await prisma.ticket.create({ data: { ticketNumber: `TKT-LAB4-ACTION-${randomUUID()}`, requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id, summary: "Action API test", description: "Ticket for Lab 4 action API tests.", requestedPriority: "MEDIUM", itPriority: "MEDIUM" } });
  ticketId = ticket.id;
});

afterEach(async () => {
  if (ticketId) await getPrisma().ticket.delete({ where: { id: ticketId } }).catch(() => undefined);
  ticketId = 0;
  const initialPasswordHash = await hashPassword("InitialPass123!");
  await getPrisma().user.updateMany({ where: { email: { in: ["iris.staff@toktickit.local", "noah.staff@toktickit.local", "avery.admin@toktickit.local", "amina.lee@example.com", "ben.carter@example.com"] } }, data: { passwordHash: initialPasswordHash, mustChangePassword: true, isActive: true } });
  await getPrisma().user.update({ where: { email: "avery.admin@toktickit.local" }, data: { mustChangePassword: false } });
  await getPrisma().authSession.deleteMany();
});

describe("Ticket Actions Taken API", () => {
  it("enforces role and ownership for reads and writes", async () => {
    expect((await request(app).get(`/api/tickets/${ticketId}/actions`)).status).toBe(401);
    const requester = await login("amina.lee@example.com");
    expect((await requester.get(`/api/tickets/${ticketId}/actions`)).status).toBe(200);
    expect((await requester.post(`/api/tickets/${ticketId}/actions`).set("Idempotency-Key", randomUUID()).send({})).status).toBe(403);
    const staff = await login("iris.staff@toktickit.local");
    await staff.post(`/api/tickets/${ticketId}/actions`).set("Idempotency-Key", randomUUID()).send({ actionDateTime: "2026-10-12T09:00:00Z", description: "Owner-visible action", followUpRequired: false }).expect(201);
    expect((await requester.get(`/api/tickets/${ticketId}/actions`)).body).toHaveLength(1);
    const otherRequester = await login("ben.carter@example.com");
    expect((await otherRequester.get(`/api/tickets/${ticketId}/actions`)).status).toBe(404);
    expect((await staff.get(`/api/tickets/${ticketId}/actions`)).status).toBe(200);
  });

  it("validates, authorizes, and idempotently creates actions, then version-checks edits", async () => {
    const staff = await login("iris.staff@toktickit.local");
    const noah = await getPrisma().user.findUniqueOrThrow({ where: { email: "noah.staff@toktickit.local" } });
    const key = randomUUID();
    const payload = { actionDateTime: "2026-10-11T09:30:00.000Z", description: "  Restarted the VPN client  ", result: "Connection restored", assigneeId: noah.id, followUpRequired: true, followUpNote: "Confirm connection tomorrow", attachmentNotes: "No file attached" };
    const created = await staff.post(`/api/tickets/${ticketId}/actions`).set("Idempotency-Key", key).send(payload).expect(201);
    expect(created.body).toMatchObject({ ticketId, description: "Restarted the VPN client", performedBy: { email: "iris.staff@toktickit.local" }, assignee: { id: noah.id }, status: "PLANNED", version: 1 });
    expect(created.body.idempotencyKey).toBeUndefined();
    expect((await staff.post(`/api/tickets/${ticketId}/actions`).set("Idempotency-Key", key).send(payload)).status).toBe(200);
    expect(await getPrisma().ticketAction.count({ where: { ticketId } })).toBe(1);
    expect((await staff.post(`/api/tickets/${ticketId}/actions`).set("Idempotency-Key", key).send({ ...payload, description: "Different payload" })).status).toBe(409);
    expect((await staff.post(`/api/tickets/${ticketId}/actions`).set("Idempotency-Key", randomUUID()).send({ ...payload, followUpNote: "" })).status).toBe(400);
    expect((await staff.post(`/api/tickets/${ticketId}/actions`).set("Idempotency-Key", randomUUID()).send({ ...payload, actionDateTime: "2026-02-31T09:30:00Z" })).status).toBe(400);
    expect((await staff.post(`/api/tickets/${ticketId}/actions`).set("Idempotency-Key", randomUUID()).send({ ...payload, performedById: 999 })).status).toBe(400);

    const updated = await staff.patch(`/api/tickets/${ticketId}/actions/${created.body.id}`).send({ expectedVersion: 1, status: "IN_PROGRESS", description: "Restarted and verified the VPN client" }).expect(200);
    expect(updated.body).toMatchObject({ version: 2, status: "IN_PROGRESS", description: "Restarted and verified the VPN client" });
    expect((await staff.patch(`/api/tickets/${ticketId}/actions/${created.body.id}`).send({ expectedVersion: 1, result: "Stale write" })).status).toBe(409);
    const completed = await staff.patch(`/api/tickets/${ticketId}/actions/${created.body.id}`).send({ expectedVersion: 2, status: "COMPLETED" }).expect(200);
    expect(completed.body.version).toBe(3);
    expect((await staff.patch(`/api/tickets/${ticketId}/actions/${created.body.id}`).send({ expectedVersion: 3, result: "Cannot edit completed" })).status).toBe(409);
  });

  it("returns actions in stable chronological order and rejects ineligible assignees", async () => {
    const staff = await login("iris.staff@toktickit.local");
    const key1 = randomUUID(), key2 = randomUUID();
    const base = { description: "Inspect device", followUpRequired: false };
    await staff.post(`/api/tickets/${ticketId}/actions`).set("Idempotency-Key", key1).send({ ...base, actionDateTime: "2026-10-10T09:00:00Z" }).expect(201);
    await staff.post(`/api/tickets/${ticketId}/actions`).set("Idempotency-Key", key2).send({ ...base, actionDateTime: "2026-10-09T09:00:00Z" }).expect(201);
    const rows = await staff.get(`/api/tickets/${ticketId}/actions`).expect(200);
    expect(rows.body.map((row: { actionDateTime: string }) => row.actionDateTime)).toEqual(["2026-10-09T09:00:00.000Z", "2026-10-10T09:00:00.000Z"]);
    const admin = await getPrisma().user.findUniqueOrThrow({ where: { email: "avery.admin@toktickit.local" } });
    expect((await staff.post(`/api/tickets/${ticketId}/actions`).set("Idempotency-Key", randomUUID()).send({ ...base, actionDateTime: "2026-10-12T09:00:00Z", assigneeId: admin.id })).status).toBe(422);
    const noah = await getPrisma().user.findUniqueOrThrow({ where: { email: "noah.staff@toktickit.local" } });
    await getPrisma().user.update({ where: { id: noah.id }, data: { isActive: false } });
    expect((await staff.post(`/api/tickets/${ticketId}/actions`).set("Idempotency-Key", randomUUID()).send({ ...base, actionDateTime: "2026-10-12T10:00:00Z", assigneeId: noah.id })).status).toBe(422);
    await getPrisma().user.update({ where: { id: noah.id }, data: { isActive: true } });
    const adminAgent = await login("avery.admin@toktickit.local");
    const adminAction = await adminAgent.post(`/api/tickets/${ticketId}/actions`).set("Idempotency-Key", randomUUID()).send({ ...base, actionDateTime: "2026-10-12T11:00:00Z" }).expect(201);
    expect(adminAction.body.performedBy.id).toBe(admin.id);
  });
});
