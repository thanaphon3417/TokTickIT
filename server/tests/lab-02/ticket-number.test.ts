import { describe, expect, it } from "vitest";
import { generateTicketNumber } from "../../src/ticket-number.js";

describe("generateTicketNumber", () => {
  it("returns the required official format for the supplied year", () => {
    expect(generateTicketNumber(new Date("2026-09-03T00:00:00.000Z"))).toMatch(/^TKT-2026-\d{6}$/);
  });
});
