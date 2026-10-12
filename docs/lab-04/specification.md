# Lab 4 Sprint Engineering Specification

## 1. Sprint goal

Complete TokTickIT's service workflow by letting IT Staff record and manage ticket actions, enforcing safe resolution and closure, giving requesters and staff concise role-specific dashboards, and preserving all Lab 1–3 behavior in a polished final release.

## 2. Stakeholder request

Staff need an auditable work log beneath each ticket, with one ticket owner coordinating while other eligible staff can be assigned actions. Requester reports that a problem appears resolved remain advisory until staff review the work. Dashboards should summarize actionable work and link to its detailed ticket.

## 3. Scope

**Included:** Actions Taken data/API/UI; assignment to active IT Staff; ticket status transition and resolution rules; requester, staff, and administrator dashboards; migration and realistic idempotent seed; regression, security, accessibility, responsive and visual review; release evidence and documentation.

**Excluded:** SLA clocks, external notifications, inventory/cost tracking, timesheets/payroll, multi-level approvals, report builders/data warehouses, multi-tenant/cloud operations, and features outside this contract.

## 4. Functional requirements

- FR-01: A ticket has zero or more Actions Taken. IT Staff and Administrators can create and edit them on accessible tickets; Requesters can read actions for tickets they own.
- FR-02: Each action records action date/time, description, result, creator/performed-by identity, optional active IT Staff assignee, follow-up-required flag and conditional follow-up note, attachment notes, lifecycle status, and audit timestamps.
- FR-03: Action writes validate fields, ticket access, role, active assignee, and expected version on the server.
- FR-04: Ticket transitions follow BR-06. Requester resolution feedback is advisory; only IT Staff/Administrator can formally resolve, close, reopen, or cancel.
- FR-05: Requester dashboard returns only that user's ticket counts and a concise recent/attention list. Staff and Administrator dashboards return operational counts, current user's assigned actions, and recent/urgent tickets.
- FR-06: Every dashboard metric is computed from authoritative database records and has a documented drill-down filter and zero-data behavior.
- FR-07: Existing authentication, requester ownership, ticket queue/detail, comments, notes, attachments, and user management continue to work.
- FR-08: The interface uses the Zen Green design, accessible feedback, keyboard support, and responsive layouts without horizontal page overflow.
- FR-09: Final evidence documents tests, migration/recovery, demo steps, review, screenshots, AI use, and completion against the product DoD.

## 5. Business rules

- BR-01: Every Action Taken belongs to exactly one existing Ticket; deleting a ticket cascades its actions consistently with other ticket children.
- BR-02: Ticket owner coordinates the whole ticket. Action assignee may be a different active `IT_STAFF` user; Administrators can perform staff operations but are not eligible assignees.
- BR-03: `performedBy` is captured from the authenticated actor on creation and is immutable. Reassignment changes `assignee`, not authorship. Action date/time is user-entered, required, stored as UTC, and displayed in the user's local browser time.
- BR-04: Description is required (1–2,000 trimmed characters); result and attachment notes are optional (up to 2,000 and 1,000 characters); follow-up note is required (1–1,000 characters) when follow-up is true and is cleared when false.
- BR-05: Actions have `PLANNED`, `IN_PROGRESS`, `COMPLETED`, or `CANCELLED` status. Permitted transitions are PLANNED→IN_PROGRESS/COMPLETED/CANCELLED, IN_PROGRESS→COMPLETED/CANCELLED, and no transition out of COMPLETED/CANCELLED. Description, result, assignee, follow-up, and attachment notes may be edited while action is not terminal; date/time, creator, and ticket link are immutable. A repeated identical terminal request is idempotent; conflicting edits return 409.
- BR-06: Ticket status transitions are NEW→OPEN/CANCELLED; OPEN→IN_PROGRESS/WAITING_FOR_REQUESTER/RESOLVED/CANCELLED; IN_PROGRESS→WAITING_FOR_REQUESTER/RESOLVED/CANCELLED; WAITING_FOR_REQUESTER→IN_PROGRESS/RESOLVED/CANCELLED; RESOLVED→CLOSED/REOPENED; CLOSED→REOPENED; REOPENED→IN_PROGRESS/WAITING_FOR_REQUESTER/RESOLVED/CANCELLED; CANCELLED is terminal. Only IT Staff/Administrators may transition. RESOLVED requires at least one COMPLETED action with a non-empty result; CLOSED requires RESOLVED; reopen requires a non-empty reason. Requester feedback never changes status.
- BR-07: Ticket and action status changes use optimistic concurrency through an integer version. A write supplies `expectedVersion`; mismatch returns 409 with current version/status and does not overwrite data. Successful writes increment version atomically.
- BR-08: Requester dashboard scope derives from the authenticated user-to-requester relation, never a client-supplied owner. Open means status is not CLOSED or CANCELLED. Waiting means WAITING_FOR_REQUESTER. Recently updated/resolved means last 7×24 hours in UTC, with stable `updatedAt DESC, id DESC` ordering and at most five rows per list.
- BR-09: Staff dashboard is visible to IT Staff and Administrators. Unassigned count is tickets with null owner and status not CLOSED/CANCELLED. Owned count is tickets assigned to current staff and not CLOSED/CANCELLED. Status and priority counts cover non-terminal tickets. Current user's actions count PLANNED/IN_PROGRESS assigned actions. Recent list is five most recently updated non-terminal tickets; urgent list is up to five HIGH priority non-terminal tickets.
- BR-10: A zero metric is `0`; an empty list is `[]` and the UI explains that no records match. Counts and lists are obtained from the same authorization-scoped query rules.
- BR-11: Migration preserves all prior records. Legacy tickets start with version 1 and no actions; absence of actions does not block viewing or dashboards, but staff must record a completed action before resolving them.
- BR-12: Seed is idempotent and demonstrates every ticket status/priority, assigned/unassigned ownership, tickets with zero/one/multiple actions, follow-up, and both nonzero and zero dashboard cases.

