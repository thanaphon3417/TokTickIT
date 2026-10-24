# Lab 4 Test Plan and Traceability

Plan tests before feature implementation. Record the actual test path and final status as work lands; do not mark planned checks passed without evidence.

| Test ID | Type | Requirement / AC | What it tests | Expected result | Planned automated file | Final |
| --- | --- | --- | --- | --- | --- | --- |
| API-01 | API | AC-01, AC-02 | Action list ownership, role visibility, stable order, Admin workspace access | Correct rows only; Requesters denied staff routes and writes | `server/tests/lab-04/actions-taken.api.test.ts` | Passed: 2026-10-12; 3 action API tests including Administrator ticket access |
| API-02 | API | AC-01, AC-03 | Create action validation, author auto-capture, different assignee | 201 and correct actor/ticket/assignee; invalid fields rejected | `server/tests/lab-04/actions-taken.api.test.ts` | Passed: 2026-10-12; 3 action API tests |
| API-03 | API | AC-03, AC-04 | Edit, assignment and action state transitions | Valid edits increment version; inactive assignee and stale version rejected | `server/tests/lab-04/actions-taken.api.test.ts` | Passed: 2026-10-12; 3 action API tests |
| API-04 | API | AC-05 | Ticket transition rules, resolution gate and requester advisory signal | Legal transitions, completed action/result requirement, reason requirement, feedback invariance | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed: 2026-10-12; 2 workflow API tests |
| API-05 | API | AC-04 | Stale ticket updates | Stale update returns 409 with current version/status; winner remains intact | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed: 2026-10-12; covered in workflow API test |
| API-06 | API | AC-06 | Requester dashboard isolation and calculations | Metrics/lists match owned-ticket query and 168-hour UTC boundary | `server/tests/lab-04/requester-dashboard.api.test.ts` | Passed: 2026-10-13; 2 tests cover session-derived scope, role denial, bounded stable lists |
| API-07 | API | AC-07 | Staff/Admin dashboard counts, assigned actions and list limits | Exact query counts, stable ordering, correct role behavior | `server/tests/lab-04/staff-dashboard.api.test.ts` | Passed: 2026-10-13; 2 tests compare metrics and role responses to database queries |
| API-08 | API | AC-07, AC-08 | Empty dashboard and drill-down query contracts | Zero counts, empty arrays, each filter maps to destination | `server/tests/lab-04/*dashboard.api.test.ts` | Passed: 2026-10-13; active-only owner/status/priority queue filters match dashboard metrics and reject invalid filters |
| API-09 | API | AC-13 | Action creation retry with the same key and payload; key reused with a different payload | Same saved row is returned without duplication; conflicting payload returns 409 | `server/tests/lab-04/actions-taken.api.test.ts` | Passed: 2026-10-12; 3 action API tests |
| API-10 | API | AC-14 | Requester feedback ownership, role, version conflict, and status invariance | Owner can set/clear flag; status never changes; other roles/owners and terminal tickets are rejected | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed: 2026-10-12; covered in workflow API test |
| UI-01 | Component | AC-01, AC-03 | Action list and create/edit modes, field errors, submit state | Labeled editor and safe feedback match contract | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed: 2026-10-12; 3 Actions Taken component tests |
| UI-02 | Component | AC-05 | Transition controls and resolution guidance | Only allowed transitions; refresh after success | `client/tests/lab-04/TicketWorkflow.test.tsx` | Passed: 2026-10-12; workflow controls, requester feedback status invariance, and staff read-only visibility |
| UI-03 | Component | AC-06, AC-08 | Requester dashboard metrics, empty state, navigation | Own-ticket cards/rows and correct links | `client/tests/lab-04/RequesterDashboard.test.tsx` | Passed: 2026-10-13; metrics, empty list, detail/filter navigation, retry error |
| UI-04 | Component | AC-07, AC-08 | Staff dashboard metrics, assigned actions and navigation | Correct links and empty/loading/failure states | `client/tests/lab-04/StaffDashboard.test.tsx` | Passed: 2026-10-13; metric filters, action selection, empty and error states |
| UI-05 | Style/accessibility | AC-10 | Keyboard, labels, focus, status text, mobile layouts | No focus trap, missing names, clipping, overlap, or horizontal overflow | `client/tests/lab-04/*.test.tsx` + `e2e/lab-04/release-evidence.spec.ts` + manual checklist | Responsive/visual passed 2026-10-13: keyboard focus-visible, labeled queue status, and no overflow at 390/768/1280px; visual review found and fixed mobile queue rows and Ticket Detail control overlap; Zen Green theme retained. Full screen-reader/contrast audit remains a manual reviewer check. |
| UI-06 | Component | AC-13 | Repeated submit and network retry reuse the same idempotency key | One action is stored and retry feedback reflects the saved action | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed: 2026-10-12; create retry reuses key after network failure |
| UI-07 | Component | AC-14 | Requester feedback control and staff read-only visibility | Advisory state is visible and never presented as a formal status transition | `client/tests/lab-02/RequesterTicketDetail.test.tsx`, `client/tests/lab-04/TicketWorkflow.test.tsx` | Passed: 2026-10-12; requester feedback/status and staff read-only UI tests |
| DB-01 | Migration/regression | AC-09, AC-11 | Apply migration against prior Lab 3 database and verify existing tickets/users/comments/notes/attachments | All old records remain; ticket version defaults to 1; legacy actions empty | `server/tests/lab-04/migration.test.ts` + `docs/lab-04/migration-recovery.md` | Passed: prior Lab 3 counts retained; versions 1; zero legacy actions |
| DB-02 | Seed | AC-07, AC-11 | Re-run seed and inspect statuses, assignments, and 0/1/multiple actions | Idempotent representative data and zero/nonzero metrics | `server/tests/lab-04/seed.test.ts` | Passed: two runs left 3 actions across 0/1/2 demo cases; PLANNED/IN_PROGRESS/COMPLETED present |
| DB-03 | Migration recovery | AC-11 | Restore pre-migration backup in a disposable database and verify the Lab 3 baseline | Recovery procedure is repeatable and pre-migration records remain readable | Manual rehearsal in `docs/lab-04/migration-recovery.md` | Passed: second disposable restore matched Lab 3 counts |
| REG-01 | Regression | AC-09 | Existing Lab 1–3 API/client suites | No regression in auth, ownership, staff, admin, comments, notes, attachments | Existing `server/tests/**`, `client/tests/**` | Passed after Issue #50: server 17 files / 36 tests; client 8 files / 12 tests (2026-10-12) |
| E2E-01 | E2E | AC-01, AC-03 | Staff creates an action; requester reads it; Administrator reaches and creates from ticket detail | Role-specific access and 390px layout work through the browser UI | `e2e/lab-04/actions-taken-flow.spec.ts` | Passed: 2026-10-13; staff and Administrator creation, requester read-only view, and mobile overflow |
| E2E-02 | E2E | AC-05 | Ticket resolution evidence gate, cancel reason, and requester advisory feedback | Status rules and feedback invariance work end to end | `e2e/lab-04/ticket-resolution.spec.ts` | Passed: 2026-10-13; resolve with completed action, cancel blocked without reason, feedback keeps status OPEN |
| E2E-03 | E2E | AC-06, AC-07, AC-08 | Requester and staff dashboard calculations and drill-down | UI metrics match seeded database and detail filters | `e2e/lab-04/dashboards.spec.ts` | Passed: 2026-10-13; 2 isolated browser flows verify requester/status filter query and filtered destinations |
| E2E-04 | E2E | AC-13 | Retry Action Taken creation after a simulated lost response | Exactly one action appears and the retry returns the stored action | `e2e/lab-04/actions-taken-flow.spec.ts` | Passed: 2026-10-13; simulated 503 preserves form values and retries with the same key, producing one saved action |
| E2E-05 | E2E | AC-14 | Requester marks own ticket appears-resolved and staff reviews feedback | Advisory flag is visible to staff while status remains unchanged until a staff transition | `e2e/lab-04/ticket-resolution.spec.ts` | Passed: 2026-10-13; browser saves advisory feedback while formal status remains OPEN; staff read-only visibility covered by component test |
| PERF-01 | Performance smoke | AC-07 | Dashboard endpoints with seeded representative volume | Bounded summary payloads and stable query response | Documented local smoke using seeded DB | Passed: 2026-10-25; six authenticated requests per endpoint, first request treated as warm-up. Requester median 15.77 ms / 502 bytes with recent=2, attention=0, resolved=0. Staff median 17.14 ms / 2,176 bytes with recent=5, urgent=5, assigned-actions=0. |
| VIS-01 | Manual visual | AC-10, AC-12 | Desktop/tablet/mobile dashboard and action detail | Screenshots and checklist show coherent, responsive Zen Green UI | `artifacts/lab-04/screenshots/` | Passed: 2026-10-13; 9 dashboard/action-detail screenshots at 390/768/1280px; manually reviewed Zen Green styling and responsive content, fixed two mobile layout defects |

