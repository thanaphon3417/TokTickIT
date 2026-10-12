import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { generateTicketNumber } from "./ticket-number.js";
import { getPrisma } from "./prisma.js";
import { clearSession, createSession, currentUser, passwordIsValid, safeUser, verifyPassword, hashPassword, type SafeUser } from "./auth.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

const allowedClientOrigins = new Set([process.env.CLIENT_ORIGIN ?? "http://localhost:5173", "http://127.0.0.1:5173"]);
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedClientOrigins.has(origin)), credentials: true }));
app.use(express.json());

async function requireRequester(req: Request, res: Response): Promise<number | null> {
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: "Authentication is required." }); return null; }
  if (user.role !== "REQUESTER") { res.status(403).json({ error: "Requester access is required." }); return null; }
  if (user.mustChangePassword) { res.status(403).json({ error: "A password change is required before using the application." }); return null; }
  const requester = await getPrisma().developmentRequester.findUnique({ where: { userId: user.id } });
  if (!requester || !requester.isActive) { res.status(403).json({ error: "Requester access is unavailable." }); return null; }
  return requester.id;
}

async function requireStaff(req: Request, res: Response): Promise<boolean> {
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: "Authentication is required." }); return false; }
  if (user.role !== "IT_STAFF" && user.role !== "ADMINISTRATOR") { res.status(403).json({ error: "Staff or Administrator access is required." }); return false; }
  if (user.mustChangePassword) { res.status(403).json({ error: "A password change is required before using the application." }); return false; }
  return true;
}

async function requireAdmin(req: Request, res: Response): Promise<SafeUser | null> {
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: "Authentication is required." }); return null; }
  if (user.role !== "ADMINISTRATOR") { res.status(403).json({ error: "Administrator access is required." }); return null; }
  if (user.mustChangePassword) { res.status(403).json({ error: "A password change is required before using the application." }); return null; }
  return user;
}

async function requireTicketParticipant(req: Request, res: Response, ticketId: number, allowAdministrator = true): Promise<SafeUser | null> {
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: "Authentication is required." }); return null; }
  if (user.mustChangePassword) { res.status(403).json({ error: "A password change is required before using the application." }); return null; }
  if (user.role === "ADMINISTRATOR") {
    if (!allowAdministrator) { res.status(403).json({ error: "Administrator access is read-only." }); return null; }
    return user;
  }
  if (user.role === "IT_STAFF") return user;
  const requester = await getPrisma().developmentRequester.findUnique({ where: { userId: user.id } });
  const ticket = requester ? await getPrisma().ticket.findFirst({ where: { id: ticketId, requesterId: requester.id }, select: { id: true } }) : null;
  if (!ticket) { res.status(404).json({ error: "Ticket not found." }); return null; }
  return user;
}

app.post("/api/auth/login", async (req: Request, res: Response) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !password) { res.status(400).json({ error: "Email and password are required." }); return; }
  try {
    const user = await getPrisma().user.findUnique({ where: { email } });
    if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password." }); return;
    }
    await createSession(res, user.id);
    res.status(200).json({ user: safeUser(user) });
  } catch { res.status(500).json({ error: "Unable to sign in. Please try again." }); }
});

app.post("/api/auth/logout", async (req: Request, res: Response) => {
  try { await clearSession(req, res); res.status(204).send(); }
  catch { res.status(500).json({ error: "Unable to sign out. Please try again." }); }
});

app.get("/api/auth/me", async (req: Request, res: Response) => {
  try {
    const user = await currentUser(req);
    if (!user) { res.status(401).json({ error: "Authentication is required." }); return; }
    res.status(200).json({ user });
  } catch { res.status(500).json({ error: "Unable to retrieve the current user." }); }
});

app.post("/api/auth/change-password", async (req: Request, res: Response) => {
  const password = req.body?.password;
  if (!passwordIsValid(password)) { res.status(400).json({ error: "Password must be 12-128 characters." }); return; }
  try {
    const user = await currentUser(req);
    if (!user) { res.status(401).json({ error: "Authentication is required." }); return; }
    const updated = await getPrisma().user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password), mustChangePassword: false } });
    res.status(200).json({ user: safeUser(updated) });
  } catch { res.status(500).json({ error: "Unable to change password. Please try again." }); }
});

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, allowedMimeTypes.has(file.mimetype)),
});

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "TokTickIT API",
  });
});
// ---------------------------------------------------------------------------
// Issue 4 — Category list
// Add:  GET /api/categories
//   -> read categories from PostgreSQL via getPrisma().category.findMany(...)
//   -> return each { id, name } in a predictable (id) order
//   -> on failure, respond 500 with a safe message (no internal details)
// TODO(Issue 4): implement the route here.
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    res.status(200).json(categories);
  } catch {
    res.status(500).json({
      error: "Unable to retrieve request categories.",
    });
  }
});

app.get("/api/requesters/active", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().developmentRequester.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    res.status(200).json(requesters);
  } catch {
    res.status(500).json({
      error: "Unable to retrieve active development requesters.",
    });
  }
});

app.get("/api/systems", async (_req: Request, res: Response) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    res.status(200).json(systems);
  } catch {
    res.status(500).json({ error: "Unable to retrieve related systems." });
  }
});