## 6. UI specification summary

Role navigation adds Dashboard. Requester dashboard links to filtered My Tickets lists and ticket detail. Staff dashboard provides metric cards, current-user assigned actions, recent tickets, and urgent tickets with queue/detail destinations. Ticket detail gains a chronological Actions Taken list and create/edit modes; requesters see a read-only list, and staff/admins see permitted controls. Workflow controls show only allowed transitions and explain resolution requirements. Loading, empty, forbidden, validation, conflict, not-found, and safe-failure states are specified in [ui-spec.md](ui-spec.md). All views follow responsive and accessibility rules there.

## 7. Data changes and migration decisions

Add `TicketAction` with ticket FK, action date/time, description, result, `performedById` (creator), nullable `assigneeId`, follow-up fields, attachment notes, enum status, `version`, created/updated timestamps. Add `Ticket.version` and nullable `resolutionReason` to support stale-write detection and audited reopen/cancel reasons. Add indexes `(ticketId, actionDateTime, id)`, `(assigneeId, status)`, and retain existing ticket owner/status/priority indexes. Use restrictive user references for performed-by/assignee so user history cannot be orphaned; tickets cascade their actions. Additive migration defaults existing ticket versions to 1 and creates no synthetic actions. Seed uses stable unique ticket numbers and upserts related rows/actions. Before migration take a database backup; rollback restores that backup if the additive migration must be reversed, since dropping new tables/columns would discard Lab 4 data.

**Design decisions:** A separate action assignee preserves the distinction between ticket coordination and task execution. Immutable `performedById` preserves authorship when actions are reassigned. Explicit version counters provide portable stale-write detection and avoid silent last-write-wins behavior. UTC timestamps keep ordering and seven-day dashboard boundaries consistent across client time zones.

## 8. API contract summary

Exact requests, responses, validation and status codes are in [api-spec.md](api-spec.md). Planned endpoints: `GET/POST /api/tickets/:id/actions`; `PATCH /api/tickets/:id/actions/:actionId`; `GET /api/requester/dashboard`; `GET /api/staff/dashboard`; and versioned `PATCH /api/staff/tickets/:id`. All writes derive actor from the session, enforce role and ownership on the backend, validate active assignees, and return safe errors. Existing Lab 2/3 endpoints remain supported.

## 9. Acceptance criteria

- AC-01: Staff/Admin can create multiple actions on one ticket; the stored creator is the authenticated actor and the assignee can differ from the ticket owner.
- AC-02: Requesters can read actions on owned tickets and cannot create/update actions or read another requester's actions.
- AC-03: Invalid fields, missing follow-up note, inactive/non-staff assignee, terminal edits, and unauthorized writes are rejected safely.
- AC-04: A stale action or ticket version returns 409 and leaves the newer record intact.
- AC-05: Only transitions in BR-06 succeed; resolution requires a completed action with result; requester feedback is advisory.
- AC-06: Requester dashboard metrics/lists only include owned tickets and match database queries for recent, waiting, open, and resolved counts.
- AC-07: Staff dashboard includes correct unassigned, current-owner, status, priority, assigned-action, recent, and urgent data; zero cases return usable zero/empty states.
- AC-08: Dashboard cards and rows navigate to the corresponding filtered detailed views.
- AC-09: Lab 1–3 authentication, authorization, requester, staff, administrator, comment, note, and attachment regression passes after migration.
- AC-10: Screens are usable by keyboard and screen-reader labels, have visible focus and non-color status cues, and have no clipping/overlap/page overflow at desktop, tablet, and mobile widths.
- AC-11: Migration preserves prior data; repeatable seed produces the documented representative state.
- AC-12: Final release docs and evidence accurately report all checks and reviewer outcomes.

## 10. Definition of Done

- [ ] Four engineering contracts and acceptance/test traceability are reviewed before implementation PRs.
- [ ] Additive Prisma migration and rollback/recovery steps are documented; existing records remain intact.
- [ ] API authorization, validation, conflict, transition, dashboard-query and regression tests pass.
- [ ] UI component/style, responsive, accessibility, and E2E tests pass; desktop/tablet/mobile screenshots are captured.
- [ ] Manual visual review confirms Zen Green consistency, safe states, drill-down links, no console errors or unfinished controls.
- [ ] README, seed/migration/demo instructions, `.gitignore`, reviewer record, and AI-use reflection are current.
- [ ] Six Lab 4 Issues are linked to feature branches and reviewed PRs into `lab4-staging`; final release PR is reviewed into `main`.
- [ ] Final main branch evidence supports all nine handout submission parts; no review comments remain unresolved.

## 11. Assumptions and decisions

Actions are visible to the owner requester of the parent ticket and all staff/admin users with ticket access. Administrators retain staff read/write capabilities as required by the handout. Action assignment is optional; when present it must target an active IT Staff account. Ticket closure requires prior formal resolution, and cancellation/reopen require a reason. UTC is the canonical storage/calculation zone; local time is presentation only. Dashboard lists are intentionally capped and link to existing detailed screens rather than duplicating ticket collections.
