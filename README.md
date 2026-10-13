# TokTickIT

TokTickIT is a full-stack IT service desk application developed across Labs 1–4. It supports authenticated Requesters, IT Staff, and Administrators; ticket creation and lifecycle management; comments, internal notes, and attachments; Actions Taken; and role-appropriate dashboards. Lab 4 extends the established Zen Green interface while preserving earlier lab workflows.

## Technology

- Frontend: React, TypeScript, Vite, Bootstrap
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL, Prisma ORM
- Testing: Vitest, Supertest, Testing Library

## Prerequisites

- Node.js and npm
- Docker Desktop (used to run PostgreSQL locally)
- Git

## Initial setup

Install the server and client dependencies:

```powershell
cd server
npm.cmd install
cd ..\client
npm.cmd install
```

Create local environment files from the supplied examples:

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
```

Do not commit `.env` files. They contain local configuration and database credentials.

## Start PostgreSQL with Docker

Start Docker Desktop, then create the PostgreSQL container once:

```powershell
docker run --name tocktickit-postgres -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 127.0.0.1:5432:5432 -v tocktickit-postgres-data:/var/lib/postgresql/data -d postgres:17
```

For later sessions, start the existing container instead:

```powershell
docker start tocktickit-postgres
```

The default `server/.env` values are:

```env
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public"
PORT=3000
```

## Create and seed the database

From the `server` directory, create the database table and seed the categories:

```powershell
npx prisma migrate dev --name init
npm.cmd run prisma:seed
```

The seed is safe to run multiple times. It creates the reference data without duplicates. For an existing Lab 3 database, back it up first, then apply the additive Lab 4 migration and seed representative accounts, tickets, and actions:

```powershell
npx.cmd prisma migrate deploy
npm.cmd run prisma:seed
```

See [the migration and recovery procedure](docs/lab-04/migration-recovery.md) before migrating a persistent database. Existing records are preserved.

The initial category seed includes:

1. Account and Access
2. Hardware
3. Software
4. Network

## Run the application

Use two terminals.

Start the backend:

```powershell
cd server
npm.cmd run dev
```

Start the frontend:

```powershell
cd client
npm.cmd run dev
```

Open `http://localhost:5173` and sign in with an active seeded account. Requesters can create tickets, view their own ticket history, and mark a problem as apparently resolved. IT Staff and Administrators can use their dashboards and queues to manage tickets and Actions Taken. Role navigation and access are enforced by the backend. Local demonstration accounts are defined in `server/prisma/seed.ts`; never reuse their credentials in a shared environment.

## REST API

### Health check

```http
GET /api/health
```

Response:

```json
{ "status": "ok", "service": "TokTickIT API" }
```

### Category list

```http
GET /api/categories
```

Response:

```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" }
]
```

## Run automated tests

Run server API tests:

```powershell
cd server
npm.cmd test
```

Run client UI tests:

```powershell
cd client
npm.cmd test
```

Run the Lab 2 Playwright flow after both backend and frontend are running:

```powershell
cd ..
npm.cmd run test:e2e -- --reporter=line
```

Run Lab 4 browser flows with Playwright (which starts Vite automatically):

```powershell
npx.cmd playwright test e2e/lab-04 --workers=1 --reporter=list
```

Committed visual evidence belongs under `artifacts/lab-02/screenshots/` and `artifacts/lab-04/screenshots/`; temporary Playwright output is ignored.

## Lab 4 engineering and evidence

- [Sprint 4 specification](docs/lab-04/specification.md), [API contract](docs/lab-04/api-spec.md), and [UI specification](docs/lab-04/ui-spec.md)
- [Test plan and final verification record](docs/lab-04/tests.md)
- [Visual and accessibility review](docs/lab-04/visual-accessibility-checklist.md)
- [Submission PDF draft (replace with finalized evidence before submitting)](artifacts/lab-04/submission.pdf) · [editable HTML source](docs/lab-04/submission.html)
- [Reviewer evidence](docs/lab-04/reviewer.md) and [AI-use record](docs/lab-04/ai-use.md)
- [Migration and recovery procedure](docs/lab-04/migration-recovery.md)
- [Lab 4 screenshots](artifacts/lab-04/screenshots/)

Lab 4 feature PRs target `lab4-staging`; final integration to `main` is reviewed separately after staged verification.

## Repository structure

```text
toktickit/
├── artifacts/lab-02/ and artifacts/lab-04/screenshots/
├── client/src/ and client/tests/lab-*/
├── docs/lab-01/ through docs/lab-04/
├── e2e/lab-02/ and e2e/lab-04/
├── server/prisma/, server/src/, and server/tests/lab-*/
└── README.md
```

## Git workflow

Each lab uses its documented staging branch and issue-specific feature branches. For Lab 4, feature PRs target `lab4-staging`; after final regression and evidence review, a separately reviewed release PR integrates `lab4-staging` into `main`.
