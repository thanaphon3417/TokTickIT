import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/tickets/:ticketId", () => {
  it("returns an owned ticket as read-only detail data", async () => {
    const created = await request(app).post("/api/tickets").send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Need account access",
      description: "I need access to the shared account for my work.",
      requestedPriority: "MEDIUM",
    });

    const response = await request(app).get(`/api/tickets/${created.body.id}?requesterId=1`);

    expect(response.status).toBe(200);
    expect(response.body.ticketNumber).toBe(created.body.ticketNumber);
    expect(response.body.requester.id).toBe(1);
    expect(response.body.category.name).toBe("Account and Access");
  });

  it("hides a ticket from another requester", async () => {
    const created = await request(app).post("/api/tickets").send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Private requester ticket",
      description: "This ticket must not be visible to another requester.",
      requestedPriority: "LOW",
    });

    const response = await request(app).get(`/api/tickets/${created.body.id}?requesterId=2`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Ticket not found.");
  });
});