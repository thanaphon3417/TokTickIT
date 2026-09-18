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
  if (user.role !== "IT_STAFF") { res.status(403).json({ error: "IT Staff access is required." }); return false; }
  if (user.mustChangePassword) { res.status(403).json({ error: "A password change is required before using the application." }); return false; }
  return true;
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
  const { ownerId, itPriority, currentStatus } = req.body ?? {};
  if (ownerId === undefined && itPriority === undefined && currentStatus === undefined) { res.status(400).json({ error: "At least one ticket work field is required." }); return; }
  if (ownerId !== undefined && ownerId !== null && (!Number.isInteger(ownerId) || ownerId <= 0)) { res.status(400).json({ error: "Owner is invalid." }); return; }
  if (itPriority !== undefined && !["LOW", "MEDIUM", "HIGH"].includes(itPriority)) { res.status(400).json({ error: "IT priority is invalid." }); return; }
  if (currentStatus !== undefined && !Object.hasOwn(allowedStaffTransitions, currentStatus)) { res.status(400).json({ error: "Status is invalid." }); return; }
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) { res.status(404).json({ error: "Ticket not found." }); return; }
    if (ownerId !== undefined && ownerId !== null) {
      const owner = await prisma.user.findFirst({ where: { id: ownerId, role: "IT_STAFF", isActive: true }, select: { id: true } });
      if (!owner) { res.status(400).json({ error: "Owner must be an active IT Staff user." }); return; }
    }
    if (currentStatus !== undefined && currentStatus !== ticket.currentStatus && !allowedStaffTransitions[ticket.currentStatus].includes(currentStatus)) { res.status(409).json({ error: `Status cannot change from ${ticket.currentStatus} to ${currentStatus}.` }); return; }
    const updated = await prisma.ticket.update({ where: { id: ticketId }, data: { ...(ownerId !== undefined ? { ownerId } : {}), ...(itPriority !== undefined ? { itPriority } : {}), ...(currentStatus !== undefined ? { currentStatus } : {}) }, include: { requester: true, category: true, relatedSystem: true, owner: { select: { id: true, name: true } } } });
    res.status(200).json(updated);
  } catch { res.status(500).json({ error: "Unable to update the staff ticket." }); }
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
