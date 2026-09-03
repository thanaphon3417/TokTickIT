import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe("Requester Ticket Detail", () => {
  it("shows read-only detail and marks removed attachments without a download", async () => {
    vi.spyOn(api, "getActiveRequesters").mockResolvedValue([{ id: 1, name: "Amina Lee", email: "amina@example.com" }]);
    vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]); vi.spyOn(api, "getSystems").mockResolvedValue([{ id: 1, name: "Laptop" }]);
    vi.spyOn(api, "getTickets").mockResolvedValue({ items: [{ id: 7, ticketNumber: "TKT-2026-000007", summary: "Owned ticket", requestedPriority: "MEDIUM", currentStatus: "NEW", createdAt: "2026-01-01", updatedAt: "2026-01-01", category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Laptop" } }], pagination: { page: 1, pageSize: 5, totalItems: 1, totalPages: 1 } });
    vi.spyOn(api, "getTicket").mockResolvedValue({ id: 7, ticketNumber: "TKT-2026-000007", ticketDate: "2026-01-01", summary: "Owned ticket", description: "Detail is read only for the requester.", requestedPriority: "MEDIUM", currentStatus: "NEW", createdAt: "2026-01-01", updatedAt: "2026-01-01", requester: { id: 1, name: "Amina Lee", email: "amina@example.com" }, category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Laptop" }, attachments: [{ id: 5, originalFilename: "removed.pdf", mimeType: "application/pdf", sizeBytes: 12, uploadedAt: "2026-01-01", removedAt: "2026-01-02", removalReason: "Wrong file" }] });
    const user = userEvent.setup(); render(<App />); await user.selectOptions(await screen.findByLabelText(/Development Requester/i), "1"); await user.click(screen.getByRole("button", { name: "Continue" })); await user.click(screen.getByRole("button", { name: "My Tickets" })); await user.click(await screen.findByRole("button", { name: "TKT-2026-000007" }));
    expect(await screen.findByLabelText("Ticket Detail")).toBeInTheDocument();
    expect(screen.getByText(/Removed: Wrong file/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Download" })).not.toBeInTheDocument();
  });
});
