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
