import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as api from "../../src/api.js";
import App from "../../src/App.js";
afterEach(() => vi.restoreAllMocks());
describe("Lab 3 authentication UI", () => { it("shows accessible sign-in controls", async () => { vi.spyOn(api, "getCurrentUser").mockResolvedValue(null); render(<App />); expect(await screen.findByLabelText("Email address")).toBeInTheDocument(); expect(screen.getByLabelText("Password")).toBeInTheDocument(); }); });
