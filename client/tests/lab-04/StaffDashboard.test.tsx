import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffDashboard from "../../src/StaffDashboard.js";

const api = vi.hoisted(() => ({ getStaffDashboard: vi.fn() }));
vi.mock("../../src/api.js", async (original) => ({ ...(await original<typeof import("../../src/api.js")>()), ...api }));

describe("Staff dashboard", () => {
  beforeEach(() => { vi.clearAllMocks(); api.getStaffDashboard.mockResolvedValue({ metrics: { unassigned: 2, ownedByMe: 1, byStatus: { OPEN: 3 }, byPriority: { HIGH: 1 }, myOpenActions: 1 }, myActions: [{ id: 2, ticketId: 7, description: "Check VPN", status: "PLANNED", updatedAt: "2026-10-12T10:00:00Z", ticket: { id: 7, ticketNumber: "TKT-7", summary: "VPN" } }], recentTickets: [], urgentTickets: [] }); });

  it("shows metrics and routes filter chips and actions to matching details", async () => {
    const user = userEvent.setup(); const onOpenQueue = vi.fn(); const onOpenTicket = vi.fn(); const onOpenAction = vi.fn();
    render(<StaffDashboard staffName="Iris" onLogout={() => undefined} onOpenQueue={onOpenQueue} onOpenTicket={onOpenTicket} onOpenAction={onOpenAction} />);
    expect(await screen.findByText("Check VPN")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Unassigned tickets 2/ }));
    expect(onOpenQueue).toHaveBeenCalledWith(expect.objectContaining({ owner: "unassigned", activeOnly: true }));
    await user.click(screen.getByRole("button", { name: /OPEN 3/ }));
    expect(onOpenQueue).toHaveBeenCalledWith(expect.objectContaining({ currentStatus: "OPEN", activeOnly: true }));
    await user.click(screen.getByRole("button", { name: /TKT-7 Check VPN/ }));
    expect(onOpenAction).toHaveBeenCalledWith(7, 2);
    expect(screen.getByText("No non-terminal tickets to show.")).toBeInTheDocument();
  });

  it("shows empty metrics and a retryable error", async () => {
    api.getStaffDashboard.mockResolvedValueOnce({ metrics: { unassigned: 0, ownedByMe: 0, byStatus: {}, byPriority: {}, myOpenActions: 0 }, myActions: [], recentTickets: [], urgentTickets: [] });
    const props = { staffName: "Iris", onLogout: () => undefined, onOpenQueue: () => undefined, onOpenTicket: () => undefined, onOpenAction: () => undefined };
    const { unmount } = render(<StaffDashboard {...props} />);
    expect(await screen.findByText("No open actions are assigned to you.")).toBeInTheDocument(); unmount();
    api.getStaffDashboard.mockRejectedValueOnce(new Error("Dashboard unavailable"));
    render(<StaffDashboard {...props} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Dashboard unavailable");
  });
});