app.get("/api/staff/tickets", async (req: Request, res: Response) => {
  if (!(await requireStaff(req, res))) return;
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 10);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const requestedPriority = req.query.requestedPriority;
  const currentStatus = req.query.currentStatus;
  const sortBy = String(req.query.sortBy ?? "updatedAt");
  const sortOrder = String(req.query.sortOrder ?? "desc");
  const sortFields = ["ticketNumber", "createdAt", "updatedAt", "summary", "requestedPriority", "itPriority", "currentStatus"];
  if (!Number.isInteger(page) || page < 1 || ![5, 10, 20].includes(pageSize) || !sortFields.includes(sortBy) || !["asc", "desc"].includes(sortOrder) || (categoryId !== undefined && !Number.isInteger(categoryId)) || (requestedPriority && !["LOW", "MEDIUM", "HIGH"].includes(String(requestedPriority))) || (currentStatus && !["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"].includes(String(currentStatus)))) {
    res.status(400).json({ error: "Invalid staff queue query." }); return;
  }
  const where = {
    ...(search ? { OR: [{ ticketNumber: { contains: search, mode: "insensitive" as const } }, { summary: { contains: search, mode: "insensitive" as const } }, { requester: { name: { contains: search, mode: "insensitive" as const } } }] } : {}),
    ...(categoryId !== undefined ? { categoryId } : {}),
    ...(requestedPriority ? { requestedPriority: String(requestedPriority) as "LOW" | "MEDIUM" | "HIGH" } : {}),
    ...(currentStatus ? { currentStatus: String(currentStatus) as "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED" } : {}),
  };
  try {
    const prisma = getPrisma();
    const [totalItems, items] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({ where, include: { requester: true, category: true, relatedSystem: true, owner: { select: { id: true, name: true } } }, orderBy: [{ [sortBy]: sortOrder }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    res.status(200).json({ items, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } });
  } catch { res.status(500).json({ error: "Unable to retrieve the staff ticket queue." }); }
});

app.get("/api/staff/tickets/:ticketId", async (req: Request, res: Response) => {
  if (!(await requireStaff(req, res))) return;
  const ticketId = Number(req.params.ticketId);
  if (!Number.isInteger(ticketId) || ticketId <= 0) { res.status(400).json({ error: "Invalid staff ticket request." }); return; }
  try {
    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      include: { requester: true, category: true, relatedSystem: true, owner: { select: { id: true, name: true } }, attachments: { select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true, uploadedAt: true, removedAt: true, removalReason: true }, orderBy: { uploadedAt: "desc" } } },
    });
    if (!ticket) { res.status(404).json({ error: "Ticket not found." }); return; }
    res.status(200).json(ticket);
  } catch { res.status(500).json({ error: "Unable to retrieve the staff ticket." }); }
});

app.get("/api/staff/users", async (req: Request, res: Response) => {
  if (!(await requireStaff(req, res))) return;
  try {
    res.status(200).json(await getPrisma().user.findMany({
      where: { role: "IT_STAFF", isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }));
  } catch { res.status(500).json({ error: "Unable to retrieve active IT Staff users." }); }
});

const userRoles = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const;
function userInput(body: any) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = typeof body?.role === "string" ? body.role : "";
  const fieldErrors: Record<string, string> = {};
  if (name.length < 2 || name.length > 120) fieldErrors.name = "Name must be 2-120 characters.";
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 255) fieldErrors.email = "A valid email is required.";
  if (!userRoles.includes(role as typeof userRoles[number])) fieldErrors.role = "Role is invalid.";
  return { name, email, role: role as typeof userRoles[number], fieldErrors };
}

app.get("/api/admin/users", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const role = typeof req.query.role === "string" ? req.query.role : "";
  const active = typeof req.query.active === "string" ? req.query.active : "";
  if (role && !userRoles.includes(role as typeof userRoles[number])) { res.status(400).json({ error: "Invalid user role filter." }); return; }
  if (active && !["true", "false"].includes(active)) { res.status(400).json({ error: "Invalid active filter." }); return; }
  try {
    const users = await getPrisma().user.findMany({ where: { ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] } : {}), ...(role ? { role: role as typeof userRoles[number] } : {}), ...(active ? { isActive: active === "true" } : {}) }, select: { id: true, name: true, email: true, role: true, isActive: true, mustChangePassword: true, createdAt: true, updatedAt: true }, orderBy: [{ name: "asc" }, { id: "asc" }] });
    res.status(200).json(users);
  } catch { res.status(500).json({ error: "Unable to retrieve users." }); }
});

app.post("/api/admin/users", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const input = userInput(req.body);
  const password = typeof req.body?.password === "string" ? req.body.password : "InitialPass123!";
  if (!passwordIsValid(password)) input.fieldErrors.password = "Password must be 12-128 characters.";
  if (Object.keys(input.fieldErrors).length) { res.status(400).json({ error: "Validation failed.", fieldErrors: input.fieldErrors }); return; }
  try {
    const prisma = getPrisma();
    if (await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) { res.status(409).json({ error: "A user with that email already exists." }); return; }
    const created = await prisma.user.create({ data: { name: input.name, email: input.email, role: input.role, passwordHash: await hashPassword(password), mustChangePassword: true }, select: { id: true, name: true, email: true, role: true, isActive: true, mustChangePassword: true, createdAt: true, updatedAt: true } });
    if (created.role === "REQUESTER") await prisma.developmentRequester.create({ data: { name: created.name, email: created.email, userId: created.id } });
    res.status(201).json(created);
  } catch { res.status(500).json({ error: "Unable to create user." }); }
});

app.get("/api/admin/users/:userId", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) { res.status(400).json({ error: "Invalid user request." }); return; }
  try { const user = await getPrisma().user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true, isActive: true, mustChangePassword: true, createdAt: true, updatedAt: true } }); if (!user) { res.status(404).json({ error: "User not found." }); return; } res.status(200).json(user); }
  catch { res.status(500).json({ error: "Unable to retrieve user." }); }
});

