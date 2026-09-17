# Lab 3 Sprint Engineering Specification

## 1. Sprint goal

Replace the temporary requester selector with secure, session-based authentication and deliver role-safe requester, IT Staff, and Administrator workflows without losing Lab 2 ticket or attachment data.

## 2. Scope

Included: login, logout, mandatory initial-password change, authenticated identity, role-based navigation and API authorization; requester regression; staff queue and ticket operations; append-only public comments and internal notes; and minimal administrator user management.

Excluded: self-registration, password-reset email, MFA, SSO, user deletion, bulk operations, Actions Taken, SLA/KPIs, and cloud deployment.

## 3. Roles and authorization matrix

| Operation | Requester | IT Staff | Administrator |
| --- | --- | --- | --- |
| Create/read own tickets and attachments | Yes | No | No |
| Queue, assignment, IT priority, staff status changes | No | Yes | No |
| Public comments | Own ticket | Queue tickets | Read only |
| Internal notes | No | Yes | Read only |
| User administration | No | No | Yes |

Every protected operation is enforced on the server. Hiding a client control is never authorization.

## 4. Functional requirements

- FR-01: Active users authenticate with email and password and receive a server-managed session.
- FR-02: Login, logout, and current-user endpoints return only safe identity fields.
- FR-03: A user with `mustChangePassword` cannot reach normal application routes until a valid replacement password is saved.
- FR-04: Requester ticket and attachment ownership comes from the authenticated user, never a client requester ID.
- FR-05: IT Staff can search, filter, sort, paginate, and open the shared ticket queue.
- FR-06: IT Staff can claim/reassign a ticket to an eligible active staff user, set IT priority, and make permitted status changes.
- FR-07: Requesters and staff can append public comments; staff can append internal notes.
- FR-08: Administrators can list/search/filter users, create/edit one-role accounts, activate/deactivate them, and reset an initial password.
- FR-09: The UI is role-aware, responsive, accessible, and uses the Zen Green reference theme.

## 5. Business rules

- BR-01: Only active users with valid credentials may authenticate; passwords are hashed and never returned.
- BR-02: New and reset passwords set `mustChangePassword`; a valid password is 12-128 characters.
- BR-03: An account has exactly one role: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`.
- BR-04: Each ticket has zero or one owner, who must be active IT Staff. IT priority starts as requested priority.
- BR-05: Statuses are `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`. Staff transitions are explicitly validated server-side; requester resolution indication does not formally resolve or close a ticket.
- BR-06: Public comments are visible to the requester, staff, and administrators; internal notes are visible only to staff and administrators. Both are append-only, trimmed, and 1-2,000 characters.
- BR-07: Emails are case-insensitively unique. An administrator cannot deactivate themselves or remove/deactivate the final active administrator.
- BR-08: Users are deactivated, never deleted, during Lab 3.

## 6. Data and migration decisions

Create `User` with name, unique normalized email, password hash, role, active state, password-change flag, and timestamps. Migrate each existing `DevelopmentRequester` into a requester user and retain the existing requester row/foreign keys through a one-to-one link, so existing tickets and attachments remain intact. Add nullable ticket owner, IT priority, expanded status, requester-resolution indication, `PublicComment`, and `InternalNote` models. Use a transactional, repeatable migration/seed and indexes for user email/role/active state, ticket owner/status/priority, and ticket comment/note dates.

## 7. UI summary

The shell has a dark green TokTickIT bar, compact navigation, current-user profile menu, pale surfaces, outlined controls, green primary actions, and soft status/role badges. The Administrator Users screen follows UI-1: user list, search/filter, create button, and an edit/create panel. The Staff Ticket Detail follows UI-2: breadcrumb, compact field grid, work controls, and tabbed comments/notes. At desktop widths the layouts are multi-column; below 768px they stack without page overflow.

## 8. Acceptance criteria

- AC-01: Valid active credentials establish authenticated access with safe identity and role data.
- AC-02: Initial-password users must change it before reaching normal screens.
- AC-03: A requester cannot retrieve another requester's data by supplying a different ID.
- AC-04: A requester cannot read or create internal notes.
- AC-05: Staff queue supports search, filters, sorting, pagination, ownership, status, and priority data.
- AC-06: Only authorized staff operations can change ownership, IT priority, or status.
- AC-07: Public comments and internal notes respect visibility and append-only rules.
- AC-08: Administrator user management validates inputs, duplicate email, one role, reset-password, and safety rules.
- AC-09: Existing Lab 2 tickets and attachments remain available through authenticated requester flows.
- AC-10: Major screens match the Zen Green specification at 1280px, 900px, and 390px.

## 9. Definition of done

- [ ] This contract, API contract, UI specification, test plan, reviewer record, and AI-use record exist before implementation PR completion.
- [ ] Migration preserves Lab 2 data and repeatable seed creates safe demo accounts.
- [ ] Unit, API, UI, authorization, regression, responsive, and E2E tests pass.
- [ ] Desktop/tablet/mobile evidence exists for login, staff queue/detail, and user management.
- [ ] PR review evidence and a final release PR are recorded after all checks pass.
