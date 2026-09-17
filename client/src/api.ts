const API_URL = import.meta.env.VITE_API_URL ?? "";

export type AuthenticatedUser = { id: number; name: string; email: string; role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR"; mustChangePassword: boolean };
const sessionOptions: RequestInit = { credentials: "include" };

async function apiError(response: Response, fallback: string): Promise<never> {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error ?? fallback);
}

export async function login(email: string, password: string): Promise<AuthenticatedUser> {
  const response = await fetch(`${API_URL}/api/auth/login`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (!response.ok) return apiError(response, "Unable to sign in.");
  return (await response.json() as { user: AuthenticatedUser }).user;
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/logout`, { method: "POST", ...sessionOptions });
  if (!response.ok) return apiError(response, "Unable to sign out.");
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const response = await fetch(`${API_URL}/api/auth/me`, sessionOptions);
  if (response.status === 401) return null;
  if (!response.ok) return apiError(response, "Unable to retrieve the current user.");
  return (await response.json() as { user: AuthenticatedUser }).user;
}

export async function changePassword(password: string): Promise<AuthenticatedUser> {
  const response = await fetch(`${API_URL}/api/auth/change-password`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
  if (!response.ok) return apiError(response, "Unable to change password.");
  return (await response.json() as { user: AuthenticatedUser }).user;
}

export function getAttachmentDownloadUrl(attachmentId: number, requesterId: number): string {
  return `${API_URL}/api/attachments/${attachmentId}/download?requesterId=${requesterId}`;
}

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export interface DevelopmentRequester {
  id: number;
  name: string;
  email: string;
}

export interface ReferenceItem {
  id: number;
  name: string;
}

export interface CreateTicketInput {
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
}

export interface TicketListQuery {
  requesterId: number;
  search?: string;
  categoryId?: string;
  requestedPriority?: string;
  currentStatus?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface TicketListResponse {
  items: Array<{ id: number; ticketNumber: string; summary: string; requestedPriority: string; currentStatus: string; createdAt: string; updatedAt: string; category: ReferenceItem; relatedSystem: ReferenceItem }>;
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export type StaffQueueTicket = TicketListResponse["items"][number] & {
  requester: DevelopmentRequester;
  itPriority: "LOW" | "MEDIUM" | "HIGH";
  owner: { id: number; name: string } | null;
};
export interface StaffQueueResponse { items: StaffQueueTicket[]; pagination: TicketListResponse["pagination"]; }
export interface StaffQueueQuery { search?: string; categoryId?: string; requestedPriority?: string; currentStatus?: string; sortBy?: string; sortOrder?: "asc" | "desc"; page?: number; pageSize?: number; }
export type StaffTicketDetail = StaffQueueTicket & { description: string; ticketDate: string; relatedSystem: ReferenceItem };

export async function getStaffTickets(query: StaffQueueQuery): Promise<StaffQueueResponse> {
  const params = new URLSearchParams(); Object.entries(query).forEach(([key, value]) => { if (value !== undefined) params.set(key, String(value)); });
  const response = await fetch(`${API_URL}/api/staff/tickets?${params}`, sessionOptions);
  if (!response.ok) return apiError(response, "Unable to retrieve the staff ticket queue.");
  return response.json() as Promise<StaffQueueResponse>;
}

export async function getStaffTicket(ticketId: number): Promise<StaffTicketDetail> {
  const response = await fetch(`${API_URL}/api/staff/tickets/${ticketId}`, sessionOptions);
  if (!response.ok) return apiError(response, "Unable to retrieve the staff ticket.");
  return response.json() as Promise<StaffTicketDetail>;
}

export interface TicketDetail {
  id: number;
  ticketNumber: string;
  ticketDate: string;
  summary: string;
  description: string;
  requestedPriority: string;
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
  requester: DevelopmentRequester;
  category: ReferenceItem;
  relatedSystem: ReferenceItem;
  attachments: AttachmentMetadata[];
}

export interface AttachmentMetadata {
  id: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  removedAt: string | null;
  removalReason: string | null;
}

export async function uploadAttachment(ticketId: number, requesterId: number, file: File): Promise<AttachmentMetadata> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments?requesterId=${requesterId}`, { method: "POST", body, credentials: "include" });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Unable to upload attachment.");
  return response.json() as Promise<AttachmentMetadata>;
}

export async function removeAttachment(attachmentId: number, requesterId: number, removalReason: string): Promise<AttachmentMetadata> {
  const response = await fetch(`${API_URL}/api/attachments/${attachmentId}?requesterId=${requesterId}`, { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ removalReason }) });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Unable to remove attachment.");
  return response.json() as Promise<AttachmentMetadata>;
}

export async function getTicket(ticketId: number, requesterId: number): Promise<TicketDetail> {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}?requesterId=${requesterId}`, sessionOptions);
  if (!response.ok) throw new Error("Unable to retrieve ticket.");
  return response.json() as Promise<TicketDetail>;
}

export async function getTickets(query: TicketListQuery): Promise<TicketListResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const response = await fetch(`${API_URL}/api/tickets?${params.toString()}`, sessionOptions);
  if (!response.ok) throw new Error("Unable to retrieve tickets.");
  return response.json() as Promise<TicketListResponse>;
}

export async function getCategories(): Promise<ReferenceItem[]> {
  const response = await fetch(`${API_URL}/api/categories`, sessionOptions);
  if (!response.ok) throw new Error("Unable to retrieve request categories.");
  return response.json() as Promise<ReferenceItem[]>;
}

export async function getSystems(): Promise<ReferenceItem[]> {
  const response = await fetch(`${API_URL}/api/systems`, sessionOptions);
  if (!response.ok) throw new Error("Unable to retrieve related systems.");
  return response.json() as Promise<ReferenceItem[]>;
}

export async function createTicket(input: CreateTicketInput): Promise<{ ticketNumber: string; id: number }> {
  const response = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input), credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error ?? "Unable to create ticket.") as Error & { fieldErrors?: Record<string, string> };
    error.fieldErrors = body.fieldErrors;
    throw error;
  }

  return response.json() as Promise<{ ticketNumber: string; id: number }>;
}

export async function getActiveRequesters(): Promise<DevelopmentRequester[]> {
  const response = await fetch(`${API_URL}/api/requesters/active`);

  if (!response.ok) {
    throw new Error("Unable to retrieve active development requesters.");
  }

  return response.json() as Promise<DevelopmentRequester[]>;
}

// Issue 2 + Issue 4 — call the backend.
// Steps: fetch `${API_URL}/api/health`; if not ok, throw.
//        then fetch `${API_URL}/api/categories`; if not ok, throw.
//        return { online: true, categories }.
// Throwing on failure lets the UI show a single Offline/error state.
export async function checkSystem(): Promise<SystemStatus> {
  // TODO(Issue 2 & 4): implement the two fetch calls described above.
  const healthResponse = await fetch(`${API_URL}/api/health`);

  if (!healthResponse.ok) {
    throw new Error("Unable to connect to TokTickIT API.");
  }

  const health = await healthResponse.json();

  if (health.status !== "ok") {
    throw new Error("TokTickIT API health check failed.");
  }

  const categoriesResponse = await fetch(`${API_URL}/api/categories`);

  if (!categoriesResponse.ok) {
    throw new Error("Unable to retrieve request categories.");
  }

  const categories: Category[] = await categoriesResponse.json();

  return {
    online: true,
    categories,
  };
}