app.patch("/api/admin/users/:userId", async (req: Request, res: Response) => {
  const admin = await requireAdmin(req, res); if (!admin) return;
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) { res.status(400).json({ error: "Invalid user request." }); return; }
  const input = userInput(req.body);
  const password = req.body?.resetPassword ? (typeof req.body.password === "string" ? req.body.password : "InitialPass123!") : undefined;
  if (req.body?.resetPassword && !passwordIsValid(password)) input.fieldErrors.password = "Password must be 12-128 characters.";
  if (Object.keys(input.fieldErrors).length) { res.status(400).json({ error: "Validation failed.", fieldErrors: input.fieldErrors }); return; }
  try {
    const prisma = getPrisma(); const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) { res.status(404).json({ error: "User not found." }); return; }
    if (await prisma.user.findFirst({ where: { email: input.email, id: { not: userId } }, select: { id: true } })) { res.status(409).json({ error: "A user with that email already exists." }); return; }
    if (existing.id === admin.id && req.body.isActive === false) { res.status(409).json({ error: "You cannot deactivate your own administrator account." }); return; }
    if (existing.role === "ADMINISTRATOR" && (req.body.isActive === false || input.role !== "ADMINISTRATOR")) { const count = await prisma.user.count({ where: { role: "ADMINISTRATOR", isActive: true } }); if (existing.isActive && count <= 1) { res.status(409).json({ error: "The final active administrator cannot be deactivated or changed." }); return; } }
    const updated = await prisma.user.update({ where: { id: userId }, data: { name: input.name, email: input.email, role: input.role, ...(req.body.isActive !== undefined ? { isActive: Boolean(req.body.isActive) } : {}), ...(password ? { passwordHash: await hashPassword(password), mustChangePassword: true } : {}) }, select: { id: true, name: true, email: true, role: true, isActive: true, mustChangePassword: true, createdAt: true, updatedAt: true } });
    if (existing.role === "REQUESTER" && input.role !== "REQUESTER") await prisma.developmentRequester.updateMany({ where: { userId }, data: { isActive: false } });
    if (input.role === "REQUESTER") await prisma.developmentRequester.upsert({ where: { userId }, update: { name: input.name, email: input.email, isActive: updated.isActive }, create: { name: input.name, email: input.email, userId, isActive: updated.isActive } });
    res.status(200).json(updated);
  } catch { res.status(500).json({ error: "Unable to update user." }); }
});

const allowedStaffTransitions: Record<string, string[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};

app.patch("/api/staff/tickets/:ticketId", async (req: Request, res: Response) => {
  if (!(await requireStaff(req, res))) return;
  const ticketId = Number(req.params.ticketId);
  if (!Number.isInteger(ticketId) || ticketId <= 0) { res.status(400).json({ error: "Invalid staff ticket request." }); return; }
  const { ownerId, itPriority, currentStatus, expectedVersion, resolutionReason } = req.body ?? {};
  if (Object.keys(req.body ?? {}).some((key) => !["ownerId", "itPriority", "currentStatus", "expectedVersion", "resolutionReason"].includes(key))) { res.status(400).json({ error: "Ticket workflow request contains unsupported fields." }); return; }
  if (ownerId === undefined && itPriority === undefined && currentStatus === undefined) { res.status(400).json({ error: "At least one ticket work field is required." }); return; }
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) { res.status(400).json({ error: "A positive expectedVersion is required." }); return; }
  if (ownerId !== undefined && ownerId !== null && (!Number.isInteger(ownerId) || ownerId <= 0)) { res.status(400).json({ error: "Owner is invalid." }); return; }
  if (itPriority !== undefined && !["LOW", "MEDIUM", "HIGH"].includes(itPriority)) { res.status(400).json({ error: "IT priority is invalid." }); return; }
  if (currentStatus !== undefined && !Object.hasOwn(allowedStaffTransitions, currentStatus)) { res.status(400).json({ error: "Status is invalid." }); return; }
  const reason = typeof resolutionReason === "string" ? resolutionReason.trim() : "";
  if (resolutionReason !== undefined && (typeof resolutionReason !== "string" || resolutionReason.trim().length > 500)) { res.status(400).json({ error: "Reason must be at most 500 characters." }); return; }
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) { res.status(404).json({ error: "Ticket not found." }); return; }
    if (ticket.version !== expectedVersion) { res.status(409).json({ error: "Ticket was changed by another user.", currentVersion: ticket.version, currentStatus: ticket.currentStatus }); return; }
    if (ownerId !== undefined && ownerId !== null) {
      const owner = await prisma.user.findFirst({ where: { id: ownerId, role: "IT_STAFF", isActive: true }, select: { id: true } });
      if (!owner) { res.status(400).json({ error: "Owner must be an active IT Staff user." }); return; }
    }
    const statusChanged = currentStatus !== undefined && currentStatus !== ticket.currentStatus;
    if (statusChanged && !allowedStaffTransitions[ticket.currentStatus].includes(currentStatus)) { res.status(409).json({ error: `Status cannot change from ${ticket.currentStatus} to ${currentStatus}.`, currentVersion: ticket.version, currentStatus: ticket.currentStatus }); return; }
    if (statusChanged && ["CANCELLED", "REOPENED"].includes(currentStatus) && !reason) { res.status(400).json({ error: "A reason is required for cancellation or reopening.", fieldErrors: { resolutionReason: "Enter a reason." } }); return; }
    if (statusChanged && currentStatus === "RESOLVED") {
      const completed = await prisma.ticketAction.findMany({ where: { ticketId, status: "COMPLETED", result: { not: null } }, select: { result: true } });
      if (!completed.some((action) => action.result?.trim())) { res.status(409).json({ error: "Complete an action with a non-empty result before resolving.", currentVersion: ticket.version, currentStatus: ticket.currentStatus }); return; }
    }
    if (statusChanged && currentStatus === "CLOSED" && ticket.currentStatus !== "RESOLVED") { res.status(409).json({ error: "Only resolved tickets can be closed.", currentVersion: ticket.version, currentStatus: ticket.currentStatus }); return; }
    const updatedCount = await prisma.ticket.updateMany({ where: { id: ticketId, version: expectedVersion }, data: { ...(ownerId !== undefined ? { ownerId } : {}), ...(itPriority !== undefined ? { itPriority } : {}), ...(statusChanged ? { currentStatus, ...(reason ? { resolutionReason: reason } : {}) } : {}), version: { increment: 1 } } });
    if (!updatedCount.count) {
      const latest = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { version: true, currentStatus: true } });
      if (!latest) { res.status(404).json({ error: "Ticket not found." }); return; }
      res.status(409).json({ error: "Ticket was changed by another user.", currentVersion: latest.version, currentStatus: latest.currentStatus }); return;
    }
    const updated = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { requester: true, category: true, relatedSystem: true, owner: { select: { id: true, name: true } } } });
    res.status(200).json(updated);
  } catch { res.status(500).json({ error: "Unable to update the staff ticket." }); }
});

