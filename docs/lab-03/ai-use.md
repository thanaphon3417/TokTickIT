# Lab 3 AI Use

# Lab 3 AI Use Record

Selected prompts and decisions:

1. Start Lab 3 and distinguish the handout instructions from the requested implementation.
2. Create `lab3-staging` and the Issue 1–8 feature-branch workflow.
3. Plan Issue 5 as the staff queue and identify which UI work requires manual review.
4. Implement staff-only queue authorization, filtering, sorting, pagination, and safe owner data.
5. Fix the queue ticket-detail navigation and add responsive mobile cards.
6. Implement Issue 6 assignment, IT priority, status transitions, public comments, internal notes, and attachment metadata.
7. Implement Issue 7 administrator user management with duplicate-email and final-admin safety rules.
8. Check all tests before creating each PR and preserve unrelated Lab 2 screenshot artifacts.

Decisions made: keep requester ownership server-derived; keep staff workflow mutations server-validated; return owner and author identity through explicit safe selects; use append-only collaboration records; keep attachment upload requester-owned; and serialize database-mutating tests.

Verification performed: Prisma migrations were applied and checked, server/client production builds passed, API authorization and validation tests passed, Lab 2 regression tests passed, and the repository owner manually reviewed the UI before PRs #41, #42, and #43.

Reflection: AI accelerated scaffolding and test-case coverage, but the implementation was reviewed against the Lab 3 contract, checked for authorization leaks, and manually inspected at the UI checkpoints. Database test interference was found and resolved by serializing the shared-database Vitest pool.
