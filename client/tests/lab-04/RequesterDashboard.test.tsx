import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RequesterDashboard from "../../src/RequesterDashboard.js";

const api = vi.hoisted(() => ({ getRequesterDashboard: vi.fn() }));
vi.mock("../../src/api.js", async (original) => ({ ...(await original<typeof import("../../src/api.js")>()), ...api }));

const ticket = { id: 8, ticketNumber: "TKT-8", summary: "Laptop repair", currentStatus: "WAITING_FOR_REQUESTER", requestedPriority: "HIGH", updatedAt: "2026-10-12T10:00:00.000Z" };

describe("Requester dashboard", () => {
  beforeEach(() => { vi.clearAllMocks(); api.getRequesterDashboard.mockResolvedValue({ metrics: { open: 2, waitingForRequester: 1, recentlyUpdated: 1, recentlyResolved: 0 }, recentTickets: [ticket], attentionTickets: [ticket], recentlyResolvedTickets: [] }); });

  it("shows backend metrics, ticket lists, and opens filtered tickets or detail", async () => {
    const user = userEvent.setup(); const onOpenTickets = vi.fn(); const onOpenTicket = vi.fn();
    const onOpenAllTickets = vi.fn();
    render(<RequesterDashboard onOpenTickets={onOpenTickets} onOpenAllTickets={onOpenAllTickets} onOpenTicket={onOpenTicket} />);
    expect(await screen.findAllByText("Laptop repair")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Open tickets 2/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Waiting for you 1/ }));
    expect(onOpenTickets).toHaveBeenCalledWith("waiting");
    await user.click(screen.getAllByRole("button", { name: /TKT-8 Laptop repair/ })[0]);
    expect(onOpenTicket).toHaveBeenCalledWith(8);
    expect(screen.getByText("No recently resolved tickets.")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "My Tickets" })[0]);
    expect(onOpenAllTickets).toHaveBeenCalledOnce();
  });

  it("shows a recoverable dashboard error", async () => {
    api.getRequesterDashboard.mockRejectedValueOnce(new Error("Dashboard unavailable"));
    render(<RequesterDashboard onOpenTickets={() => undefined} onOpenAllTickets={() => undefined} onOpenTicket={() => undefined} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Dashboard unavailable");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
