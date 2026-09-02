# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal
Deliver a requester-facing ticket workflow for TokTickIT. A selected development requester can create a ticket, find only their own tickets, inspect ticket details, and manage permitted attachments through a responsive Zen Green interface.

## 2. Stakeholder Request Interpretation
The IT department needs a professional support-request MVP. Lab 2 simulates the current requester with a seeded selector because real authentication is deferred to Lab 3. The backend remains responsible for generated ticket numbers, validation, persistence, and ownership checks.

## 3. Scope
### Included
- Development Requester selector and switching.
- Create Ticket with category, related system, summary, description, requested priority, and attachments.
- My Tickets with requester ownership, search, filters, sorting, and pagination.
- Read-only Requester Ticket Detail.
- Attachment metadata, upload, active download, and soft removal with a reason.
- PostgreSQL data model, seed data, REST API, validation, loading, empty, error, and responsive UI states.

### Excluded
Authentication, passwords, sessions, tokens, real authorization, IT Staff workflow, comments, internal notes, Actions Taken, ticket reassignment, IT priority changes, administration, and status changes after initial `NEW`.

## 4. Functional Requirements
- FR-01: Load only active Development Requesters for the temporary selector.
- FR-02: Persist the selected requester ID in browser storage and show the requester in the application shell.
- FR-03: Allow changing requester and reload requester-specific data after the change.
- FR-04: Load active Categories and Related Systems from the API.
- FR-05: Create one validated ticket for the selected requester and return its official ticket number.
- FR-06: Set server-owned ticket date, status, ticket number, and timestamps.
- FR-07: List only tickets owned by the selected requester with search, filters, sorting, and pagination.
- FR-08: Return one ticket only when it belongs to the selected requester.
- FR-09: Upload permitted attachments during creation or to an owned ticket.
- FR-10: List attachment metadata while excluding removed file content and download access.
- FR-11: Soft-remove one permitted attachment after confirmation and a non-empty reason.
- FR-12: Preserve entered form values after API failure and display a safe actionable error.
- FR-13: Prevent duplicate ticket submission while a request is in progress.
- FR-14: Provide accessible and responsive Create Ticket, My Tickets, and Ticket Detail screens.

## 5. Business Rules
- BR-01: The backend generates a unique ticket number in format `TKT-YYYY-NNNNNN`; clients cannot provide it.
- BR-02: A new ticket starts with status `NEW`, requested priority defaults to `MEDIUM`, and ticket date/timestamps come from the backend.
- BR-03: The development requester selector is a testing mechanism, not authentication or security.
- BR-04: Only active requesters appear in the selector. An inactive requester cannot be selected for new requests.
- BR-05: A ticket has exactly one requester, category, and related system; a requester can own many tickets.
- BR-06: Summary is required, trimmed, and 5-120 characters. Description is required, trimmed, and 10-5000 characters.
- BR-07: Category, related system, and requested priority are required and must be active/allowed values from the backend.
- BR-08: Whitespace-only text is invalid. Client validation improves feedback; backend validation is authoritative.
- BR-09: A submit button is disabled during submission. A successful retry must create only one ticket.
- BR-10: Ticket lists are always scoped by requester ID on the server; client-supplied IDs cannot bypass ownership.
- BR-11: Search checks ticket number and summary, case-insensitively. Filters are category, requested priority, and current status.
- BR-12: Sorting allows `ticketNumber`, `createdAt`, `summary`, and `updatedAt`; default is `createdAt desc, id desc`.
- BR-13: Pagination is one-based. Allowed page sizes are 5, 10, and 20; invalid values return `400`.
- BR-14: Attachments allow JPG, JPEG, PNG, WEBP, and PDF only, with a maximum of 5 MB per file and five active files per ticket.
- BR-15: Attachment metadata requires original filename, safe stored filename, MIME type, byte size, storage key, and upload timestamp.
- BR-16: Stored filenames are server-generated opaque names; user filenames are display metadata only and path traversal is rejected.
- BR-17: Upload failure does not erase ticket form data. A ticket may remain saved with a clear attachment failure message; the user may retry.
- BR-18: Only the ticket owner may upload, list, download, or remove its attachments.
- BR-19: Removal requires explicit confirmation and a trimmed reason of 3-500 characters. Removal sets `removedAt` and `removalReason` and keeps metadata.
- BR-20: Removed attachments cannot be downloaded or previewed and do not count toward the active attachment limit.
- BR-21: Missing resources and ownership failures do not reveal another requester's ticket or attachment data.
- BR-22: No active requesters or failed reference-data loads show an explicit empty/error state; ticket forms cannot submit without required reference data.
- BR-23: Lab 3 may replace the selector with authenticated identity while retaining requester foreign keys and ownership rules.

