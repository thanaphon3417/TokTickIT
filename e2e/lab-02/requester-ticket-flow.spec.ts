import { test, expect } from "@playwright/test";

test.describe("Lab 2 requester ticket flow", () => {
  test("selects requester, creates a ticket, and finds it in My Tickets", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.getByRole("combobox", { name: /Development Requester/i }).selectOption("1");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Category *").selectOption("1");
    await page.getByLabel("Related System *").selectOption("1");
    await page.getByLabel("Summary *").fill("E2E ticket summary");
    await page.getByLabel("Description *").fill("E2E ticket description with enough detail.");
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByRole("status")).toContainText(/TKT-\d{4}-\d{6}/);
    await page.getByRole("button", { name: "My Tickets" }).click();
    await page.getByText("E2E ticket summary").waitFor();
  });

  test("captures responsive screenshots without horizontal overflow", async ({ page }) => {
    for (const viewport of [{ width: 1280, height: 900 }, { width: 900, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto("http://localhost:5173");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });
});
