# Lab 3 AI Use Record

## AI tool used

OpenAI Codex was used as the specification, implementation, testing, documentation, and review assistant. The developer remained responsible for deciding scope, checking the repository, reviewing UI output, approving GitHub actions, and verifying the final evidence.

## Selected prompts and resulting decisions

1. **“Distinguish instructions in the attached Lab 3 documents from the implementation request.”**
   - Established the Lab 3 scope, required roles, deliverables, evidence, and final PDF format from the handout.

2. **“Create `lab3-staging` and use feature branches for eight Lab 3 issues.”**
   - Established the staged branch flow: feature branch → `lab3-staging` → `main`.

3. **“Make sure the authentication and requester ownership rules are enforced by the server.”**
   - Kept requester identity session-derived and treated hidden client controls as insufficient authorization.

4. **“Implement the IT Staff queue with search, filters, sorting, pagination, ownership, status, and priority.”**
   - Added the queue API/UI behavior and safe owner data for staff operations.

5. **“Fix ticket-detail navigation so a staff member can open a ticket from the queue.”**
   - Verified that ticket numbers open a separate Ticket Detail view rather than rendering detail at the bottom of the queue.

6. **“Implement ticket workflow operations, Public Comments, Internal Notes, and attachment continuity.”**
   - Kept workflow mutations server-validated and made collaboration records append-only with role-restricted visibility.

7. **“Implement Administrator user management with one-role accounts, duplicate-email validation, password reset, and final-admin safety.”**
   - Limited the administrator screen to the Lab 3 contract and used deactivation instead of deletion.

8. **“Check the Lab 3 reviewer evidence and prepare real screenshots before the final integration PR.”**
   - Verified GitHub review/merge records, captured real browser screenshots at desktop/tablet/mobile sizes, and stored them under `artifacts/lab-03/screenshots/`.

## Verification and human decisions

- The specification, API contract, UI specification, test plan, reviewer record, AI-use record, and release checklist were checked against the Lab 3 handout.
- Prisma migration status reported the database schema up to date when PostgreSQL was available.
- Server and client production builds passed.
- Client tests passed with 7 tests.
- Lab 3 server suites passed when seeded and run individually: authentication (4), authorization (3), staff queue (2), ticket detail/comments/notes (2), and administrator management (2).
- The complete parallel server suite was not claimed as fully passing because shared PostgreSQL test state can cause cross-file authentication failures.
- Real UI screenshots were manually inspected for login, queue, ticket detail, administrator users, and responsive layouts.
- GitHub PRs, approvals, merge targets, reviewer responses, and final integration history were checked before release.

## Reflection

AI reduced the time needed to structure the Lab 3 contract, trace requirements to tests, draft implementation changes, inspect Git history, and organize submission evidence. It was especially useful for finding missing documentation and for mapping each screenshot to a specific PDF answer part.

The AI output was not treated as proof by itself. Repository files, GitHub PR history, build output, test output, database status, and real browser screenshots were checked separately. When the requested test evidence did not exist—such as dedicated Lab 3 UI/E2E files—the gap was recorded instead of inventing passing results. Human review remained necessary for authorization decisions, UI acceptance, branch/PR actions, and the final submission claims.
