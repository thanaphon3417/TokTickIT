# Lab 3 Release Checklist

## Scope and branch

- Release branch: `feature/lab3-8-final-release`
- Release base: `lab3-staging` after merged PRs #29, #38, #39, #40, #41, #42, and #43.
- No Lab 2 screenshot artifacts are included in the release commit.

## Verification gate

- [x] Prisma migration status reports the database is up to date.
- [x] Server TypeScript production build passes.
- [x] Client TypeScript/Vite production build passes.
- [x] Server API, authorization, workflow, administrator, and Lab 2 regression tests pass (22 tests).
- [x] Client regression/UI tests pass (7 tests).
- [x] Login/password-change flow manually reviewed.
- [x] Requester create-ticket, My Tickets, detail, and attachment flow manually reviewed.
- [x] IT Staff queue, detail, workflow controls, comments, notes, and attachment metadata manually reviewed.
- [x] Administrator Users list, filters, create/edit panel, reset-password, and responsive layout manually reviewed.
- [x] Existing untracked Lab 2 screenshot artifacts remain excluded.

## Release commands

```bash
cd server
npm run prisma:seed
npm exec prisma migrate status
npm run build
npm test

cd ../client
npm run build
npm test
```

The final release PR should link this checklist and `docs/lab-03/reviewer.md`.
