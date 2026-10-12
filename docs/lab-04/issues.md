# Lab 4 Issue and Branch Plan

Create these six GitHub Issues before implementation and link each feature branch/PR to its issue. All feature PRs target `lab4-staging`; the final release PR targets `main` after staged verification.

| Issue | Issue title | Scope / completion evidence | Feature branch |
| --- | --- | --- | --- |
| [#47](https://github.com/thanaphon3417/TokTickIT/issues/47) | Lab 4 engineering contract and test planning | Review `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md`; resolve open contract decisions and map every AC to tests before feature implementation. | `feature/lab4-47-planning` |
| [#48](https://github.com/thanaphon3417/TokTickIT/issues/48) | Actions Taken data, migration, API, and seed | Additive Prisma migration/model, versioning, idempotent representative seed, role/ownership-safe create/read/update APIs, validation and API/migration tests. | `feature/lab4-48-actions-api` |
| [#49](https://github.com/thanaphon3417/TokTickIT/issues/49) | Actions Taken ticket detail interface | Requester read-only actions and staff/admin list/create/assign/edit/status UI, responsive validation/feedback, component and E2E coverage. | `feature/lab4-49-actions-ui` |
| [#50](https://github.com/thanaphon3417/TokTickIT/issues/50) | Ticket lifecycle and resolution gate | Enforce transition matrix and version conflicts server-side; require completed action/result for resolution; advisory requester signal; workflow UI/tests. | `feature/lab4-50-ticket-workflow` |
| [#51](https://github.com/thanaphon3417/TokTickIT/issues/51) | Requester and staff operational dashboards | Authorized compact dashboard APIs, exact calculations, zero states, drill-down filters, role-appropriate UI, query/API/component/E2E coverage. | `feature/lab4-51-dashboards` |
| [#52](https://github.com/thanaphon3417/TokTickIT/issues/52) | Final regression, accessibility, polish, and release readiness | Full Lab 1–4 regression; responsive/accessibility/visual inspection; screenshots, README, reviewer and AI-use records; release checklist and staged verification. | `feature/lab4-52-final-release` |

## Proposed GitHub Issue descriptions

### Issue 1: Lab 4 engineering contract and test planning

**Goal:** Convert the Lab 4 handout into a reviewed, testable engineering contract before implementation.

**Deliverables:** `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, six-issue plan, and explicit definition of done.

**Acceptance criteria:**

- Every included requirement has a stable FR/BR/AC identifier and excluded scope is explicit.
- Action data/assignment/authorship, ticket transitions and resolution gate, dashboard math/drill-down, migration/recovery, concurrency, and failure behavior are decided.
- Every acceptance criterion maps to planned tests; regression, responsive, accessibility, E2E and final evidence checks are included.
- Team review closes ambiguities before Issue 2 begins.

### Issue 2: Actions Taken data, migration, API, and seed

**Goal:** Persist and securely expose Actions Taken while retaining Lab 1–3 records.

**Acceptance criteria:** additive migration preserves old data; actor comes from session; requesters read only owned-ticket actions; staff/admin create and update; validation and active assignee rules are enforced; versions prevent stale overwrite; seed reruns safely and covers zero/one/multiple actions; migration/API tests pass.

### Issue 3: Actions Taken ticket detail interface

**Goal:** Let requesters inspect actions and let staff/admin record, assign, edit, and transition actions from ticket detail.

**Acceptance criteria:** fields and role permissions match contract; creator/ticket/date are immutable after creation; follow-up validation and active assignee feedback are clear; repeated submission is prevented; recoverable errors preserve entered data; responsive/accessibility and E2E coverage pass.

### Issue 4: Ticket lifecycle and resolution gate

**Goal:** Complete ticket lifecycle with authoritative server-side transition and resolution rules.

**Acceptance criteria:** every matrix edge and forbidden edge is covered; resolve requires completed action with result; close requires resolved; reopen/cancel require reason; requester resolution feedback remains advisory; expected-version mismatch safely returns conflict; UI refreshes status after success.

### Issue 5: Requester and staff operational dashboards

**Goal:** Provide concise, backend-calculated dashboards for requesters and staff/admins.

**Acceptance criteria:** requester data is ownership-scoped; staff/admin metrics follow BR-09; stable recent/urgent/action lists are capped; empty metrics/lists render useful states; cards/rows link to detailed filtered views; API, component and E2E results match authoritative database queries.

### Issue 6: Final regression, accessibility, polish, and release

**Goal:** Verify the complete application and prepare reviewable Lab 4 release evidence.

**Acceptance criteria:** all Lab 1–4 automated suites pass; manual desktop/tablet/mobile and keyboard/accessibility review is recorded; screenshots, README, reviewer and AI-use records are accurate; no unresolved review comments; `lab4-staging` is ready for a separately reviewed release PR to `main`.

The final release PR is an integration PR from `lab4-staging` to `main`, not a seventh feature Issue.

## Current setup status

- Local `lab4-staging` and `feature/lab4-47-planning` are based on the latest stable `main` branch.
- GitHub Issue creation, remote branch push, and PR creation are pending valid GitHub credentials and network access. Do not report the proposed issues as already created remotely.
