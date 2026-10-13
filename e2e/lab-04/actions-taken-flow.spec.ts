import { expect, test } from "@playwright/test";

const ticketId = 101;
const requester = { id: 11, name: "Amina Lee", email: "amina@example.com", role: "REQUESTER", mustChangePassword: false };
const staff = { id: 21, name: "Iris Staff", email: "iris@example.com", role: "IT_STAFF", mustChangePassword: false };
const ticket = {
  id: ticketId, ticketNumber: "TKT-2026-000101", summary: "VPN connection issue", description: "VPN disconnects during calls.",
  ticketDate: "2026-10-12T09:00:00.000Z", requestedPriority: "MEDIUM", currentStatus: "OPEN", createdAt: "2026-10-12T09:00:00.000Z", updatedAt: "2026-10-12T09:00:00.000Z",
  category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "VPN" }, requester: { id: 11, name: "Amina Lee", email: "amina@example.com" }, owner: { id: 21, name: "Iris Staff" }, itPriority: "MEDIUM", attachments: [],
};
const listItem = { id: ticketId, ticketNumber: ticket.ticketNumber, summary: ticket.summary, requestedPriority: ticket.requestedPriority, currentStatus: ticket.currentStatus, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt, category: ticket.category, relatedSystem: ticket.relatedSystem };

function action(description: string) {
  return { id: 501, ticketId, actionDateTime: "2026-10-12T10:30:00.000Z", description, result: "VPN connection restored.", performedById: staff.id, assigneeId: null, followUpRequired: true, followUpNote: "Confirm stability tomorrow.", attachmentNotes: "No file attached.", status: "PLANNED", version: 1, createdAt: "2026-10-12T10:30:00.000Z", updatedAt: "2026-10-12T10:30:00.000Z", performedBy: { id: staff.id, name: staff.name, email: staff.email }, assignee: null };
}

test("staff records an action that the ticket requester can view read-only on mobile", async ({ browser }) => {
  const staffContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const staffPage = await staffContext.newPage();
  let createdAction: ReturnType<typeof action> | null = null;
  await staffPage.route("**/api/**", async (route) => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { user: staff } });
    if (path === "/api/staff/dashboard") return route.fulfill({ json: { metrics: { unassigned: 0, ownedByMe: 1, byStatus: { OPEN: 1 }, byPriority: { MEDIUM: 1 }, myOpenActions: 0 }, myActions: [], recentTickets: [{ ...listItem, itPriority: "MEDIUM" }], urgentTickets: [] } });
    if (path === "/api/categories") return route.fulfill({ json: [{ id: 1, name: "Hardware" }] });
    if (path === "/api/staff/users") return route.fulfill({ json: [{ id: staff.id, name: staff.name, email: staff.email }] });
    if (path === "/api/staff/tickets" && request.method() === "GET") return route.fulfill({ json: { items: [{ ...listItem, requester: { id: requester.id, name: requester.name }, itPriority: "MEDIUM", owner: { id: staff.id, name: staff.name } }], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } } });
    if (path === `/api/staff/tickets/${ticketId}` && request.method() === "GET") return route.fulfill({ json: ticket });
    if (path === `/api/tickets/${ticketId}/comments` || path === `/api/tickets/${ticketId}/notes`) return route.fulfill({ json: [] });
    if (path === `/api/tickets/${ticketId}/actions` && request.method() === "GET") return route.fulfill({ json: createdAction ? [createdAction] : [] });
    if (path === `/api/tickets/${ticketId}/actions` && request.method() === "POST") {
      const payload = request.postDataJSON() as { description: string };
      createdAction = action(payload.description);
      return route.fulfill({ status: 201, json: createdAction });
    }
    return route.fulfill({ status: 404, json: { error: `Unexpected E2E request: ${request.method()} ${path}` } });
  });
  await staffPage.goto("/");
  await expect(staffPage.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(staffPage.getByRole("button", { name: ticket.ticketNumber })).toBeVisible();
  await staffPage.getByRole("button", { name: "My Queue" }).click();
  await staffPage.getByRole("button", { name: ticket.ticketNumber }).click();
  await staffPage.setViewportSize({ width: 390, height: 844 });
  await staffPage.getByRole("button", { name: "Add action" }).click();
  await staffPage.getByLabel("Description").fill("Restarted the VPN service");
  await staffPage.getByLabel("Result (optional)").fill("VPN connection restored.");
  await staffPage.getByLabel("Follow-up required").check();
  await staffPage.getByLabel("Follow-up note").fill("Confirm stability tomorrow.");
  await staffPage.getByRole("button", { name: "Save action" }).click();
  await expect(staffPage.getByText("Restarted the VPN service")).toBeVisible();
  await expect(staffPage.getByRole("status")).toContainText("Action added.");
  expect(await staffPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await staffContext.close();

  const requesterContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const requesterPage = await requesterContext.newPage();
  await requesterPage.route("**/api/**", async (route) => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { user: requester } });
    if (path === "/api/categories") return route.fulfill({ json: [{ id: 1, name: "Hardware" }] });
    if (path === "/api/systems") return route.fulfill({ json: [{ id: 1, name: "VPN" }] });
    if (path === "/api/tickets" && request.method() === "GET") return route.fulfill({ json: { items: [listItem], pagination: { page: 1, pageSize: 5, totalItems: 1, totalPages: 1 } } });
    if (path === `/api/tickets/${ticketId}` && request.method() === "GET") return route.fulfill({ json: { ...ticket, requester } });
    if (path === `/api/tickets/${ticketId}/actions` && request.method() === "GET") return route.fulfill({ json: createdAction ? [createdAction] : [] });
    return route.fulfill({ status: 404, json: { error: `Unexpected E2E request: ${request.method()} ${path}` } });
  });
  await requesterPage.goto("/");
  await requesterPage.getByRole("button", { name: "My Tickets" }).click();
  await requesterPage.getByRole("button", { name: ticket.ticketNumber }).click();
  await expect(requesterPage.getByText("Restarted the VPN service")).toBeVisible();
  await expect(requesterPage.getByText("Confirm stability tomorrow.")).toBeVisible();
  await expect(requesterPage.getByRole("button", { name: "Add action" })).toHaveCount(0);
  await expect(requesterPage.getByRole("button", { name: "Edit action" })).toHaveCount(0);
  expect(await requesterPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await requesterContext.close();
});

