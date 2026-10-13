import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const ticketId = 45;
const ticket = { id: ticketId, ticketNumber: "TKT-2026-000045", summary: "VPN access interruption", description: "VPN disconnects during calls.", ticketDate: "2026-10-12T09:00:00Z", requestedPriority: "HIGH", currentStatus: "OPEN", requesterResolved: false, version: 1, createdAt: "2026-10-12T09:00:00Z", updatedAt: "2026-10-12T10:00:00Z", category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "VPN" }, requester: { id: 11, name: "Amina Lee", email: "amina@example.com" }, itPriority: "HIGH", owner: { id: 21, name: "Iris Staff" }, attachments: [] };
const listTicket = { id: ticket.id, ticketNumber: ticket.ticketNumber, summary: ticket.summary, requestedPriority: ticket.requestedPriority, currentStatus: ticket.currentStatus, requesterResolved: false, version: 1, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt, category: ticket.category, relatedSystem: ticket.relatedSystem };
const action = { id: 501, ticketId, actionDateTime: "2026-10-12T10:30:00Z", description: "Restarted the VPN service", result: "Connection restored; user confirmed stable access.", performedById: 21, assigneeId: 21, followUpRequired: true, followUpNote: "Confirm stability tomorrow.", attachmentNotes: "No file attached.", status: "IN_PROGRESS", version: 1, createdAt: "2026-10-12T10:30:00Z", updatedAt: "2026-10-12T10:30:00Z", performedBy: { id: 21, name: "Iris Staff", email: "iris@example.com" }, assignee: { id: 21, name: "Iris Staff", email: "iris@example.com" } };
const sizes = [{ name: "desktop", width: 1280, height: 900 }, { name: "tablet", width: 768, height: 1024 }, { name: "mobile", width: 390, height: 844 }];

async function screenshot(page: import("@playwright/test").Page, section: string, size: typeof sizes[number]) {
  await page.setViewportSize({ width: size.width, height: size.height });
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const directory = path.resolve("artifacts/lab-04/screenshots", section);
  await fs.mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${size.name}.png`), fullPage: true });
}

test("capture role dashboards and Actions Taken at desktop, tablet, and mobile widths", async ({ browser }) => {
  const requesterContext = await browser.newContext();
  const requesterPage = await requesterContext.newPage();
  await requesterPage.route("**/api/**", (route) => {
    const request = route.request(); const pathName = new URL(request.url()).pathname;
    if (pathName === "/api/auth/me") return route.fulfill({ json: { user: { id: 11, name: "Amina Lee", email: "amina@example.com", role: "REQUESTER", mustChangePassword: false } } });
    if (pathName === "/api/categories") return route.fulfill({ json: [{ id: 1, name: "Hardware" }] });
    if (pathName === "/api/systems") return route.fulfill({ json: [{ id: 1, name: "VPN" }] });
    if (pathName === "/api/requester/dashboard") return route.fulfill({ json: { metrics: { open: 2, waitingForRequester: 1, recentlyUpdated: 2, recentlyResolved: 1 }, recentTickets: [listTicket], attentionTickets: [{ ...listTicket, currentStatus: "WAITING_FOR_REQUESTER" }], recentlyResolvedTickets: [{ ...listTicket, currentStatus: "RESOLVED" }] } });
    return route.fulfill({ status: 404, json: { error: `Unexpected request ${request.method()} ${pathName}` } });
  });
  await requesterPage.goto("/");
  await requesterPage.getByRole("button", { name: "Dashboard" }).click();
  await expect(requesterPage.locator("main > h1")).toHaveText("Dashboard");
  for (const size of sizes) await screenshot(requesterPage, "requester-dashboard", size);
  await requesterContext.close();

  const staffContext = await browser.newContext();
  const staffPage = await staffContext.newPage();
  await staffPage.route("**/api/**", (route) => {
    const request = route.request(); const pathName = new URL(request.url()).pathname;
    if (pathName === "/api/auth/me") return route.fulfill({ json: { user: { id: 21, name: "Iris Staff", email: "iris@example.com", role: "IT_STAFF", mustChangePassword: false } } });
    if (pathName === "/api/staff/dashboard") return route.fulfill({ json: { metrics: { unassigned: 1, ownedByMe: 2, byStatus: { OPEN: 1, IN_PROGRESS: 2 }, byPriority: { HIGH: 1, MEDIUM: 1 }, myOpenActions: 1 }, myActions: [{ ...action, ticket }], recentTickets: [ticket], urgentTickets: [ticket] } });
    if (pathName === "/api/categories" || pathName === "/api/staff/users") return route.fulfill({ json: [] });
    if (pathName === "/api/staff/tickets" && request.method() === "GET") return route.fulfill({ json: { items: [{ ...listTicket, requester: ticket.requester, itPriority: "HIGH", owner: ticket.owner }], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } } });
    if (pathName === `/api/staff/tickets/${ticketId}`) return route.fulfill({ json: ticket });
    if (pathName === `/api/tickets/${ticketId}/actions`) return route.fulfill({ json: [action] });
    if (pathName === `/api/tickets/${ticketId}/comments` || pathName === `/api/tickets/${ticketId}/notes`) return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: { error: `Unexpected request ${request.method()} ${pathName}` } });
  });
  await staffPage.goto("/");
  await expect(staffPage.locator("main h1")).toHaveText("Dashboard");
  await staffPage.keyboard.press("Tab");
  await expect(staffPage.locator(":focus-visible")).toHaveCount(1);
  for (const size of sizes) await screenshot(staffPage, "staff-dashboard", size);
  await staffPage.getByRole("button", { name: "My Queue" }).click();
  await expect(staffPage.getByLabel("Status", { exact: true })).toBeVisible();
  await staffPage.setViewportSize({ width: 390, height: 844 });
  await expect(staffPage.locator(".queue-cards .queue-card")).toBeVisible();
  await staffPage.getByRole("button", { name: ticket.ticketNumber }).click();
  await expect(staffPage.getByRole("heading", { name: "Actions Taken" })).toBeVisible();
  for (const size of sizes) await screenshot(staffPage, "actions-taken", size);
  await staffContext.close();
});
