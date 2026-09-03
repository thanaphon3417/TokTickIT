const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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
}

export async function getTicket(ticketId: number, requesterId: number): Promise<TicketDetail> {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}?requesterId=${requesterId}`);
  if (!response.ok) throw new Error("Unable to retrieve ticket.");
  return response.json() as Promise<TicketDetail>;
}

export async function getTickets(query: TicketListQuery): Promise<TicketListResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const response = await fetch(`${API_URL}/api/tickets?${params.toString()}`);
  if (!response.ok) throw new Error("Unable to retrieve tickets.");
  return response.json() as Promise<TicketListResponse>;
}

export async function getCategories(): Promise<ReferenceItem[]> {
  const response = await fetch(`${API_URL}/api/categories`);
  if (!response.ok) throw new Error("Unable to retrieve request categories.");
  return response.json() as Promise<ReferenceItem[]>;
}

export async function getSystems(): Promise<ReferenceItem[]> {
  const response = await fetch(`${API_URL}/api/systems`);
  if (!response.ok) throw new Error("Unable to retrieve related systems.");
  return response.json() as Promise<ReferenceItem[]>;
}

export async function createTicket(input: CreateTicketInput): Promise<{ ticketNumber: string; id: number }> {
  const response = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
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