## 6. UI Specification Summary
The app uses a TokTickIT shell with green header, My Tickets, Create Ticket, current requester display, and Change Requester action. Create Ticket uses grouped editable fields, read-only generated fields after creation, field-level errors, attachment status, busy submit, success ticket number, and preserved values on failure. My Tickets uses search, filters, sort controls, clear filters, a desktop table, mobile cards, pagination, loading, empty, no-results, and failure states. Ticket Detail uses read-only ticket fields and a separate attachment section. Detailed tokens, states, accessibility, and breakpoints are in `docs/lab-02/ui-spec.md`.

## 7. Data Changes
Add or extend Prisma models:

- `DevelopmentRequester`: `id Int @id @default(autoincrement())`, unique `email`, `name`, `isActive`, timestamps, and `tickets` relation.
- `Category`: existing model gains `isActive`, `tickets` relation, and timestamps.
- `RelatedSystem`: `id`, unique `name`, `isActive`, timestamps, and `tickets` relation.
- `Ticket`: `id`, unique `ticketNumber`, `ticketDate`, `requesterId`, `categoryId`, `relatedSystemId`, `summary`, `description`, `requestedPriority`, `currentStatus`, timestamps, and relations.
- `Attachment`: `id`, `ticketId`, `originalFilename`, `storedFilename`, `mimeType`, `sizeBytes`, `storageKey`, `uploadedAt`, nullable `removedAt`, nullable `removalReason`, and relation to `Ticket`.

Use enums `RequestedPriority { LOW MEDIUM HIGH }` and `TicketStatus { NEW }` for this lab. Add foreign keys, unique constraints, and indexes for requester/date, requester/updatedAt, ticket number, category, related system, status, and attachment ticket/removal state. Use a migration and an idempotent seed with at least four active requesters, one inactive requester, four categories, and at least six systems.

## 8. API Contract
The API contract is fully specified in `docs/lab-02/api-spec.md`. All ticket and attachment routes require a `requesterId` testing-context value until Lab 3 authentication exists. The server validates it and applies ownership in every query.

## 9. Acceptance Criteria
- AC-01 Given valid data and an active requester, when submitted, then one ticket is saved with a backend-generated number and `NEW` status.
- AC-02 Given invalid or missing fields, when submitted, then field errors appear and no ticket is created.
- AC-03 Given a selected requester, when My Tickets loads, then only that requester's tickets are shown.
- AC-04 Given search, filters, sorting, and pagination, when changed, then the API query and displayed page reflect the controls.
- AC-05 Given no tickets or no matching tickets, then the correct empty or no-results state appears.
- AC-06 Given a different requester, when an owned ticket is requested, then the response does not reveal the ticket.
- AC-07 Given a permitted file, when uploaded within limits, then metadata is shown and the active file can be downloaded.
- AC-08 Given an invalid, oversized, or sixth active file, then upload is rejected with a specific safe error.
- AC-09 Given an owned attachment and valid removal reason, then it is soft-removed, metadata remains, and download is blocked.
- AC-10 Given an API failure during creation, then form values remain and a retry/error action is visible.
- AC-11 Given requester switching, then requester display and requester-specific ticket data reload.
- AC-12 Given desktop, tablet, and mobile widths, then controls remain readable, keyboard accessible, and free of horizontal page overflow.

## 10. Definition of Done
- [ ] Approved specification, API, UI, and test documents are committed before implementation PR completion.
- [ ] All included functional requirements and acceptance criteria are implemented.
- [ ] Prisma migration and repeatable seed satisfy the data rules.
- [ ] Backend validation and ownership checks are tested.
- [ ] Unit, API/integration, UI, style, responsive, and E2E tests pass with no required test skipped.
- [ ] Loading, success, validation, empty, no-results, upload, removal, and failure states are demonstrated.
- [ ] Desktop, tablet, and mobile screenshots are reviewed against `ui-spec.md`.
- [ ] README setup and test commands are current.
- [ ] Each feature arrives through a reviewed PR into `lab2-staging`; final release PR goes to `main`.
- [ ] `reviewer.md`, `ai-use.md`, and `tests.md` contain final evidence and results.

## 11. Assumptions and Decisions
- The temporary requester context is passed explicitly as `requesterId` and is not treated as authentication.
- Attachment bytes use local storage under a server-controlled directory for this lab; only opaque storage keys are persisted.
- Ticket creation and its database row are atomic. Attachments are uploaded afterward with compensation documented if storage cleanup is needed.
- Removed attachment metadata remains visible only to the owner and is labelled Removed.
- `IT Priority`, comments, actions, and later statuses are intentionally absent from Lab 2.
