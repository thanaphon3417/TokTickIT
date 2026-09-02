# Lab 2 REST API Contract

Base path: `/api`. JSON uses camelCase. All errors use `{ "error": { "code": "SAFE_CODE", "message": "Safe human-readable message", "fieldErrors": {} } }`. No stack traces, database details, or file paths are returned.

## Shared rules

- Until Lab 3 authentication, requester ownership is represented by `requesterId` in the request body or query.
- The backend validates that the requester exists and is active for new work.
- Ticket and attachment operations always scope the database query by the selected requester.
- IDs are positive integers. Invalid IDs and query parameters return `400`.
- Missing or requester-inaccessible resources return `404` without revealing whether another requester owns them.
- Unexpected failures return `500` with a safe message.

## Reference data

### `GET /api/requesters/active`
Returns `200` with `[{ id, name, email }]`, ordered by name. Returns `200` with `[]` when none exist; database failure returns `500`.

### `GET /api/categories`
Returns `200` with active categories `[{ id, name }]`, ordered by name. Database failure returns `500`.

### `GET /api/systems`
Returns `200` with active systems `[{ id, name }]`, ordered by name. Database failure returns `500`.

## Tickets

### `POST /api/tickets`
Creates a ticket. Request:

```json
{
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 3,
  "summary": "Laptop battery drains quickly",
  "description": "The battery drains while the laptop is idle.",
  "requestedPriority": "MEDIUM"
}
```

Required fields are `requesterId`, `categoryId`, `relatedSystemId`, `summary`, `description`, and `requestedPriority`. Text is trimmed. Summary is 5-120 characters; description is 10-5000. Invalid input, inactive/missing references, or invalid enum returns `400`. Duplicate retries are prevented by client busy state and unique server ticket number. Success returns `201`:

```json
{
  "id": 12,
  "ticketNumber": "TKT-2026-000012",
  "ticketDate": "2026-09-03T10:00:00.000Z",
  "requester": { "id": 1, "name": "Amina Lee" },
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 3, "name": "Corporate Laptop" },
  "summary": "Laptop battery drains quickly",
  "description": "The battery drains while the laptop is idle.",
  "requestedPriority": "MEDIUM",
  "currentStatus": "NEW",
  "createdAt": "2026-09-03T10:00:00.000Z",
  "updatedAt": "2026-09-03T10:00:00.000Z",
  "attachments": []
}
```

### `GET /api/tickets`
Query parameters:

- `requesterId` required positive integer.
- `search` optional, max 120 characters; searches ticket number and summary.
- `categoryId`, `requestedPriority`, `currentStatus` optional filters.
- `sortBy` is `ticketNumber|createdAt|summary|updatedAt`; default `createdAt`.
- `sortOrder` is `asc|desc`; default `desc`.
- `page` is one-based; default `1`.
- `pageSize` is `5|10|20`; default `10`.

Invalid values return `400`. Success returns `200`:

```json
{
  "items": [],
  "pagination": { "page": 1, "pageSize": 10, "totalItems": 0, "totalPages": 0 },
  "query": { "search": "", "sortBy": "createdAt", "sortOrder": "desc" }
}
```

Every result is owned by `requesterId`. Secondary sorting is always `id desc`.

### `GET /api/tickets/:ticketId?requesterId=1`
Returns `200` with the ticket shape above and attachment metadata. Returns `400` for invalid IDs or requester IDs, `404` for missing/not-owned tickets, and `500` for unexpected failure.

## Attachments

### `POST /api/tickets/:ticketId/attachments`
Multipart form field: `file`; query `requesterId` required. Allowed MIME/type extensions: JPG/JPEG, PNG, WEBP, PDF. Maximum 5 MiB. Maximum five active attachments per ticket. Filename is sanitized for display and storage uses a server-generated opaque key. Success returns `201`:

```json
{
  "id": 44,
  "originalFilename": "error-screenshot.png",
  "mimeType": "image/png",
  "sizeBytes": 24576,
  "uploadedAt": "2026-09-03T10:05:00.000Z",
  "removedAt": null,
  "removalReason": null,
  "downloadUrl": "/api/attachments/44/download?requesterId=1"
}
```

No file, unsupported type, or invalid ticket/requester returns `400`. Oversized file returns `413`. Sixth active file returns `409`. Ownership/missing ticket returns `404`. Storage failure returns `500`; the ticket remains and the client may retry.

### `GET /api/tickets/:ticketId/attachments?requesterId=1`
Returns `200` with metadata for active and removed attachments owned by the requester. Removed items have `removedAt` and `removalReason`, and no usable download URL. Missing/not-owned ticket returns `404`.

### `GET /api/attachments/:attachmentId/download?requesterId=1`
Returns `200` binary content with stored MIME type and safe download filename when the attachment is active and owned. Returns `404` for missing/not-owned/removed attachments. It never exposes the storage key.

### `DELETE /api/attachments/:attachmentId`
Query `requesterId` required. JSON body:

```json
{ "removalReason": "Uploaded the wrong screenshot" }
```

Requires an owned active attachment and a trimmed reason of 3-500 characters. Returns `200` with updated metadata. Invalid reason returns `400`; missing/not-owned/removed attachment returns `404`; unexpected failure returns `500`. The file is not physically deleted during the request; `removedAt` is the authoritative soft-removal marker.

## Status summary

| Status | Meaning |
|---|---|
| 200 | Successful retrieval or update |
| 201 | Ticket or attachment created |
| 400 | Invalid input or query |
| 404 | Missing or requester-inaccessible resource |
| 409 | Active attachment limit or other conflict |
| 413 | File too large |
| 500 | Safe unexpected server failure |
