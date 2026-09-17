import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";
const requester = { id: 1, name: "Amina", email: "amina@example.com", role: "REQUESTER" as const, mustChangePassword: false };
afterEach(() => vi.restoreAllMocks());
describe("Create Ticket", () => { it("shows field validation for an authenticated requester", async () => { vi.spyOn(api, "getCurrentUser").mockResolvedValue(requester); vi.spyOn(api, "getCategories").mockResolvedValue([]); vi.spyOn(api, "getSystems").mockResolvedValue([]); const create = vi.spyOn(api, "createTicket"); const user = userEvent.setup(); render(<App />); await user.click(await screen.findByRole("button", { name: "Submit Ticket" })); expect(await screen.findByText("Category is required.")).toBeInTheDocument(); expect(create).not.toHaveBeenCalled(); }); });
