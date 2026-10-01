# Lab 3 Test Plan and Traceability

The plan below maps Lab 3 acceptance criteria to tests actually present in the final `main` source tree. Paths are repository-relative and should be linked or rendered in the final submission PDF.

## Planned coverage and AC traceability

| ID | Type | Coverage | Acceptance criteria | Planned/actual evidence |
| --- | --- | --- | --- | --- |
| API-01 | API/integration | Valid, invalid, inactive login; logout; current user; password boundaries | AC-01, AC-02 | `server/tests/lab-03/auth.api.test.ts` |
| API-02 | Authorization/security | Direct role and ownership attacks; protected requester operations | AC-03, AC-04, AC-06 | `server/tests/lab-03/authorization.api.test.ts` |
| API-03 | API/integration | Queue search, filters, sorting, pagination, ownership, and staff changes | AC-05, AC-06 | `server/tests/lab-03/staff-queue.api.test.ts`; `server/tests/lab-03/staff-ticket-detail.api.test.ts` |
| API-04 | API/integration | Public Comment/Internal Note visibility, append-only behavior, and validation | AC-04, AC-07 | Covered in `server/tests/lab-03/staff-ticket-detail.api.test.ts` |
| API-05 | API/integration | Administrator listing, search, role safety, duplicate email, reset password, and account safety | AC-08 | `server/tests/lab-03/users-admin.api.test.ts` |
| REG-01 | Migration/regression | Existing requester tickets and attachments remain available | AC-09 | `server/tests/lab-02/*.test.ts`; Prisma migration status; seeded database |
| UI-01 | UI/component | Login, first-login password change, role navigation, logout, and safe feedback | AC-01, AC-02 | Existing client regression tests plus screenshots under `artifacts/lab-03/screenshots/authentication/` |
| UI-02 | UI/component | Queue, ticket detail, user management controls, feedback, and role behavior | AC-04–AC-08 | Existing client tests plus screenshots under `artifacts/lab-03/screenshots/staff-queue/`, `staff-ticket-detail/`, and `user-management/` |
| UI-03 | UI/style/responsive | Zen Green tokens, focus, desktop/tablet/mobile layouts, clipping, and overflow | AC-10 | `client/tests/lab-02/ui-style.test.tsx`; responsive screenshots |
| E2E-01 | E2E | Authenticated Requester, IT Staff, and Administrator workflows | AC-01–AC-09 | Lab 3 E2E files are not present; do not claim E2E passing output until they are added and run |

## Actual test-file inventory on `main`

### Server unit/API/integration/security tests

- `server/tests/lab-01/categories.test.ts`
- `server/tests/lab-01/health.test.ts`
- `server/tests/lab-02/attachments.api.test.ts`
- `server/tests/lab-02/create-ticket.api.test.ts`
- `server/tests/lab-02/my-tickets.api.test.ts`
- `server/tests/lab-02/requesters.api.test.ts`
- `server/tests/lab-02/ticket-detail.api.test.ts`
- `server/tests/lab-02/ticket-number.test.ts`
- `server/tests/lab-03/auth.api.test.ts`
- `server/tests/lab-03/authorization.api.test.ts`
- `server/tests/lab-03/staff-queue.api.test.ts`
- `server/tests/lab-03/staff-ticket-detail.api.test.ts`
- `server/tests/lab-03/users-admin.api.test.ts`

`server/tests/lab-03/requester-test-helper.ts` is a helper, not a test suite.

### Client UI/style tests

- `client/tests/lab-01/App.test.tsx`
- `client/tests/lab-02/AttachmentSection.test.tsx`
- `client/tests/lab-02/CreateTicket.test.tsx`
- `client/tests/lab-02/MyTickets.test.tsx`
- `client/tests/lab-02/RequesterTicketDetail.test.tsx`
- `client/tests/lab-02/ui-style.test.tsx`

There is currently no `client/tests/lab-03/` directory. Lab 3 UI evidence therefore comes from the production build, existing regression/style tests, manual review, and screenshots—not dedicated Lab 3 component test files.

### E2E tests

- Existing: `e2e/lab-02/requester-ticket-flow.spec.ts`
- Missing: `e2e/lab-03/authentication.spec.ts`
- Missing: `e2e/lab-03/staff-ticket-flow.spec.ts`
- Missing: `e2e/lab-03/user-administration.spec.ts`

## Verified execution results from `main`

| Area | Result | Evidence/command |
| --- | --- | --- |
| Prisma migration status | Passed: schema up to date; 7 migrations found | `npm.cmd exec prisma migrate status` |
| Repeatable seed | Passed using compiled seed command | `node server/dist/prisma/seed.js` |
| Server production build | Passed | `server/npm.cmd run build` |
| Client production build | Passed | `client/npm.cmd run build` |
| Client tests | 7 tests passed | `client/npm.cmd test` |
| Lab 3 authentication | 4 tests passed when seeded and run individually | `server/tests/lab-03/auth.api.test.ts` |
| Lab 3 authorization | 3 tests passed when seeded and run individually | `server/tests/lab-03/authorization.api.test.ts` |
| Lab 3 staff queue | 2 tests passed when seeded and run individually | `server/tests/lab-03/staff-queue.api.test.ts` |
| Lab 3 ticket detail/comments/notes | 2 tests passed when seeded and run individually | `server/tests/lab-03/staff-ticket-detail.api.test.ts` |
| Lab 3 administrator management | 2 tests passed when seeded and run individually | `server/tests/lab-03/users-admin.api.test.ts` |
| Manual UI review | Approved | `docs/lab-03/reviewer.md` and `artifacts/lab-03/screenshots/` |

The individually executed Lab 3 server suites total 13 passing tests. Do not report the complete server suite as fully passing until shared PostgreSQL test-state interference is resolved; parallel execution has produced authentication/authorization failures because tests mutate the same seeded records.

## Submission evidence status

- [x] API, authorization, migration/regression, build, and existing UI/style evidence has an actual repository path.
- [x] Lab 3 API suites pass when seeded and run individually.
- [x] Real desktop/tablet/mobile screenshots are committed under `artifacts/lab-03/screenshots/`.
- [ ] Dedicated Lab 3 client component tests are present.
- [ ] Dedicated Lab 3 E2E tests are present and passing.
- [ ] A clean parallel server-suite result is available.