const actionInclude = {
  performedBy: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
};

function actionRepresentation<T extends { idempotencyKey: string }>(action: T): Omit<T, "idempotencyKey"> {
  const { idempotencyKey: _key, ...representation } = action;
  return representation;
}

function validIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  return calendarDate.getUTCFullYear() === year && calendarDate.getUTCMonth() === month - 1 && calendarDate.getUTCDate() === day &&
    Number(hourText) <= 23 && Number(minuteText) <= 59 && Number(secondText) <= 59;
}

function trimmedOptional(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? (trimmed || null) : undefined;
}

async function actionTicketAccess(req: Request, res: Response, ticketId: number, write: boolean) {
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: "Authentication is required." }); return null; }
  if (user.mustChangePassword) { res.status(403).json({ error: "A password change is required before using the application." }); return null; }
  if (write && user.role === "REQUESTER") { res.status(403).json({ error: "Staff access is required to change actions." }); return null; }
  if (user.role === "REQUESTER") {
    const requester = await getPrisma().developmentRequester.findUnique({ where: { userId: user.id }, select: { id: true, isActive: true } });
    if (!requester || !requester.isActive) { res.status(403).json({ error: "Requester access is unavailable." }); return null; }
    const ticket = await getPrisma().ticket.findFirst({ where: { id: ticketId, requesterId: requester.id }, select: { id: true } });
    if (!ticket) { res.status(404).json({ error: "Ticket not found." }); return null; }
    return user;
  }
  if (user.role !== "IT_STAFF" && user.role !== "ADMINISTRATOR") { res.status(403).json({ error: "Ticket access is not allowed." }); return null; }
  const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
  if (!ticket) { res.status(404).json({ error: "Ticket not found." }); return null; }
  return user;
}

app.get("/api/tickets/:ticketId/actions", async (req: Request, res: Response) => {
  const ticketId = Number(req.params.ticketId);
  if (!Number.isInteger(ticketId) || ticketId <= 0) { res.status(400).json({ error: "Invalid ticket ID." }); return; }
  try {
    if (!(await actionTicketAccess(req, res, ticketId, false))) return;
    const user = await currentUser(req);
    const actions = await getPrisma().ticketAction.findMany({
      where: { ticketId, ...(user?.role === "REQUESTER" ? { ticket: { requester: { userId: user.id } } } : {}) },
      include: actionInclude,
      orderBy: [{ actionDateTime: "asc" }, { id: "asc" }],
    });
    res.status(200).json(actions.map(actionRepresentation));
  } catch { res.status(500).json({ error: "Unable to retrieve ticket actions." }); }
});

