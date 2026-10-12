import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActionsTaken from "../../src/ActionsTaken.js";
import { TicketAction } from "../../src/api.js";

const api = vi.hoisted(() => ({ getTicketActions: vi.fn(), getStaffUsers: vi.fn(), createTicketAction: vi.fn(), updateTicketAction: vi.fn() }));
vi.mock("../../src/api.js", async (importOriginal) => ({ ...(await importOriginal<typeof import("../../src/api.js")>()), ...api }));

const action: TicketAction = { id: 9, ticketId: 3, actionDateTime: "2026-10-12T10:00:00.000Z", description: "Restarted service", result: "Service is online", performedById: 4, assigneeId: null, followUpRequired: false, followUpNote: null, attachmentNotes: null, status: "PLANNED", version: 2, createdAt: "2026-10-12T10:00:00.000Z", updatedAt: "2026-10-12T10:00:00.000Z", performedBy: { id: 4, name: "Staff A", email: "a@example.com" }, assignee: null };

describe("Actions Taken UI", () => {
  beforeEach(() => { vi.clearAllMocks(); api.getTicketActions.mockResolvedValue([]); api.getStaffUsers.mockResolvedValue([{ id: 4, name: "Staff A", email: "a@example.com" }]); });

  it("shows actions read-only to a requester", async () => {
    api.getTicketActions.mockResolvedValue([action]);
    render(<ActionsTaken ticketId={3} canEdit={false} />);
    expect(await screen.findByText("Restarted service")).toBeInTheDocument();
    expect(screen.getByText("Service is online")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add action" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit action" })).not.toBeInTheDocument();
  });

  it("preserves create values and reuses its idempotency key after a network failure", async () => {
    const user = userEvent.setup();
    api.createTicketAction.mockRejectedValueOnce(new Error("Network unavailable")).mockResolvedValueOnce(action);
    render(<ActionsTaken ticketId={3} canEdit />);
    await user.click(await screen.findByRole("button", { name: "Add action" }));
    await user.type(screen.getByLabelText("Description"), "Restarted service");
    await user.click(screen.getByRole("button", { name: "Save action" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Network unavailable");
    expect(screen.getByLabelText("Description")).toHaveValue("Restarted service");
    await user.click(screen.getByRole("button", { name: "Save action" }));
    await waitFor(() => expect(api.createTicketAction).toHaveBeenCalledTimes(2));
    expect(api.createTicketAction.mock.calls[0][2]).toEqual(api.createTicketAction.mock.calls[1][2]);
  });

  it("keeps edited values and reports the current server version after a conflict", async () => {
    const user = userEvent.setup();
    const conflict = Object.assign(new Error("Action was changed by another user."), { currentVersion: 4, currentStatus: "IN_PROGRESS" });
    api.getTicketActions.mockResolvedValue([action]); api.updateTicketAction.mockRejectedValue(conflict);
    render(<ActionsTaken ticketId={3} canEdit />);
    await user.click(await screen.findByRole("button", { name: "Edit action" }));
    const description = screen.getByLabelText("Description");
    await user.clear(description); await user.type(description, "Updated work");
    await user.click(screen.getByRole("button", { name: "Save action" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Current server version: 4");
    expect(description).toHaveValue("Updated work");
  });
});
