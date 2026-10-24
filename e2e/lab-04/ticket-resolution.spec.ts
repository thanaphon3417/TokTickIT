import { expect, test } from "@playwright/test";

const requester = { id: 11, name: "Amina Lee", email: "amina@example.com", role: "REQUESTER", mustChangePassword: false };
const staff = { id: 21, name: "Iris Staff", email: "iris@example.com", role: "IT_STAFF", mustChangePassword: false };
const ticketId = 45;
const ticket = { id: ticketId, ticketNumber: "TKT-2026-000045", summary: "VPN access", description: "VPN disconnects during calls.", ticketDate: "2026-10-12T09:00:00Z", requestedPriority: "HIGH", currentStatus: "OPEN", requesterResolved: false, version: 1, createdAt: "2026-10-12T09:00:00Z", updatedAt: "2026-10-12T10:00:00Z", resolutionReason: null, category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "VPN" }, requester, itPriority: "HIGH", owner: { id: 21, name: "Iris Staff" }, attachments: [] };
const listTicket = { id: ticket.id, ticketNumber: ticket.ticketNumber, summary: ticket.summary, requestedPriority: ticket.requestedPriority, currentStatus: ticket.currentStatus, requesterResolved: false, version: 1, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt, category: ticket.category, relatedSystem: ticket.relatedSystem };
const completedAction = { id: 501, ticketId, actionDateTime: "2026-10-12T10:30:00Z", description: "Restarted VPN service", result: "Connection restored", performedById: staff.id, assigneeId: null, followUpRequired: false, followUpNote: null, attachmentNotes: null, status: "COMPLETED", version: 1, createdAt: "2026-10-12T10:30:00Z", updatedAt: "2026-10-12T10:30:00Z", performedBy: staff, assignee: null };

test("staff resolves a ticket only after completed action evidence and supplies cancel reasons", async ({ page }) => {
  let currentStatus = "OPEN"; let version = 1; let patchCount = 0;
  await page.route("**/api/**", async (route) => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { user: staff } });
    if (path === "/api/staff/dashboard") return route.fulfill({ json: { metrics: { unassigned: 0, ownedByMe: 1, byStatus: { OPEN: 1 }, byPriority: { HIGH: 1 }, myOpenActions: 0 }, myActions: [], recentTickets: [], urgentTickets: [] } });
    if (path === "/api/categories" || path === "/api/staff/users") return route.fulfill({ json: [] });
    if (path === "/api/staff/tickets" && request.method() === "GET") return route.fulfill({ json: { items: [{ ...listTicket, currentStatus, version, requester, itPriority: "HIGH", owner: ticket.owner }], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } } });
    if (path === `/api/staff/tickets/${ticketId}` && request.method() === "GET") return route.fulfill({ json: { ...ticket, currentStatus, version } });
    if (path === `/api/tickets/${ticketId}/actions`) return route.fulfill({ json: [completedAction] });
    if (path === `/api/tickets/${ticketId}/comments` || path === `/api/tickets/${ticketId}/notes`) return route.fulfill({ json: [] });
    if (path === `/api/staff/tickets/${ticketId}` && request.method() === "PATCH") {
      patchCount += 1; const body = request.postDataJSON() as { currentStatus: string; expectedVersion: number; resolutionReason?: string };
      expect(body.expectedVersion).toBe(version); expect(body.currentStatus).toBe(currentStatus === "OPEN" ? "RESOLVED" : "CANCELLED");
      currentStatus = body.currentStatus; version += 1;
      return route.fulfill({ json: { ...ticket, currentStatus, version, resolutionReason: body.resolutionReason ?? null } });
    }
    return route.fulfill({ status: 404, json: { error: `Unexpected request ${request.method()} ${path}` } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "My Queue" }).click();
  await page.getByRole("button", { name: ticket.ticketNumber }).click();
  const status = page.getByLabel("Current status", { exact: true });
  await expect(status.locator("option[value=RESOLVED]")).toHaveCount(1);
  await status.selectOption("CANCELLED");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("alert")).toContainText("Enter a reason");
  expect(patchCount).toBe(0);
  await status.selectOption("OPEN");
  await status.selectOption("RESOLVED");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(status).toHaveValue("RESOLVED");
  expect(patchCount).toBe(1);
});

test("requester resolution feedback remains advisory and does not change formal status", async ({ page }) => {
  let feedbackPatch: { appearsResolved: boolean; expectedVersion: number } | null = null;
  await page.route("**/api/**", async (route) => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { user: requester } });
    if (path === "/api/categories") return route.fulfill({ json: [{ id: 1, name: "Hardware" }] });
    if (path === "/api/systems") return route.fulfill({ json: [{ id: 1, name: "VPN" }] });
    if (path === "/api/tickets" && request.method() === "GET") return route.fulfill({ json: { items: [listTicket], pagination: { page: 1, pageSize: 5, totalItems: 1, totalPages: 1 } } });
    if (path === `/api/tickets/${ticketId}` && request.method() === "GET") return route.fulfill({ json: { ...ticket, requester } });
    if (path === `/api/tickets/${ticketId}/comments` || path === `/api/tickets/${ticketId}/actions`) return route.fulfill({ json: [] });
    if (path === `/api/tickets/${ticketId}/resolution-feedback` && request.method() === "PATCH") {
      feedbackPatch = request.postDataJSON() as { appearsResolved: boolean; expectedVersion: number };
      return route.fulfill({ json: { requesterResolved: true, currentStatus: "OPEN", version: 2, updatedAt: "2026-10-13T10:00:00Z" } });
    }
    return route.fulfill({ status: 404, json: { error: `Unexpected request ${request.method()} ${path}` } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "My Tickets" }).click();
  await page.getByRole("button", { name: ticket.ticketNumber }).click();
  await page.getByLabel("Problem appears resolved").check();
  await page.getByRole("button", { name: "Save feedback" }).click();
  await expect(page.getByRole("status")).toContainText("Feedback saved");
  await expect(page.getByText("Current Status").locator(".." )).toContainText("OPEN");
  expect(feedbackPatch).toEqual({ appearsResolved: true, expectedVersion: 1 });
});