app.post("/api/tickets/:ticketId/actions", async (req: Request, res: Response) => {
  const ticketId = Number(req.params.ticketId);
  if (!Number.isInteger(ticketId) || ticketId <= 0) { res.status(400).json({ error: "Invalid ticket ID." }); return; }
  try {
    const actor = await actionTicketAccess(req, res, ticketId, true);
    if (!actor) return;
    const key = req.header("Idempotency-Key")?.trim() ?? "";
    const body = req.body ?? {};
    const fieldErrors: Record<string, string> = {};
    const accepted = ["actionDateTime", "description", "result", "assigneeId", "followUpRequired", "followUpNote", "attachmentNotes"];
    if (Object.keys(body).some((field) => !accepted.includes(field))) fieldErrors.body = "Action body contains unsupported fields.";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) fieldErrors.idempotencyKey = "A UUID Idempotency-Key header is required.";
    if (!validIsoDate(body.actionDateTime)) fieldErrors.actionDateTime = "A valid ISO-8601 date/time is required.";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (description.length < 1 || description.length > 2000) fieldErrors.description = "Description must be 1-2000 characters.";
    const result = trimmedOptional(body.result, 2000);
    const attachmentNotes = trimmedOptional(body.attachmentNotes, 1000);
    if (body.result !== undefined && result === undefined) fieldErrors.result = "Result must be at most 2000 characters.";
    if (body.attachmentNotes !== undefined && attachmentNotes === undefined) fieldErrors.attachmentNotes = "Attachment notes must be at most 1000 characters.";
    if (typeof body.followUpRequired !== "boolean") fieldErrors.followUpRequired = "Follow-up required must be true or false.";
    const followUpNote = trimmedOptional(body.followUpNote, 1000);
    if (body.followUpNote !== undefined && followUpNote === undefined) fieldErrors.followUpNote = "Follow-up note must be at most 1000 characters.";
    if (body.followUpRequired === true && (typeof followUpNote !== "string" || followUpNote.length === 0)) fieldErrors.followUpNote = "A follow-up note is required.";
    const assigneeId = body.assigneeId === undefined || body.assigneeId === null || body.assigneeId === "" ? null : Number(body.assigneeId);
    if (body.assigneeId !== undefined && assigneeId !== null && (!Number.isInteger(assigneeId) || assigneeId <= 0)) fieldErrors.assigneeId = "Assignee ID is invalid.";
    if (Object.keys(fieldErrors).length) { res.status(400).json({ error: "Validation failed.", fieldErrors }); return; }
    if (assigneeId !== null) {
      const assignee = await getPrisma().user.findFirst({ where: { id: assigneeId, role: "IT_STAFF", isActive: true }, select: { id: true } });
      if (!assignee) { res.status(422).json({ error: "Assignee must be an active IT Staff user." }); return; }
    }

    const data = {
      ticketId, actionDateTime: new Date(body.actionDateTime), description,
      result: result || null, performedById: actor.id, assigneeId,
      followUpRequired: body.followUpRequired as boolean,
      followUpNote: body.followUpRequired ? followUpNote : null,
      attachmentNotes: attachmentNotes || null,
      status: "PLANNED" as const, idempotencyKey: key,
    };
    const existing = await getPrisma().ticketAction.findUnique({ where: { performedById_idempotencyKey: { performedById: actor.id, idempotencyKey: key } }, include: actionInclude });
    if (existing) {
      const same = existing.ticketId === data.ticketId && existing.actionDateTime.getTime() === data.actionDateTime.getTime() && existing.description === data.description && existing.result === data.result && existing.assigneeId === data.assigneeId && existing.followUpRequired === data.followUpRequired && existing.followUpNote === data.followUpNote && existing.attachmentNotes === data.attachmentNotes;
      if (!same) { res.status(409).json({ error: "Idempotency key was already used with a different payload." }); return; }
      res.status(200).json(actionRepresentation(existing)); return;
    }
    let created;
    try {
      created = await getPrisma().ticketAction.create({ data, include: actionInclude });
    } catch (error) {
      const retry = await getPrisma().ticketAction.findUnique({ where: { performedById_idempotencyKey: { performedById: actor.id, idempotencyKey: key } }, include: actionInclude });
      if (!retry) throw error;
      const same = retry.ticketId === data.ticketId && retry.actionDateTime.getTime() === data.actionDateTime.getTime() && retry.description === data.description && retry.result === data.result && retry.assigneeId === data.assigneeId && retry.followUpRequired === data.followUpRequired && retry.followUpNote === data.followUpNote && retry.attachmentNotes === data.attachmentNotes;
      if (!same) { res.status(409).json({ error: "Idempotency key was already used with a different payload." }); return; }
      res.status(200).json(actionRepresentation(retry)); return;
    }
    res.status(201).json(actionRepresentation(created));
  } catch { res.status(500).json({ error: "Unable to create ticket action." }); }
});