## Final verification record

- 2026-10-13: Server production build passed; full server regression suite passed (19 files, 40 tests).
- 2026-10-13: Client production build passed; full client regression suite passed (10 files, 16 tests).
- 2026-10-13: Lab 4 Playwright suite passed with one worker and an already-running Vite server; the auto-started server configuration hung during process teardown, so it was rerun in the stable setup.
- 2026-10-13: Full client suite passed after final responsive/accessibility updates (10 files, 16 tests); client production build passed.
- 2026-10-13: Full Lab 4 Playwright suite passed (8 tests across actions, retry, dashboards, ticket workflow, requester feedback, and screenshot evidence); screenshots cover staff/requester dashboards and Action Taken detail at desktop (1280px), tablet (768px), and mobile (390px), checking keyboard focus-visible, labeled queue status, mobile cards, and horizontal overflow.
- 2026-10-13: Manual screenshot review found missing staff queue content at mobile width and overlapping ticket work controls on Ticket Detail. Added labeled Zen Green queue cards and responsive work-control columns; regenerated screenshots and visually confirmed the correction.
- 2026-10-13: `git diff --check` passed after final responsive/accessibility updates.
- 2026-10-13: Draft submission PDF was generated with exactly one each of “Answer Part 1” through “Answer Part 9” and 22 clickable links. It is explicitly marked as a draft pending main-branch evidence, final Kanban state, personal reflection, and human accessibility checks.
- 2026-10-14: PR #59 was approved by `siripitch-c` and merged into `lab4-staging` as `0bb7514`. The next release step must integrate current `main` and rerun final evidence against the resulting release branch.
- 2026-10-25: Authenticated performance smoke passed against the local seeded database. Six requests were measured for each dashboard after login; the first request was treated as warm-up. Requester dashboard median was 15.77 ms at 502 bytes, with list lengths 2/0/0. Staff dashboard median was 17.14 ms at 2,176 bytes, with recent and urgent lists capped at 5 and assigned actions at 0.

