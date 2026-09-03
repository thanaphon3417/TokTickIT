import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("App", () => {
  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it("loads active requesters and stores the selected requester", async () => {
    vi.spyOn(api, "getActiveRequesters").mockResolvedValue([
      { id: 1, name: "Amina Lee", email: "amina.lee@example.com" },
      { id: 2, name: "Ben Carter", email: "ben.carter@example.com" },
    ]);

    const user = userEvent.setup();
    render(<App />);

    const select = await screen.findByRole("combobox", {
      name: /Development Requester/i,
    });
    await user.selectOptions(select, "2");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(localStorage.getItem("toktickit.requesterId")).toBe("2");
  });

  it("shows a safe error when requester loading fails", async () => {
    vi.spyOn(api, "getActiveRequesters").mockRejectedValue(
      new Error("Unable to retrieve active development requesters."),
    );

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to retrieve active development requesters.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
