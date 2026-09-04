import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("Lab 2 UI style and accessibility contract", () => {
  it("shows labelled requester controls and testing-only notice", async () => {
    vi.spyOn(api, "getActiveRequesters").mockResolvedValue([
      { id: 1, name: "Amina Lee", email: "amina.lee@example.com" },
    ]);

    render(<App />);

    expect(await screen.findByRole("combobox", { name: /Development Requester/i })).toBeInTheDocument();
    expect(screen.getByText(/not a login screen/i)).toBeInTheDocument();
    expect(screen.getByText("*")).toBeInTheDocument();
  });
});