## Issue #51 verification record

- 2026-10-13: `npm.cmd run build` passed in both `server/` and `client/` after the dashboard implementation.
- 2026-10-13: Full server suite passed (19 files, 40 tests); dashboard API tests were rerun after adding a stale-ticket 168-hour-window fixture and active-only queue filter checks (2 files, 4 tests).
- 2026-10-13: Full client suite passed (10 files, 16 tests); dashboard and Actions Taken component tests passed again after final navigation/empty-state updates.
- 2026-10-13: Complete Lab 4 browser suite passed (4 tests, 4 flows), including the updated Actions Taken staff landing flow; requester and staff dashboard flows checked 390px viewport overflow and verified dashboard filters reached the detailed ticket views.
- 2026-10-13: `git diff --check` passed. Existing Zen Green colors, app shell, and shared typography remain in use.

## Issue #48 verification record

- 2026-10-12: `npx.cmd prisma validate`, `npx.cmd prisma generate`, and `npm.cmd run build` in `server/` passed.
- 2026-10-12: `npm.cmd run test:e2e:lab4` — Actions Taken staff-create/requester-read (390px) and Administrator access browser flows passed with isolated API fixtures.
- 2026-10-12: `npm.cmd test -- tests/lab-04` passed (3 files, 5 tests).
- 2026-10-12: Full `npm.cmd test` in `server/` passed (16 files, 33 tests).
- 2026-10-12: `npx.cmd prisma migrate deploy` applied `20261012090000_lab4_actions` after a custom-format backup; recovery and seed rerun evidence is in `migration-recovery.md`.
- Client/component, E2E, accessibility, and visual checks remain planned for later Lab 4 issues/final integration.

## Issue #50 verification record

- 2026-10-12: `npm.cmd run build` in `server/` and `client/` passed.
- 2026-10-12: `npm.cmd test` in `server/` passed (17 files, 36 tests), including exhaustive permitted/forbidden transitions, resolution gate, reason validation, role/ownership, and stale feedback conflict coverage.
- 2026-10-12: `npm.cmd test` in `client/` passed (8 files, 12 tests), including requester advisory feedback with unchanged formal status and staff read-only visibility.
- 2026-10-12: Existing staff-ticket workflow regression now supplies the required expected version; existing UI theme and shell were preserved.
- E2E workflow, accessibility, and desktop/tablet/mobile visual checks remain planned for final integration.
