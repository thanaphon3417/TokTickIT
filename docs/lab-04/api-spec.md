# Lab 4 REST API Contract

All protected endpoints require the existing HTTP-only session cookie. Missing/expired session returns `401`; authenticated but disallowed role returns `403`. A requester accessing a non-owned ticket receives `404`. JSON errors use `{ "error": "safe message", "fieldErrors"?: { "field": "message" } }`.

## Staff ticket workspace

IT Staff and Administrators may use `GET /api/staff/tickets`, `GET /api/staff/tickets/:ticketId`, and `GET /api/staff/users` to reach permitted ticket details and active IT Staff assignees. Requesters are denied. Ticket and action mutation authorization remains enforced by the corresponding write endpoints.

## Actions Taken

### `GET /api/tickets/:ticketId/actions`

Requester (owned ticket), IT Staff, and Administrator. Returns `200` with an array ordered by `actionDateTime ASC, id ASC`; each row includes IDs, date/time, description, result, follow-up data, attachment notes, status, version, audit timestamps, safe `performedBy` and nullable safe `assignee` identity. Invalid ID is `400`; missing/inaccessible ticket is `404`; database failure is safe `500`.

### `POST /api/tickets/:ticketId/actions`

IT Staff and Administrator only. Request: `{ actionDateTime, description, result?, assigneeId?, followUpRequired, followUpNote?, attachmentNotes? }` with a client-generated UUID in the required `Idempotency-Key` header. Server sets `performedById` to the session user and status to `PLANNED`; client cannot supply actor, status, ticket ID in the body, or version. First success returns `201` with the created representation. A retry with the same key and normalized payload returns `200` with the same representation and does not insert another row. Reusing a key with a different payload returns `409`. Description is 1–2,000 trimmed characters; result up to 2,000; attachment notes up to 1,000; date/time must be valid ISO-8601; follow-up note is required if follow-up is true. Assignee must be active IT Staff. Invalid fields/reference `400`, inactive/ineligible assignee `422`, inaccessible/missing ticket `404`, database failure `500`.

### `PATCH /api/tickets/:ticketId/actions/:actionId`

IT Staff and Administrator only. Request must include `{ expectedVersion, ...editableFields }`; allowed fields are `description`, `result`, `assigneeId` (nullable), `followUpRequired`, `followUpNote`, `attachmentNotes`, and `status`. Date/time, ticket, and creator are immutable. Returns `200` with updated representation and incremented version. Version mismatch, terminal action edit, or conflicting status change returns `409`; validation errors `400`; invalid assignee `422`; missing/inaccessible action/ticket `404`; safe database failure `500`. Identical repeated status transition may return current row as idempotent `200`.

## Ticket workflow

### `PATCH /api/staff/tickets/:ticketId`

Extend the existing endpoint. Every status change includes `{ expectedVersion, currentStatus, resolutionReason? }`; other existing editable fields remain supported. Apply the transition matrix from specification BR-06 atomically. Resolve only when at least one completed action has non-empty result; close only resolved tickets; require reason on reopen/cancel. Stale version returns `409` with safe `{ error, currentVersion, currentStatus }`. Invalid transition/failed resolution gate is `409`; invalid fields/reason `400`; ticket missing `404`; unauthorized `401/403`; safe failure `500`. A successful mutation increments ticket version and returns the updated ticket.

### `PATCH /api/tickets/:ticketId/resolution-feedback`

Requester only, and only for the authenticated user's own ticket. Request: `{ appearsResolved: boolean, expectedVersion: integer }`. This updates the existing `requesterResolved` advisory field and ticket version, but never changes `currentStatus`. Returns `200` with `{ id, ticketNumber, requesterResolved, currentStatus, version, updatedAt }`. Invalid body/ID `400`; absent session `401`; wrong role `403`; inaccessible ticket `404`; stale version `409` with current version/status; safe failure `500`. IT Staff and Administrators read the flag from ticket detail and cannot set it through this endpoint.

## Dashboards

### `GET /api/requester/dashboard`

Requester only. Scope comes exclusively from authenticated user relation. Returns `200`:

```json
{
  "metrics": { "open": 0, "waitingForRequester": 0, "recentlyUpdated": 0, "recentlyResolved": 0 },
  "recentTickets": [],
  "attentionTickets": [],
  "recentlyResolvedTickets": []
}
```

Recent rows contain only ticket ID/number, summary, status, priority and updated time, ordered newest first with stable ID tie-break, capped at five. Attention list is waiting-for-requester tickets, capped at five. `recentlyResolved` counts tickets with current status RESOLVED or CLOSED and `updatedAt` within the prior 168 hours. Other definitions and UTC boundary are specification BR-08. No data returns zeroes and empty arrays. Failure is safe `500`.

### `GET /api/staff/dashboard`

IT Staff and Administrator only. Returns `200` with `{ metrics: { unassigned, ownedByMe, byStatus, byPriority, myOpenActions }, myActions: [], recentTickets: [], urgentTickets: [] }`. Non-terminal means status not CLOSED/CANCELLED. `byStatus` and `byPriority` include all defined keys with zero counts. `myActions` are assigned to current staff and PLANNED/IN_PROGRESS; Administrator's `myActions` is `[]` unless the user has eligible action assignments. Recent tickets are ordered by `updatedAt DESC, id DESC`; urgent tickets are HIGH IT Priority; each list capped at five and includes only compact ticket fields plus ID/number. Empty lists and zero counts are valid. Failure is safe `500`.

## Existing APIs and common behavior

All approved Lab 2/3 endpoints remain compatible. Do not return password/session hashes or internal database messages. Requester dashboard/ticket/action queries must apply ownership in the database predicate. Staff/admin writes must derive actor from session, ignore/reject client actor IDs, and use parameterized Prisma operations. Dashboard routes return summaries, never complete ticket collections. The API and UI contracts must be updated together if implementation review requires a documented change.
