import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("POST /api/tickets", () => {
  it("creates a ticket with backend defaults and generated number", async () => {
    const response = await request(app).post("/api/tickets").send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Cannot access email",
      description: "The email application rejects my password.",
      requestedPriority: "HIGH",
    });

    expect(response.status).toBe(201);
    expect(response.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(response.body.currentStatus).toBe("NEW");
    expect(response.body.requester.id).toBe(1);
    expect(response.body.summary).toBe("Cannot access email");
  });

  it("rejects invalid ticket fields without creating a ticket", async () => {
    const response = await request(app).post("/api/tickets").send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: " bad ",
      description: "short",
      requestedPriority: "URGENT",
    });

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors.summary).toBeDefined();
    expect(response.body.fieldErrors.description).toBeDefined();
    expect(response.body.fieldErrors.requestedPriority).toBeDefined();
  });
});