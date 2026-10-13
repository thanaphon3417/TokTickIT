import { expect, test } from "@playwright/test";

const ticket = { id: 45, ticketNumber: "TKT-2026-000045", summary: "VPN access", description: "Cannot connect to VPN", ticketDate: "2026-10-12T09:00:00Z", requestedPriority: "HIGH", currentStatus: "OPEN", requesterResolved: false, version: 1, createdAt: "2026-10-12T09:00:00Z", updatedAt: "2026-10-12T10:00:00Z", category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "VPN" }, requester: { id: 11, name: "Amina Lee", email: "amina@example.com" }, itPriority: "HIGH", owner: null, attachments: [] };
const listTicket = { id: ticket.id, ticketNumber: ticket.ticketNumber, summary: ticket.summary, requestedPriority: ticket.requestedPriority, currentStatus: ticket.currentStatus, requesterResolved: false, version: 1, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt, category: ticket.category, relatedSystem: ticket.relatedSystem };

test("requester dashboard filters tickets to the selected metric", async ({ page }) => {
  let receivedFilter = "";
  await page.route("**/api/**", async (route) => {
    const req = route.request(); const url = new URL(req.url()); const path = url.pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { user: { id: 11, name: "Amina Lee", email: "amina@example.com", role: "REQUESTER", mustChangePassword: false } } });
    if (path === "/api/categories") return route.fulfill({ json: [{ id: 1, name: "Hardware" }] });
    if (path === "/api/systems") return route.fulfill({ json: [{ id: 1, name: "VPN" }] });
    if (path === "/api/requester/dashboard") return route.fulfill({ json: { metrics: { open: 1, waitingForRequester: 0, recentlyUpdated: 1, recentlyResolved: 0 }, recentTickets: [listTicket], attentionTickets: [], recentlyResolvedTickets: [] } });
    if (path === "/api/tickets" && req.method() === "GET") { receivedFilter = url.searchParams.get("dashboardFilter") ?? ""; return route.fulfill({ json: { items: [listTicket], pagination: { page: 1, pageSize: 5, totalItems: 1, totalPages: 1 } } }); }
    return route.fulfill({ status: 404, json: { error: `Unexpected request ${req.method()} ${path}` } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Dashboard" }).click();
  await expect(page.locator("main > h1")).toHaveText("Dashboard");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: /Open tickets 1/ }).click();
  await expect(page.locator("main > h1")).toHaveText("My Tickets");
  await expect.poll(() => receivedFilter).toBe("open");
  await expect(page.getByRole("button", { name: ticket.ticketNumber })).toBeVisible();
});

test("staff dashboard links status metrics to the filtered queue", async ({ page }) => {
  let receivedStatus = ""; let activeOnly = "";
  await page.route("**/api/**", async (route) => {
    const req = route.request(); const url = new URL(req.url()); const path = url.pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { user: { id: 21, name: "Iris Staff", email: "iris@example.com", role: "IT_STAFF", mustChangePassword: false } } });
    if (path === "/api/staff/dashboard") return route.fulfill({ json: { metrics: { unassigned: 1, ownedByMe: 0, byStatus: { OPEN: 1 }, byPriority: { HIGH: 1 }, myOpenActions: 0 }, myActions: [], recentTickets: [ticket], urgentTickets: [ticket] } });
    if (path === "/api/categories" || path === "/api/staff/users") return route.fulfill({ json: [] });
    if (path === "/api/staff/tickets" && req.method() === "GET") { receivedStatus = url.searchParams.get("currentStatus") ?? ""; activeOnly = url.searchParams.get("activeOnly") ?? ""; return route.fulfill({ json: { items: [{ ...listTicket, requester: ticket.requester, itPriority: "HIGH", owner: null }], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } } }); }
    return route.fulfill({ status: 404, json: { error: `Unexpected request ${req.method()} ${path}` } });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: /OPEN 1/ }).click();
  await expect(page.getByRole("heading", { name: "My Queue" })).toBeVisible();
  await expect(page.locator("#queue-status")).toHaveValue("OPEN");
  await expect(page.locator("#queue-active-only")).toHaveValue("true");
  await expect.poll(() => receivedStatus).toBe("OPEN");
  await expect.poll(() => activeOnly).toBe("true");
  await expect(page.getByRole("button", { name: ticket.ticketNumber })).toBeVisible();
});
