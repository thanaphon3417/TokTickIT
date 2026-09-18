import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { hashPassword } from "../../src/auth.js";
import { getPrisma } from "../../src/prisma.js";

const password = "AdminTestPass123!";
let createdUserId = 0;

async function adminAgent() {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email: "avery.admin@toktickit.local", password }).expect(200);
  return agent;
}

beforeEach(async () => {
  const prisma = getPrisma(); await prisma.authSession.deleteMany();
  await prisma.user.update({ where: { email: "avery.admin@toktickit.local" }, data: { passwordHash: await hashPassword(password), mustChangePassword: false, isActive: true } });
  await prisma.user.update({ where: { email: "iris.staff@toktickit.local" }, data: { passwordHash: await hashPassword(password), mustChangePassword: false, isActive: true } });
});
afterEach(async () => { if (createdUserId) { await getPrisma().developmentRequester.deleteMany({ where: { userId: createdUserId } }); await getPrisma().user.delete({ where: { id: createdUserId } }).catch(() => undefined); createdUserId = 0; } });

describe("Administrator user management", () => {
  it("restricts the API and returns safe searchable users", async () => {
    expect((await request(app).get("/api/admin/users")).status).toBe(401);
    const staff = request.agent(app); await staff.post("/api/auth/login").send({ email: "iris.staff@toktickit.local", password }).expect(200);
    expect((await staff.get("/api/admin/users")).status).toBe(403);
    const response = await (await adminAgent()).get("/api/admin/users?role=ADMINISTRATOR&active=true");
    expect(response.status).toBe(200); expect(response.body.length).toBeGreaterThan(0); expect(response.body[0].passwordHash).toBeUndefined();
  });

  it("creates, edits, resets, and validates account safety", async () => {
    const agent = await adminAgent(); const email = `issue7-${Date.now()}@example.com`;
    const created = await agent.post("/api/admin/users").send({ name: "Issue Seven User", email, role: "REQUESTER", password: "ValidIssue7Pass!" });
    expect(created.status).toBe(201); createdUserId = created.body.id; expect(created.body.mustChangePassword).toBe(true); expect(created.body.passwordHash).toBeUndefined();
    expect((await agent.post("/api/admin/users").send({ name: "Duplicate", email, role: "IT_STAFF" })).status).toBe(409);
    const updated = await agent.patch(`/api/admin/users/${createdUserId}`).send({ name: "Updated User", email, role: "IT_STAFF", isActive: true, resetPassword: true, password: "ResetIssue7Pass!" });
    expect(updated.status).toBe(200); expect(updated.body).toMatchObject({ name: "Updated User", role: "IT_STAFF", mustChangePassword: true });
    const admin = await getPrisma().user.findUniqueOrThrow({ where: { email: "avery.admin@toktickit.local" } });
    expect((await agent.patch(`/api/admin/users/${admin.id}`).send({ name: admin.name, email: admin.email, role: "ADMINISTRATOR", isActive: false })).status).toBe(409);
  });
});
