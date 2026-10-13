import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import StaffQueue from "../../src/StaffQueue.js";

afterEach(() => vi.restoreAllMocks());

describe("Ticket workflow UI", () => {
  it("shows requester resolution feedback as read-only in staff detail", async () => {
    const base = { id: 7, ticketNumber: "TKT-2026-000007", summary: "Owned ticket", requestedPriority: "MEDIUM", currentStatus: "OPEN", requesterResolved: true, version: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01", category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Laptop" }, requester: { id: 3, name: "Amina", email: "amina@example.com", role: "REQUESTER" as const, mustChangePassword: false }, itPriority: "MEDIUM" as const, owner: null };
    vi.spyOn(api, "getCategories").mockResolvedValue([]); vi.spyOn(api, "getStaffUsers").mockResolvedValue([]);
    vi.spyOn(api, "getStaffTickets").mockResolvedValue({ items: [base], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } });
    vi.spyOn(api, "getStaffTicket").mockResolvedValue({ ...base, description: "Ticket detail", ticketDate: "2026-01-01", resolutionReason: null, attachments: [] });
    vi.spyOn(api, "getTicketActions").mockResolvedValue([]); vi.spyOn(api, "getTicketComments").mockResolvedValue([]); vi.spyOn(api, "getInternalNotes").mockResolvedValue([]);
    const user = userEvent.setup(); render(<StaffQueue staffName="Iris" onLogout={() => undefined} onDashboard={() => undefined} />);
    await user.click(await screen.findByRole("button", { name: base.ticketNumber }));
    expect(await screen.findByText("Problem appears resolved (advisory)")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Problem appears resolved" })).not.toBeInTheDocument();
  });
});
