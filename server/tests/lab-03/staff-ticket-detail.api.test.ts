import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { hashPassword } from "../../src/auth.js";
import { getPrisma } from "../../src/prisma.js";

const password = "WorkflowTestPass123!";
let ticketId = 0;

async function staffAgent() {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email: "iris.staff@toktickit.local", password }).expect(200);
  return agent;
}

beforeEach(async () => {
  const prisma = getPrisma();
  await prisma.authSession.deleteMany();
  await prisma.user.updateMany({ where: { email: { in: ["iris.staff@toktickit.local", "noah.staff@toktickit.local"] } }, data: { passwordHash: await hashPassword(password), mustChangePassword: false, isActive: true } });
  await prisma.user.update({ where: { email: "amina.lee@example.com" }, data: { passwordHash: await hashPassword(password), mustChangePassword: false } });
  const [requester, category, system] = await Promise.all([prisma.developmentRequester.findUniqueOrThrow({ where: { email: "amina.lee@example.com" } }), prisma.category.findFirstOrThrow(), prisma.relatedSystem.findFirstOrThrow()]);
  const ticket = await prisma.ticket.create({ data: { ticketNumber: `TKT-WORKFLOW-${Date.now()}`, requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id, summary: "Workflow test ticket", description: "This record verifies staff workflow and collaboration APIs.", requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "NEW" } });
  ticketId = ticket.id;
});

afterEach(async () => { if (ticketId) await getPrisma().ticket.delete({ where: { id: ticketId } }).catch(() => undefined); });

describe("Staff ticket workflow", () => {
  it("allows staff to assign an eligible owner and make a permitted status transition", async () => {
    const noah = await getPrisma().user.findUniqueOrThrow({ where: { email: "noah.staff@toktickit.local" } });
    const agent = await staffAgent();
    const updated = await agent.patch(`/api/staff/tickets/${ticketId}`).send({ ownerId: noah.id, itPriority: "HIGH", currentStatus: "OPEN" });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ owner: { id: noah.id }, itPriority: "HIGH", currentStatus: "OPEN" });
    const invalid = await agent.patch(`/api/staff/tickets/${ticketId}`).send({ currentStatus: "CLOSED" });
    expect(invalid.status).toBe(409);
  });

  it("enforces comments and internal-note visibility and append-only validation", async () => {
    const staff = await staffAgent();
    await staff.post(`/api/tickets/${ticketId}/comments`).send({ body: "We are investigating this request." }).expect(201);
    await staff.post(`/api/tickets/${ticketId}/notes`).send({ body: "Check device logs before escalation." }).expect(201);
    expect((await staff.get(`/api/tickets/${ticketId}/comments`)).body).toHaveLength(1);
    expect((await staff.get(`/api/tickets/${ticketId}/notes`)).body).toHaveLength(1);
    const requester = request.agent(app);
    await requester.post("/api/auth/login").send({ email: "amina.lee@example.com", password }).expect(200);
    expect((await requester.get(`/api/tickets/${ticketId}/comments`)).status).toBe(200);
    expect((await requester.get(`/api/tickets/${ticketId}/notes`)).status).toBe(403);
    expect((await requester.post(`/api/tickets/${ticketId}/notes`).send({ body: "Not allowed" })).status).toBe(403);
    expect((await staff.post(`/api/tickets/${ticketId}/comments`).send({ body: " " })).status).toBe(400);
  });
});
