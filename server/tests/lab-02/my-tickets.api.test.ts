import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/tickets", () => {
  it("returns only the selected requester's tickets with query controls", async () => {
    const created = await request(app).post("/api/tickets").send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "VPN access is unavailable",
      description: "The VPN client cannot connect from the campus network.",
      requestedPriority: "HIGH",
    });

    expect(created.status).toBe(201);

    const response = await request(app).get(
      "/api/tickets?requesterId=1&search=VPN&page=1&pageSize=5&sortBy=createdAt&sortOrder=desc",
    );

    expect(response.status).toBe(200);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.pageSize).toBe(5);
    expect(response.body.items.some((ticket: { id: number }) => ticket.id === created.body.id)).toBe(true);
    expect(response.body.items.every((ticket: { requesterId: number }) => ticket.requesterId === 1)).toBe(true);
  });

  it("does not return another requester's tickets", async () => {
    const response = await request(app).get("/api/tickets?requesterId=2&search=VPN");

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(0);
  });
});
