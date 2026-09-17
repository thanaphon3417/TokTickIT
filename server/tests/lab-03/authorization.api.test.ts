import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { hashPassword } from "../../src/auth.js";
import { getPrisma } from "../../src/prisma.js";

const password = "RoleTestPass123!";

beforeEach(async () => {
  await getPrisma().authSession.deleteMany();
  await getPrisma().user.update({ where: { email: "iris.staff@toktickit.local" }, data: { passwordHash: await hashPassword(password), mustChangePassword: false, isActive: true } });
  await getPrisma().user.update({ where: { email: "amina.lee@example.com" }, data: { passwordHash: await hashPassword(password), mustChangePassword: true, isActive: true } });
});

describe("Requester authorization", () => {
  it("rejects unauthenticated requester ticket access", async () => {
    expect((await request(app).get("/api/tickets?requesterId=1")).status).toBe(401);
    expect((await request(app).post("/api/tickets").send({ requesterId: 1 })).status).toBe(401);
  });

  it("rejects IT Staff from requester-only ticket routes", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: "iris.staff@toktickit.local", password }).expect(200);
    const response = await agent.get("/api/tickets?requesterId=1");
    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Requester access is required.");
  });

  it("requires an initial-password requester to change password before ticket access", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: "amina.lee@example.com", password }).expect(200);
    expect((await agent.get("/api/tickets")).status).toBe(403);
  });
});
