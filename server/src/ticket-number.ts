import { randomInt } from "node:crypto";

/** Generates a backend-owned official ticket number. Database uniqueness remains authoritative. */
export function generateTicketNumber(now = new Date()): string {
  return `TKT-${now.getFullYear()}-${randomInt(0, 1_000_000).toString().padStart(6, "0")}`;
}
