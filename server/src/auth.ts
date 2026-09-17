import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Request, Response } from "express";
import { getPrisma } from "./prisma.js";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "toktickit_session";
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export type SafeUser = { id: number; name: string; email: string; role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR"; mustChangePassword: boolean };

function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }

export function passwordIsValid(password: unknown): password is string {
  return typeof password === "string" && password.length >= 12 && password.length <= 128;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, expected] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const derived = await scrypt(password, salt, 64) as Buffer;
  const expectedBuffer = Buffer.from(expected, "hex");
  return expectedBuffer.length === derived.length && timingSafeEqual(expectedBuffer, derived);
}

export function safeUser(user: { id: number; name: string; email: string; role: SafeUser["role"]; mustChangePassword: boolean }): SafeUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword };
}

function readCookie(req: Request, name: string): string | undefined {
  const value = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return value?.slice(name.length + 1);
}

export async function createSession(res: Response, userId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await getPrisma().authSession.create({ data: { tokenHash: tokenHash(token), userId, expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS) } });
  res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: SESSION_LIFETIME_MS, path: "/api" });
}

export async function clearSession(req: Request, res: Response): Promise<void> {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) await getPrisma().authSession.deleteMany({ where: { tokenHash: tokenHash(token) } });
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api" });
}

export async function currentUser(req: Request): Promise<SafeUser | null> {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const session = await getPrisma().authSession.findFirst({
    where: { tokenHash: tokenHash(token), expiresAt: { gt: new Date() }, user: { isActive: true } },
    include: { user: true },
  });
  return session ? safeUser(session.user) : null;
}
