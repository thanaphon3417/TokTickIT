import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

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

export default app;
