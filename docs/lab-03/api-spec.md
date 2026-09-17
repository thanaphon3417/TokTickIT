# Lab 3 API Contract

All protected routes require the HTTP-only session cookie and return `401` when absent/expired and `403` when the authenticated role is not allowed.

| Route | Purpose |
| --- | --- |
| `POST /api/auth/login` | Validate active email/password and establish session. |
| `POST /api/auth/logout` | Revoke the current session. |
| `GET /api/auth/me` | Return `{ id, name, email, role, mustChangePassword }`. |
| `POST /api/auth/change-password` | Replace the current initial password. |
| `GET /api/staff/tickets` | Staff-only shared queue with search/filter/sort/page query. |
| `GET /api/staff/tickets/:id` | Staff-only ticket detail. |
| `PATCH /api/staff/tickets/:id` | Validated owner, IT priority, and status changes. |
| `POST /api/tickets/:id/comments` | Append public comment for an authorized participant. |
| `GET/POST /api/tickets/:id/notes` | Staff-only internal notes. |
| `GET/POST /api/admin/users` | Administrator list/create. |
| `GET/PATCH /api/admin/users/:id` | Administrator read/edit/reset initial password. |

Validation responses use `400` with `{ error, fieldErrors? }`; duplicate email and state conflicts use `409`; missing resources use `404` without leaking protected data; failures return safe messages only.
