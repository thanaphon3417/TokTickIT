import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe("My Tickets", () => {
  it("loads requester-owned tickets and exposes search controls", async () => {
    vi.spyOn(api, "getActiveRequesters").mockResolvedValue([{ id: 1, name: "Amina Lee", email: "amina@example.com" }]);
    vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
    vi.spyOn(api, "getSystems").mockResolvedValue([{ id: 1, name: "Laptop" }]);
    const getTickets = vi.spyOn(api, "getTickets").mockResolvedValue({ items: [{ id: 7, ticketNumber: "TKT-2026-000007", summary: "Owned ticket", requestedPriority: "MEDIUM", currentStatus: "NEW", createdAt: "2026-01-01", updatedAt: "2026-01-01", category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Laptop" } }], pagination: { page: 1, pageSize: 5, totalItems: 1, totalPages: 1 } });
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(await screen.findByLabelText(/Development Requester/i), "1");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "My Tickets" }));
    expect(await screen.findByText("Owned ticket")).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
    expect(getTickets).toHaveBeenCalledWith(expect.objectContaining({ requesterId: 1, page: 1 }));
  });
});