app.patch("/api/tickets/:ticketId/actions/:actionId", async (req: Request, res: Response) => {
  const ticketId = Number(req.params.ticketId), actionId = Number(req.params.actionId);
  if (!Number.isInteger(ticketId) || ticketId <= 0 || !Number.isInteger(actionId) || actionId <= 0) { res.status(400).json({ error: "Invalid action request." }); return; }
  try {
    const actor = await actionTicketAccess(req, res, ticketId, true);
    if (!actor) return;
    const body = req.body ?? {};
    const editable = ["description", "result", "assigneeId", "followUpRequired", "followUpNote", "attachmentNotes", "status"];
    if (!Number.isInteger(body.expectedVersion) || body.expectedVersion < 1 || Object.keys(body).some((field) => field !== "expectedVersion" && !editable.includes(field)) || !Object.keys(body).some((field) => editable.includes(field))) {
      res.status(400).json({ error: "Expected version and editable action fields are required." }); return;
    }
    const fieldErrors: Record<string, string> = {};
    const data: Record<string, unknown> = {};
    if (body.description !== undefined) { const value = typeof body.description === "string" ? body.description.trim() : ""; if (!value || value.length > 2000) fieldErrors.description = "Description must be 1-2000 characters."; else data.description = value; }
    for (const field of ["result", "attachmentNotes", "followUpNote"] as const) if (body[field] !== undefined) {
      const max = field === "attachmentNotes" ? 1000 : field === "followUpNote" ? 1000 : 2000;
      const value = trimmedOptional(body[field], max);
      if (value === undefined) fieldErrors[field] = `${field} must be at most ${max} characters.`; else data[field] = value;
    }
    if (body.assigneeId !== undefined) {
      const id = body.assigneeId === null || body.assigneeId === "" ? null : Number(body.assigneeId);
      if (id !== null && (!Number.isInteger(id) || id <= 0)) fieldErrors.assigneeId = "Assignee ID is invalid.";
      else if (id !== null) {
        const assignee = await getPrisma().user.findFirst({ where: { id, role: "IT_STAFF", isActive: true }, select: { id: true } });
        if (!assignee) { res.status(422).json({ error: "Assignee must be an active IT Staff user." }); return; }
        data.assigneeId = id;
      } else data.assigneeId = null;
    }
    if (body.followUpRequired !== undefined) {
      if (typeof body.followUpRequired !== "boolean") fieldErrors.followUpRequired = "Follow-up required must be true or false.";
      else { data.followUpRequired = body.followUpRequired; if (!body.followUpRequired) data.followUpNote = null; }
    }
    const current = await getPrisma().ticketAction.findFirst({ where: { id: actionId, ticketId }, include: actionInclude });
    if (!current) { res.status(404).json({ error: "Action not found." }); return; }
    const followUpRequiredAfterEdit = body.followUpRequired === undefined ? current.followUpRequired : body.followUpRequired;
    const followUpNoteAfterEdit = body.followUpRequired === false ? null : body.followUpNote === undefined ? current.followUpNote : trimmedOptional(body.followUpNote, 1000);
    if (followUpRequiredAfterEdit && (typeof followUpNoteAfterEdit !== "string" || followUpNoteAfterEdit.length === 0)) fieldErrors.followUpNote = "A follow-up note is required.";
    const transitions: Record<string, string[]> = { PLANNED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"], IN_PROGRESS: ["COMPLETED", "CANCELLED"], COMPLETED: [], CANCELLED: [] };
    if (body.status !== undefined && (typeof body.status !== "string" || !Object.hasOwn(transitions, body.status))) fieldErrors.status = "Action status is invalid.";
    if (Object.keys(fieldErrors).length) { res.status(400).json({ error: "Validation failed.", fieldErrors }); return; }
    if (current.status === "COMPLETED" || current.status === "CANCELLED") {
      if (body.status === current.status && Object.keys(data).length === 0) { res.status(200).json(actionRepresentation(current)); return; }
      res.status(409).json({ error: "Terminal actions cannot be edited." }); return;
    }
    if (body.status !== undefined && body.status !== current.status && !transitions[current.status].includes(body.status)) { res.status(409).json({ error: "Action status transition is not allowed." }); return; }
    if (current.version !== body.expectedVersion) { res.status(409).json({ error: "Action was changed by another user.", currentVersion: current.version, currentStatus: current.status }); return; }
    if (body.status !== undefined) data.status = body.status;
    const updated = await getPrisma().ticketAction.updateMany({ where: { id: actionId, ticketId, version: body.expectedVersion, status: { notIn: ["COMPLETED", "CANCELLED"] } }, data: { ...data, version: { increment: 1 } } });
    if (!updated.count) {
      const latest = await getPrisma().ticketAction.findUnique({ where: { id: actionId } });
      if (!latest) { res.status(404).json({ error: "Action not found." }); return; }
      res.status(409).json({ error: "Action was changed by another user.", currentVersion: latest.version, currentStatus: latest.status }); return;
    }
    const saved = await getPrisma().ticketAction.findUnique({ where: { id: actionId }, include: actionInclude });
    if (!saved) { res.status(404).json({ error: "Action not found." }); return; }
    res.status(200).json(actionRepresentation(saved));
  } catch { res.status(500).json({ error: "Unable to update ticket action." }); }
});

app.get("/api/tickets/:ticketId/comments", async (req: Request, res: Response) => {
  const ticketId = Number(req.params.ticketId);
  if (!Number.isInteger(ticketId) || ticketId <= 0) { res.status(400).json({ error: "Invalid ticket request." }); return; }
  if (!(await requireTicketParticipant(req, res, ticketId))) return;
  try { res.status(200).json(await getPrisma().publicComment.findMany({ where: { ticketId }, include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } })); }
  catch { res.status(500).json({ error: "Unable to retrieve public comments." }); }
});

app.post("/api/tickets/:ticketId/comments", async (req: Request, res: Response) => {
  const ticketId = Number(req.params.ticketId);
  if (!Number.isInteger(ticketId) || ticketId <= 0) { res.status(400).json({ error: "Invalid ticket request." }); return; }
  const user = await requireTicketParticipant(req, res, ticketId, false);
  if (!user) return;
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (body.length < 1 || body.length > 2000) { res.status(400).json({ error: "Comment must be 1-2,000 characters." }); return; }
  try {
    if (!(await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true } }))) { res.status(404).json({ error: "Ticket not found." }); return; }
    res.status(201).json(await getPrisma().publicComment.create({ data: { ticketId, authorId: user.id, body }, include: { author: { select: { id: true, name: true, role: true } } } }));
  }
  catch { res.status(500).json({ error: "Unable to add public comment." }); }
});

app.get("/api/tickets/:ticketId/notes", async (req: Request, res: Response) => {
  const ticketId = Number(req.params.ticketId);
  if (!Number.isInteger(ticketId) || ticketId <= 0) { res.status(400).json({ error: "Invalid ticket request." }); return; }
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: "Authentication is required." }); return; }
  if (user.mustChangePassword || !["IT_STAFF", "ADMINISTRATOR"].includes(user.role)) { res.status(403).json({ error: "Internal notes are restricted to IT Staff and Administrators." }); return; }
  try { res.status(200).json(await getPrisma().internalNote.findMany({ where: { ticketId }, include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } })); }
  catch { res.status(500).json({ error: "Unable to retrieve internal notes." }); }
});

app.post("/api/tickets/:ticketId/notes", async (req: Request, res: Response) => {
  const ticketId = Number(req.params.ticketId);
  if (!Number.isInteger(ticketId) || ticketId <= 0) { res.status(400).json({ error: "Invalid ticket request." }); return; }
  if (!(await requireStaff(req, res))) return;
  const user = await currentUser(req);
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (!user || body.length < 1 || body.length > 2000) { res.status(400).json({ error: "Internal note must be 1-2,000 characters." }); return; }
  try {
    if (!(await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true } }))) { res.status(404).json({ error: "Ticket not found." }); return; }
    res.status(201).json(await getPrisma().internalNote.create({ data: { ticketId, authorId: user.id, body }, include: { author: { select: { id: true, name: true, role: true } } } }));
  }
  catch { res.status(500).json({ error: "Unable to add internal note." }); }
});

