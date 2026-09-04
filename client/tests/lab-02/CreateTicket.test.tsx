import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

async function openCreate() {
  vi.spyOn(api, "getActiveRequesters").mockResolvedValue([{ id: 1, name: "Amina Lee", email: "amina@example.com" }]);
  vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
  vi.spyOn(api, "getSystems").mockResolvedValue([{ id: 1, name: "Corporate Laptop" }]);
  const user = userEvent.setup();
  render(<App />);
  await user.selectOptions(await screen.findByLabelText(/Development Requester/i), "1");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  return user;
}

describe("Create Ticket", () => {
  it("shows field-level validation and does not call the API", async () => {
    const create = vi.spyOn(api, "createTicket");
    const user = await openCreate();
    await user.click(screen.getByRole("button", { name: "Submit Ticket" }));
    expect(await screen.findByText("Category is required.")).toBeInTheDocument();
    expect(screen.getByText("Summary must be 5-120 characters.")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("preserves entered values after a safe API failure", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(new Error("Unable to create ticket."));
    const user = await openCreate();
    await user.selectOptions(screen.getByLabelText("Category *"), "1");
    await user.selectOptions(screen.getByLabelText("Related System *"), "1");
    await user.type(screen.getByLabelText("Summary *"), "Laptop does not start");
    await user.type(screen.getByLabelText("Description *"), "The laptop does not start after charging overnight.");
    await user.click(screen.getByRole("button", { name: "Submit Ticket" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to create ticket.");
    expect(screen.getByLabelText("Summary *")).toHaveValue("Laptop does not start");
  });
});
