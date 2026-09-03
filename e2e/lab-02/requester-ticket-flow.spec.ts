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
    await expect(page.getByRole("cell", { name: "E2E ticket summary" })).not.toHaveCount(0);
    await page.screenshot({ path: "artifacts/lab-02/screenshots/my-tickets/desktop.png", fullPage: true });
    await page.getByRole("button", { name: /^TKT-\d{4}-\d{6}$/ }).first().click();
    await expect(page.getByLabel("Ticket Detail")).toBeVisible();
    await page.getByLabel("Add attachment").setInputFiles({ name: "evidence.pdf", mimeType: "application/pdf", buffer: Buffer.from("E2E attachment evidence") });
    await expect(page.getByRole("link", { name: "Download" })).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download" }).click();
    expect((await download).suggestedFilename()).toBe("evidence.pdf");
    page.once("dialog", (dialog) => dialog.accept("Wrong evidence file"));
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText(/Removed: Wrong evidence file/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Download" })).toHaveCount(0);
    await page.screenshot({ path: "artifacts/lab-02/screenshots/ticket-detail/desktop.png", fullPage: true });
  });

  test("changes requester and blocks cross-requester ticket access", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.getByRole("combobox", { name: /Development Requester/i }).selectOption("1");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Category *").selectOption("1");
    await page.getByLabel("Related System *").selectOption("1");
    await page.getByLabel("Summary *").fill("Private requester ticket");
    await page.getByLabel("Description *").fill("Only the original requester may view this ticket.");
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByRole("status")).toContainText(/TKT-\d{4}-\d{6}/);
    await page.getByRole("button", { name: "My Tickets" }).click();
    await expect(page.getByRole("cell", { name: "Private requester ticket" })).not.toHaveCount(0);
    await page.getByRole("button", { name: "Change Requester" }).click();
    await page.getByRole("combobox", { name: /Development Requester/i }).selectOption("2");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "My Tickets" }).click();
    await expect(page.getByRole("cell", { name: "Private requester ticket" })).toHaveCount(0);
  });

  test("captures desktop, tablet, and mobile evidence without horizontal overflow", async ({ page }) => {
    const viewports = [
      { name: "desktop", width: 1280, height: 900 },
      { name: "tablet", width: 900, height: 900 },
      { name: "mobile", width: 390, height: 844 },
    ];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("http://localhost:5173");
      await page.getByRole("combobox", { name: /Development Requester/i }).selectOption("1");
      await page.getByRole("button", { name: "Continue" }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `artifacts/lab-02/screenshots/create-ticket/${viewport.name}.png`, fullPage: true });
      await page.getByRole("button", { name: "My Tickets" }).click();
      await expect(page.getByRole("table")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `artifacts/lab-02/screenshots/my-tickets/${viewport.name}.png`, fullPage: true });
      await page.getByRole("button", { name: /^TKT-\d{4}-\d{6}$/ }).first().click();
      await expect(page.getByLabel("Ticket Detail")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `artifacts/lab-02/screenshots/ticket-detail/${viewport.name}.png`, fullPage: true });
    }
  });
});
