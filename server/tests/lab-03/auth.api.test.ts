import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";

const password = "InitialPass123!";

beforeEach(async () => {
  await getPrisma().authSession.deleteMany();
  await getPrisma().user.update({
    where: { email: "iris.staff@toktickit.local" },
    data: { passwordHash: await hashPassword(password), mustChangePassword: true },
  });
});

describe("Lab 3 authentication", () => {
  it("authenticates an active user and returns only safe identity data", async () => {
    const response = await request(app).post("/api/auth/login").send({ email: "avery.admin@toktickit.local", password });
    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"]).toBeDefined();
    expect(response.body.user).toMatchObject({ name: "Avery Admin", role: "ADMINISTRATOR", mustChangePassword: false });
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it("rejects invalid credentials and inactive users with a safe response", async () => {
    const invalid = await request(app).post("/api/auth/login").send({ email: "avery.admin@toktickit.local", password: "incorrect password" });
    expect(invalid.status).toBe(401);
    expect(invalid.body.error).toBe("Invalid email or password.");
    const inactive = await request(app).post("/api/auth/login").send({ email: "inactive@example.com", password });
    expect(inactive.status).toBe(401);
  });

  it("requires a session for current-user and clears it on logout", async () => {
    const agent = request.agent(app);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
    await agent.post("/api/auth/login").send({ email: "avery.admin@toktickit.local", password }).expect(200);
    expect((await agent.get("/api/auth/me")).body.user.email).toBe("avery.admin@toktickit.local");
    await agent.post("/api/auth/logout").expect(204);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("keeps an initial-password user flagged until a valid replacement is saved", async () => {
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({ email: "iris.staff@toktickit.local", password });
    expect(login.body.user.mustChangePassword).toBe(true);
    await agent.post("/api/auth/change-password").send({ password: "short" }).expect(400);
    const changed = await agent.post("/api/auth/change-password").send({ password: "A different valid password!" }).expect(200);
    expect(changed.body.user.mustChangePassword).toBe(false);
  });
});
