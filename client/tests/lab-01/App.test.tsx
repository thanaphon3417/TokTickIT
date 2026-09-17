import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

const requester = { id: 1, name: "Amina Lee", email: "amina.lee@example.com", role: "REQUESTER" as const, mustChangePassword: false };
afterEach(() => vi.restoreAllMocks());

describe("authenticated requester application", () => {
  it("shows the sign-in screen without a session", async () => { vi.spyOn(api, "getCurrentUser").mockResolvedValue(null); render(<App />); expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument(); });
  it("opens ticket creation from authenticated identity", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(requester); vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]); vi.spyOn(api, "getSystems").mockResolvedValue([{ id: 1, name: "Corporate Laptop" }]); vi.spyOn(api, "createTicket").mockResolvedValue({ id: 10, ticketNumber: "TKT-2026-000010" });
    const user = userEvent.setup(); render(<App />); await user.selectOptions(await screen.findByLabelText("Category *"), "1"); await user.selectOptions(screen.getByLabelText("Related System *"), "1"); await user.type(screen.getByLabelText("Summary *"), "Laptop will not start"); await user.type(screen.getByLabelText("Description *"), "The corporate laptop does not start after charging."); await user.click(screen.getByRole("button", { name: "Submit Ticket" })); expect(await screen.findByText("TKT-2026-000010")).toBeInTheDocument();
  });
});
