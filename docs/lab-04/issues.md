# Lab 4 Issue and Branch Plan

Create these six GitHub Issues before implementation and link each feature branch/PR to its issue. All feature PRs target `lab4-staging`; the final release PR targets `main` after staged verification.

| Issue | Issue title | Scope / completion evidence | Feature branch |
| --- | --- | --- | --- |
| [#47](https://github.com/thanaphon3417/TokTickIT/issues/47) | `feature/lab4-1-planning` | Review `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md`; resolve open contract decisions and map every AC to tests before feature implementation. | `feature/lab4-1-planning` |
| [#48](https://github.com/thanaphon3417/TokTickIT/issues/48) | `feature/lab4-2-actions-api` | Additive Prisma migration/model, versioning and idempotent Action Taken writes, representative seed, role/ownership-safe APIs, validation and API/migration/recovery tests. | `feature/lab4-2-actions-api` |
| [#49](https://github.com/thanaphon3417/TokTickIT/issues/49) | `feature/lab4-3-actions-ui` | Requester read-only actions and staff/admin list/create/assign/edit/status UI, responsive validation/feedback, component and E2E coverage. | `feature/lab4-3-actions-ui` |
| [#50](https://github.com/thanaphon3417/TokTickIT/issues/50) | `feature/lab4-4-ticket-workflow` | Enforce transition matrix and version conflicts server-side; require completed action/result for resolution; advisory requester signal; workflow UI/tests. | `feature/lab4-4-ticket-workflow` |
| [#51](https://github.com/thanaphon3417/TokTickIT/issues/51) | `feature/lab4-5-dashboards` | Authorized compact dashboard APIs, exact calculations, zero states, drill-down filters, role-appropriate UI, query/API/component/E2E coverage. | `feature/lab4-5-dashboards` |
| [#52](https://github.com/thanaphon3417/TokTickIT/issues/52) | `feature/lab4-6-final-release` | Full Lab 1–4 regression; responsive/accessibility/visual inspection; screenshots, README, reviewer and AI-use records; one submission PDF with the required parts; release checklist and staged verification. | `feature/lab4-6-final-release` |

## GitHub Issue descriptions and acceptance criteria

### Issue 1: `feature/lab4-1-planning`

**Goal:** Convert the Lab 4 handout into a reviewed, testable engineering contract before implementation.

**Deliverables:** `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, six-issue plan, and explicit definition of done.

**Acceptance criteria:**

- Every included requirement has a stable FR/BR/AC identifier and excluded scope is explicit.
- Action data/assignment/authorship, ticket transitions and resolution gate, dashboard math/drill-down, migration/recovery, concurrency, and failure behavior are decided.
- Every acceptance criterion maps to planned tests; regression, responsive, accessibility, E2E and final evidence checks are included.
- Team review closes ambiguities before Issue 2 begins.

### Issue 2: `feature/lab4-2-actions-api`

**Goal:** Persist and securely expose Actions Taken while retaining Lab 1–3 records.

**Acceptance criteria:** additive migration preserves old data; actor comes from session; requesters read only owned-ticket actions; staff/admin create and update; validation and active assignee rules are enforced; versions prevent stale overwrite; retried action creation is idempotent; seed reruns safely and covers zero/one/multiple actions; migration, recovery, and API tests pass.

### Issue 3: `feature/lab4-3-actions-ui`

**Goal:** Let requesters inspect actions and let staff/admin record, assign, edit, and transition actions from ticket detail.

**Acceptance criteria:** fields and role permissions match contract; creator/ticket/date are immutable after creation; follow-up validation and active assignee feedback are clear; repeated submission is prevented; recoverable errors preserve entered data; responsive/accessibility and E2E coverage pass.

### Issue 4: `feature/lab4-4-ticket-workflow`

**Goal:** Complete ticket lifecycle with authoritative server-side transition and resolution rules.

**Acceptance criteria:** every matrix edge and forbidden edge is covered; resolve requires completed action with result; close requires resolved; reopen/cancel require reason; requester resolution feedback remains advisory; expected-version mismatch safely returns conflict; UI refreshes status after success.

### Issue 5: `feature/lab4-5-dashboards`

**Goal:** Provide concise, backend-calculated dashboards for requesters and staff/admins.

**Acceptance criteria:** requester data is ownership-scoped; staff/admin metrics follow BR-09; stable recent/urgent/action lists are capped; empty metrics/lists render useful states; cards/rows link to detailed filtered views; API, component and E2E results match authoritative database queries.

### Issue 6: `feature/lab4-6-final-release`

**Goal:** Verify the complete application and prepare reviewable Lab 4 release evidence.

**Acceptance criteria:** all Lab 1–4 automated suites pass; manual desktop/tablet/mobile and keyboard/accessibility review is recorded; screenshots, README, reviewer and AI-use records are accurate; the single submission PDF has exactly the nine required Answer Part headings and working links; no unresolved review comments; `lab4-staging` is ready for a separately reviewed release PR to `main`.

The final release PR is an integration PR from `lab4-staging` to `main`, not a seventh feature Issue.

## Current setup status

- GitHub Issues #47–#52 are created with run-number titles; `lab4-staging` is based on the latest stable `main` branch.
- Issue #47 uses the run-number branch `feature/lab4-1-planning`. Issues #48–#52 use corresponding run-number branch names in the table above.
- On the Toktickit GitHub Project Kanban, Issue #47 is `PR Review`; Issues #48–#52 remain `Backlog`.
- The planning PR targets `lab4-staging`; reviewer and merge details are recorded only after they actually occur.
