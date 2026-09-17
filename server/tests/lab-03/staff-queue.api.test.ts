import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { hashPassword } from "../../src/auth.js";
import { getPrisma } from "../../src/prisma.js";

const password = "StaffQueuePass123!";

async function staffAgent() {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email: "iris.staff@toktickit.local", password }).expect(200);
  return agent;
}

beforeEach(async () => {
  await getPrisma().authSession.deleteMany();
  await getPrisma().user.update({ where: { email: "iris.staff@toktickit.local" }, data: { passwordHash: await hashPassword(password), mustChangePassword: false, isActive: true } });
  await getPrisma().user.update({ where: { email: "amina.lee@example.com" }, data: { passwordHash: await hashPassword(password), mustChangePassword: false, isActive: true } });
  await getPrisma().ticket.deleteMany({ where: { ticketNumber: { startsWith: "TKT-QUEUE-" } } });
});

afterEach(async () => {
  await getPrisma().ticket.deleteMany({ where: { ticketNumber: { startsWith: "TKT-QUEUE-" } } });
});

describe("IT Staff ticket queue", () => {
  it("requires an authenticated IT Staff session", async () => {
    expect((await request(app).get("/api/staff/tickets")).status).toBe(401);
    const requester = request.agent(app);
    await requester.post("/api/auth/login").send({ email: "amina.lee@example.com", password }).expect(200);
    expect((await requester.get("/api/staff/tickets")).status).toBe(403);
  });

  it("returns searchable queue items with safe owner data and validated filters", async () => {
    const prisma = getPrisma();
    const [requester, category, system, owner] = await Promise.all([
      prisma.developmentRequester.findUniqueOrThrow({ where: { email: "amina.lee@example.com" } }),
      prisma.category.findFirstOrThrow(),
      prisma.relatedSystem.findFirstOrThrow(),
      prisma.user.findUniqueOrThrow({ where: { email: "iris.staff@toktickit.local" } }),
    ]);
    const ticketNumber = `TKT-QUEUE-${Date.now()}`;
    await prisma.ticket.create({ data: { ticketNumber, requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id, summary: "Queue search verification", description: "A ticket created specifically to verify the staff queue endpoint.", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "OPEN", ownerId: owner.id } });

    const response = await (await staffAgent()).get(`/api/staff/tickets?search=Queue%20search&page=1&pageSize=5&currentStatus=OPEN&sortBy=updatedAt&sortOrder=desc`);
    expect(response.status).toBe(200);
    const item = response.body.items.find((candidate: { ticketNumber: string }) => candidate.ticketNumber === ticketNumber);
    expect(item).toMatchObject({ ticketNumber, currentStatus: "OPEN", itPriority: "HIGH", owner: { name: "Iris Staff" } });
    expect(item.owner.passwordHash).toBeUndefined();
    const detail = await (await staffAgent()).get(`/api/staff/tickets/${item.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({ id: item.id, description: "A ticket created specifically to verify the staff queue endpoint." });
    expect(detail.body.owner.passwordHash).toBeUndefined();
    expect((await (await staffAgent()).get("/api/staff/tickets?page=0")).status).toBe(400);
  });
});
