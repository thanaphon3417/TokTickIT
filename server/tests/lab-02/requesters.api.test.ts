import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

void request;
void app;

describe("GET /api/requesters/active", () => {
  it("returns only active seeded requesters ordered by name", async () => {
    const response = await request(app).get("/api/requesters/active");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(4);
    expect(response.body.map((requester: { name: string }) => requester.name)).toEqual([
      "Amina Lee",
      "Ben Carter",
      "Chalida Wong",
      "Daniel Kim",
    ]);
    expect(response.body.every((requester: { email: string }) => requester.email !== "inactive@example.com")).toBe(true);
  });
});
