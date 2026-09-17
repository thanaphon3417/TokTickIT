import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";
const requester = { id: 1, name: "Amina", email: "amina@example.com", role: "REQUESTER" as const, mustChangePassword: false };
afterEach(() => vi.restoreAllMocks());
describe("My Tickets", () => { it("loads tickets for the authenticated requester", async () => { vi.spyOn(api, "getCurrentUser").mockResolvedValue(requester); vi.spyOn(api, "getCategories").mockResolvedValue([]); vi.spyOn(api, "getSystems").mockResolvedValue([]); vi.spyOn(api, "getTickets").mockResolvedValue({ items: [{ id: 7, ticketNumber: "TKT-2026-000007", summary: "Owned ticket", requestedPriority: "MEDIUM", currentStatus: "NEW", createdAt: "2026-01-01", updatedAt: "2026-01-01", category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Laptop" } }], pagination: { page: 1, pageSize: 5, totalItems: 1, totalPages: 1 } }); const user = userEvent.setup(); render(<App />); await user.click(await screen.findByRole("button", { name: "My Tickets" })); expect(await screen.findByText("Owned ticket")).toBeInTheDocument(); }); });