test("administrator can reach ticket detail and create an action from the existing users workspace", async ({ page }) => {
  const admin = { id: 31, name: "Avery Admin", email: "avery@example.com", role: "ADMINISTRATOR", mustChangePassword: false };
  await page.route("**/api/**", async (route) => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { user: admin } });
    if (path === "/api/admin/users") return route.fulfill({ json: [] });
    if (path === "/api/staff/users") return route.fulfill({ json: [{ id: staff.id, name: staff.name, email: staff.email }] });
    if (path === "/api/staff/tickets" && request.method() === "GET") return route.fulfill({ json: { items: [{ ...listItem, requester: { id: requester.id, name: requester.name }, itPriority: "MEDIUM", owner: { id: staff.id, name: staff.name } }], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } } });
    if (path === `/api/staff/tickets/${ticketId}` && request.method() === "GET") return route.fulfill({ json: ticket });
    if (path === `/api/tickets/${ticketId}/comments` || path === `/api/tickets/${ticketId}/notes`) return route.fulfill({ json: [] });
    if (path === `/api/tickets/${ticketId}/actions` && request.method() === "GET") return route.fulfill({ json: [] });
    if (path === `/api/tickets/${ticketId}/actions` && request.method() === "POST") return route.fulfill({ status: 201, json: { ...action("Admin recorded an action"), performedBy: { id: admin.id, name: admin.name, email: admin.email } } });
    return route.fulfill({ status: 404, json: { error: `Unexpected E2E request: ${request.method()} ${path}` } });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await page.getByRole("button", { name: "My Queue" }).click();
  await page.getByRole("button", { name: ticket.ticketNumber }).click();
  await page.getByRole("button", { name: "Add action" }).click();
  await page.getByLabel("Description").fill("Admin recorded an action");
  await page.getByRole("button", { name: "Save action" }).click();
  await expect(page.getByText("Admin recorded an action")).toBeVisible();
  await page.getByRole("button", { name: "Users" }).click();
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
});