app.post("/api/tickets", async (req: Request, res: Response) => {
  const requesterId = await requireRequester(req, res);
  if (!requesterId) return;
  const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body ?? {};
  const parsedCategoryId = Number(categoryId);
  const parsedRelatedSystemId = Number(relatedSystemId);
  const fieldErrors: Record<string, string> = {};

  if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) fieldErrors.categoryId = "Category is required.";
  if (!Number.isInteger(parsedRelatedSystemId) || parsedRelatedSystemId <= 0) fieldErrors.relatedSystemId = "Related system is required.";
  const trimmedSummary = typeof summary === "string" ? summary.trim() : "";
  const trimmedDescription = typeof description === "string" ? description.trim() : "";
  if (trimmedSummary.length < 5 || trimmedSummary.length > 120) fieldErrors.summary = "Summary must be 5-120 characters.";
  if (trimmedDescription.length < 10 || trimmedDescription.length > 5000) fieldErrors.description = "Description must be 10-5000 characters.";
  if (!["LOW", "MEDIUM", "HIGH"].includes(requestedPriority)) fieldErrors.requestedPriority = "Requested priority is invalid.";

  if (Object.keys(fieldErrors).length > 0) {
    res.status(400).json({ error: "Validation failed.", fieldErrors });
    return;
  }

  try {
    const prisma = getPrisma();
    const [requester, category, relatedSystem] = await Promise.all([
      prisma.developmentRequester.findFirst({ where: { id: requesterId, isActive: true } }),
      prisma.category.findUnique({ where: { id: parsedCategoryId } }),
      prisma.relatedSystem.findUnique({ where: { id: parsedRelatedSystemId } }),
    ]);

    if (!requester || !category || !relatedSystem) {
      res.status(400).json({ error: "One or more selected references are invalid." });
      return;
    }

    let ticket;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        ticket = await prisma.ticket.create({
          data: {
            ticketNumber: generateTicketNumber(),
            requesterId,
            categoryId: parsedCategoryId,
            relatedSystemId: parsedRelatedSystemId,
            summary: trimmedSummary,
            description: trimmedDescription,
            requestedPriority,
            itPriority: requestedPriority,
          },
          include: { requester: true, category: true, relatedSystem: true },
        });
        break;
      } catch (error) {
        if (attempt === 2 || !(error instanceof Error) || !error.message.includes("ticketNumber")) throw error;
      }
    }

    res.status(201).json(ticket);
  } catch {
    res.status(500).json({ error: "Unable to create ticket." });
  }
});

app.get("/api/tickets", async (req: Request, res: Response) => {
  const requesterId = await requireRequester(req, res);
  if (!requesterId) return;
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 10);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const requestedPriority = req.query.requestedPriority;
  const currentStatus = req.query.currentStatus;
  const sortBy = req.query.sortBy ?? "createdAt";
  const sortOrder = req.query.sortOrder ?? "desc";
  const sortFields = ["ticketNumber", "createdAt", "summary", "updatedAt"];

  if (!Number.isInteger(page) || page < 1 || ![5, 10, 20].includes(pageSize) || !sortFields.includes(String(sortBy)) || !["asc", "desc"].includes(String(sortOrder))) {
    res.status(400).json({ error: "Invalid ticket list query." });
    return;
  }

  const where = {
    requesterId,
    ...(search ? { OR: [{ ticketNumber: { contains: search, mode: "insensitive" as const } }, { summary: { contains: search, mode: "insensitive" as const } }] } : {}),
    ...(categoryId !== undefined && Number.isInteger(categoryId) ? { categoryId } : {}),
    ...(requestedPriority && ["LOW", "MEDIUM", "HIGH"].includes(String(requestedPriority)) ? { requestedPriority: String(requestedPriority) as "LOW" | "MEDIUM" | "HIGH" } : {}),
    ...(currentStatus === "NEW" ? { currentStatus: "NEW" as const } : {}),
  };

  try {
    const prisma = getPrisma();
    const [totalItems, items] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        include: { category: true, relatedSystem: true },
        orderBy: [{ [String(sortBy)]: String(sortOrder) }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.status(200).json({
      items,
      pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    });
  } catch {
    res.status(500).json({ error: "Unable to retrieve tickets." });
  }
});

app.patch("/api/tickets/:ticketId/resolution-feedback", async (req: Request, res: Response) => {
  const requesterId = await requireRequester(req, res);
  if (!requesterId) return;
  const ticketId = Number(req.params.ticketId);
  const { appearsResolved, expectedVersion } = req.body ?? {};
  if (!Number.isInteger(ticketId) || ticketId <= 0 || typeof appearsResolved !== "boolean" || !Number.isInteger(expectedVersion) || expectedVersion < 1 || Object.keys(req.body ?? {}).some((key) => !["appearsResolved", "expectedVersion"].includes(key))) {
    res.status(400).json({ error: "appearsResolved and a positive expectedVersion are required." }); return;
  }
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, requesterId }, select: { id: true, requesterResolved: true, currentStatus: true, version: true } });
    if (!ticket) { res.status(404).json({ error: "Ticket not found." }); return; }
    if (["CLOSED", "CANCELLED"].includes(ticket.currentStatus)) { res.status(409).json({ error: "Feedback is unavailable for terminal tickets.", currentVersion: ticket.version, currentStatus: ticket.currentStatus }); return; }
    if (ticket.version !== expectedVersion) { res.status(409).json({ error: "Ticket was changed by another user.", currentVersion: ticket.version, currentStatus: ticket.currentStatus }); return; }
    const changed = await prisma.ticket.updateMany({ where: { id: ticketId, requesterId, version: expectedVersion, currentStatus: { notIn: ["CLOSED", "CANCELLED"] } }, data: { requesterResolved: appearsResolved, version: { increment: 1 } } });
    if (!changed.count) {
      const latest = await prisma.ticket.findFirst({ where: { id: ticketId, requesterId }, select: { version: true, currentStatus: true } });
      if (!latest) { res.status(404).json({ error: "Ticket not found." }); return; }
      res.status(409).json({ error: "Ticket was changed by another user.", currentVersion: latest.version, currentStatus: latest.currentStatus }); return;
    }
    const updated = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { id: true, ticketNumber: true, requesterResolved: true, currentStatus: true, version: true, updatedAt: true } });
    res.status(200).json(updated);
  } catch { res.status(500).json({ error: "Unable to save resolution feedback." }); }
});

