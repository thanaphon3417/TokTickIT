import request from "supertest";
import { app } from "../../src/app.js";
import { hashPassword } from "../../src/auth.js";
import { getPrisma } from "../../src/prisma.js";

const password = "RequesterPass123!";

export async function requesterAgent(email = "amina.lee@example.com") {
  await getPrisma().user.update({ where: { email }, data: { passwordHash: await hashPassword(password), mustChangePassword: false, isActive: true } });
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password }).expect(200);
  return agent;
}
