# Lab 3 Test Plan and Traceability

| ID | Coverage | Maps to | Planned evidence |
| --- | --- | --- | --- |
| API-01 | valid/invalid/inactive login, logout, current user, password boundaries | AC-01, AC-02 | `server/tests/lab-03/auth.api.test.ts` |
| API-02 | direct role and ownership attacks | AC-03, AC-04, AC-06 | `server/tests/lab-03/authorization.api.test.ts` |
| API-03 | queue query and staff ticket changes | AC-05, AC-06 | `server/tests/lab-03/staff-queue.api.test.ts`, `staff-ticket-detail.api.test.ts` |
| API-04 | comment/note visibility and validation | AC-04, AC-07 | `server/tests/lab-03/comments-notes.api.test.ts` |
| API-05 | administrator CRUD safety and duplicate email | AC-08 | `server/tests/lab-03/users-admin.api.test.ts` |
| REG-01 | migrated requester tickets and attachments | AC-09 | Lab 2 regression tests plus migration test |
| UI-01 | login and mandatory password change | AC-01, AC-02 | `client/tests/lab-03/Login.test.tsx`, `ChangePassword.test.tsx` |
| UI-02 | queue/detail/users controls, feedback, and roles | AC-04–AC-08 | Lab 3 component tests |
| UI-03 | color tokens, focus, 1280/900/390 layouts | AC-10 | style tests and screenshot review |
| E2E-01 | authenticated role workflows | AC-01–AC-09 | `e2e/lab-03/*.spec.ts` |

## Executed final results

| Area | Result | Evidence |
| --- | --- | --- |
| Server API/auth/authorization/workflow/admin/regression | 22 passed | `server/tests/lab-02/*.test.ts`, `server/tests/lab-03/*.test.ts` |
| Client regression and UI tests | 7 passed | `client/tests/**/*.test.tsx` |
| Server production build | Passed | `npm run build` |
| Client production build | Passed | `npm run build` |
| Prisma migration status | Up to date | `prisma migrate status` |
| Manual UI review | Approved | `docs/lab-03/reviewer.md` |