app.get("/api/tickets/:ticketId", async (req: Request, res: Response) => {
  const ticketId = Number(req.params.ticketId);
  const requesterId = await requireRequester(req, res);
  if (!requesterId) return;

  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    res.status(400).json({ error: "Invalid ticket request." });
    return;
  }

  try {
    const ticket = await getPrisma().ticket.findFirst({
      where: { id: ticketId, requesterId },
      include: { requester: true, category: true, relatedSystem: true, attachments: { orderBy: { uploadedAt: "desc" } } },
    });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found." });
      return;
    }

    res.status(200).json(ticket);
  } catch {
    res.status(500).json({ error: "Unable to retrieve ticket." });
  }
});

app.get("/api/tickets/:ticketId/attachments", async (req: Request, res: Response) => {
  const ticketId = Number(req.params.ticketId);
  const requesterId = await requireRequester(req, res);
  if (!requesterId) return;
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    res.status(400).json({ error: "Invalid attachment request." });
    return;
  }
  try {
    const ticket = await getPrisma().ticket.findFirst({ where: { id: ticketId, requesterId } });
    if (!ticket) { res.status(404).json({ error: "Ticket not found." }); return; }
    const attachments = await getPrisma().attachment.findMany({
      where: { ticketId },
      select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true, uploadedAt: true, removedAt: true, removalReason: true },
      orderBy: { uploadedAt: "desc" },
    });
    res.status(200).json(attachments);
  } catch { res.status(500).json({ error: "Unable to retrieve attachments." }); }
});

app.post("/api/tickets/:ticketId/attachments", (req: Request, res: Response, next: express.NextFunction) => {
  attachmentUpload.single("file")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") { res.status(413).json({ error: "Attachment exceeds the 5 MB limit." }); return; }
    if (error || !req.file) { res.status(400).json({ error: "Attachment must be JPG, JPEG, PNG, WEBP, or PDF." }); return; }
    next();
  });
}, async (req: Request, res: Response) => {
  const ticketId = Number(req.params.ticketId);
  const requesterId = await requireRequester(req, res);
  if (!requesterId) return;
  if (!Number.isInteger(ticketId) || ticketId <= 0) { res.status(400).json({ error: "Invalid attachment request." }); return; }
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, requesterId } });
    if (!ticket) { res.status(404).json({ error: "Ticket not found." }); return; }
    const activeCount = await prisma.attachment.count({ where: { ticketId, removedAt: null } });
    if (activeCount >= 5) { res.status(409).json({ error: "A ticket can have at most five active attachments." }); return; }
    const file = req.file;
    if (!file) { res.status(400).json({ error: "Attachment file is required." }); return; }
    const attachment = await prisma.attachment.create({
      data: { ticketId, originalFilename: file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_"), storedFilename: randomUUID(), mimeType: file.mimetype, sizeBytes: file.size, content: file.buffer },
      select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true, uploadedAt: true, removedAt: true, removalReason: true },
    });
    res.status(201).json(attachment);
  } catch { res.status(500).json({ error: "Unable to upload attachment." }); }
});

app.get("/api/attachments/:attachmentId/download", async (req: Request, res: Response) => {
  const attachmentId = Number(req.params.attachmentId);
  const requesterId = await requireRequester(req, res);
  if (!requesterId) return;
  if (!Number.isInteger(attachmentId) || attachmentId <= 0) { res.status(400).json({ error: "Invalid attachment request." }); return; }
  try {
    const attachment = await getPrisma().attachment.findFirst({ where: { id: attachmentId, removedAt: null, ticket: { requesterId } } });
    if (!attachment) { res.status(404).json({ error: "Attachment not found." }); return; }
    res.type(attachment.mimeType).attachment(attachment.originalFilename).send(Buffer.from(attachment.content));
  } catch { res.status(500).json({ error: "Unable to download attachment." }); }
});

app.delete("/api/attachments/:attachmentId", async (req: Request, res: Response) => {
  const attachmentId = Number(req.params.attachmentId);
  const requesterId = await requireRequester(req, res);
  if (!requesterId) return;
  const reason = typeof req.body?.removalReason === "string" ? req.body.removalReason.trim() : "";
  if (!Number.isInteger(attachmentId) || attachmentId <= 0 || reason.length < 3 || reason.length > 500) { res.status(400).json({ error: "A removal reason of 3-500 characters is required." }); return; }
  try {
    const attachment = await getPrisma().attachment.findFirst({ where: { id: attachmentId, removedAt: null, ticket: { requesterId } } });
    if (!attachment) { res.status(404).json({ error: "Attachment not found." }); return; }
    const removed = await getPrisma().attachment.update({ where: { id: attachmentId }, data: { removedAt: new Date(), removalReason: reason }, select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true, uploadedAt: true, removedAt: true, removalReason: true } });
    res.status(200).json(removed);
  } catch { res.status(500).json({ error: "Unable to remove attachment." }); }
});

export default app;
