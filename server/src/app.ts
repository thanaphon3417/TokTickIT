import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { getPrisma } from "./prisma.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

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

app.post("/api/tickets", async (req: Request, res: Response) => {
  const { requesterId, categoryId, relatedSystemId, summary, description, requestedPriority } = req.body ?? {};
  const parsedRequesterId = Number(requesterId);
  const parsedCategoryId = Number(categoryId);
  const parsedRelatedSystemId = Number(relatedSystemId);
  const fieldErrors: Record<string, string> = {};

  if (!Number.isInteger(parsedRequesterId) || parsedRequesterId <= 0) fieldErrors.requesterId = "Requester is required.";
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
      prisma.developmentRequester.findFirst({ where: { id: parsedRequesterId, isActive: true } }),
      prisma.category.findUnique({ where: { id: parsedCategoryId } }),
      prisma.relatedSystem.findUnique({ where: { id: parsedRelatedSystemId } }),
    ]);

    if (!requester || !category || !relatedSystem) {
      res.status(400).json({ error: "One or more selected references are invalid." });
      return;
    }

    const year = new Date().getFullYear();
    let ticket;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        ticket = await prisma.ticket.create({
          data: {
            ticketNumber: `TKT-${year}-${Date.now().toString().slice(-6)}`,
            requesterId: parsedRequesterId,
            categoryId: parsedCategoryId,
            relatedSystemId: parsedRelatedSystemId,
            summary: trimmedSummary,
            description: trimmedDescription,
            requestedPriority,
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
  const requesterId = Number(req.query.requesterId);
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 10);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const requestedPriority = req.query.requestedPriority;
  const currentStatus = req.query.currentStatus;
  const sortBy = req.query.sortBy ?? "createdAt";
  const sortOrder = req.query.sortOrder ?? "desc";
  const sortFields = ["ticketNumber", "createdAt", "summary", "updatedAt"];

  if (!Number.isInteger(requesterId) || requesterId <= 0 || !Number.isInteger(page) || page < 1 || ![5, 10, 20].includes(pageSize) || !sortFields.includes(String(sortBy)) || !["asc", "desc"].includes(String(sortOrder))) {
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
  const requesterId = Number(req.query.requesterId);

  if (!Number.isInteger(ticketId) || ticketId <= 0 || !Number.isInteger(requesterId) || requesterId <= 0) {
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
  const requesterId = Number(req.query.requesterId);
  if (!Number.isInteger(ticketId) || !Number.isInteger(requesterId) || ticketId <= 0 || requesterId <= 0) {
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
  const requesterId = Number(req.query.requesterId);
  if (!Number.isInteger(ticketId) || !Number.isInteger(requesterId) || ticketId <= 0 || requesterId <= 0) { res.status(400).json({ error: "Invalid attachment request." }); return; }
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
  const requesterId = Number(req.query.requesterId);
  if (!Number.isInteger(attachmentId) || !Number.isInteger(requesterId) || attachmentId <= 0 || requesterId <= 0) { res.status(400).json({ error: "Invalid attachment request." }); return; }
  try {
    const attachment = await getPrisma().attachment.findFirst({ where: { id: attachmentId, removedAt: null, ticket: { requesterId } } });
    if (!attachment) { res.status(404).json({ error: "Attachment not found." }); return; }
    res.type(attachment.mimeType).attachment(attachment.originalFilename).send(Buffer.from(attachment.content));
  } catch { res.status(500).json({ error: "Unable to download attachment." }); }
});

app.delete("/api/attachments/:attachmentId", async (req: Request, res: Response) => {
  const attachmentId = Number(req.params.attachmentId);
  const requesterId = Number(req.query.requesterId);
  const reason = typeof req.body?.removalReason === "string" ? req.body.removalReason.trim() : "";
  if (!Number.isInteger(attachmentId) || !Number.isInteger(requesterId) || attachmentId <= 0 || requesterId <= 0 || reason.length < 3 || reason.length > 500) { res.status(400).json({ error: "A removal reason of 3-500 characters is required." }); return; }
  try {
    const attachment = await getPrisma().attachment.findFirst({ where: { id: attachmentId, removedAt: null, ticket: { requesterId } } });
    if (!attachment) { res.status(404).json({ error: "Attachment not found." }); return; }
    const removed = await getPrisma().attachment.update({ where: { id: attachmentId }, data: { removedAt: new Date(), removalReason: reason }, select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true, uploadedAt: true, removedAt: true, removalReason: true } });
    res.status(200).json(removed);
  } catch { res.status(500).json({ error: "Unable to remove attachment." }); }
});

export default app;
