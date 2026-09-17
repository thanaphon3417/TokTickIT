import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as api from "../../src/api.js";
import App from "../../src/App.js";
afterEach(() => vi.restoreAllMocks());
describe("Authentication boundary", () => { it("shows forced password change before normal navigation", async () => { vi.spyOn(api, "getCurrentUser").mockResolvedValue({ id: 2, name: "Iris", email: "iris@example.com", role: "IT_STAFF", mustChangePassword: true }); render(<App />); expect(await screen.findByRole("heading", { name: "Set a new password" })).toBeInTheDocument(); expect(screen.queryByText("My Tickets")).not.toBeInTheDocument(); }); });
