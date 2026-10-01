# TokTickIT

Lab 3 replaces the temporary requester selector with secure session-based authentication and role-based authorization. It adds mandatory first-login password change, Requester ownership protection, the IT Staff queue and ticket workflow, Public Comments/Internal Notes, and Administrator user management. Lab 2 ticket and attachment data remains available after migration.

TokTickIT is an IT service desk application developed incrementally through Labs 1–3. The application uses a React/Vite client, an Express REST API, Prisma ORM, and PostgreSQL.

Authenticated users see role-specific navigation:

- Requester: create and manage owned tickets, attachments, and public comments.
- IT Staff: search the shared queue, open ticket detail, assign ownership, set IT priority, update status, and post comments or internal notes.
- Administrator: list, search, create, edit, activate/deactivate, and reset initial passwords for users.

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
npm.cmd exec prisma migrate status
npm.cmd run prisma:seed
```

The seed is safe to run repeatedly. It creates demo users for all three roles, migrated requester profiles, realistic tickets, comments/notes, categories, and related systems. Seed credentials are for local development only; do not commit real secrets.

The reference categories are:

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

Open `http://localhost:5173` and sign in with a seeded local account. Users with an initial password must complete the Change Password screen before continuing. The application then routes each role to its permitted workspace. If the API or database is unavailable, the page shows safe failure feedback.

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

### Lab 3 API areas

The authenticated API supports login/logout/current-user, mandatory password change, requester ticket and attachment ownership, IT Staff queue and ticket workflow operations, Public Comments, Internal Notes, and Administrator user management. Protected operations enforce authorization on the server; hiding a client control is not a security boundary.

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

The committed visual evidence for the Lab 3 submission belongs under `artifacts/lab-03/screenshots/`. Lab 3 documentation is under `docs/lab-03/`.

## Repository structure

```text
toktickit/
├── client/
│   ├── src/
│   └── tests/lab-01/
├── server/
│   ├── prisma/
│   ├── src/
│   └── tests/lab-01/
├── docs/lab-01/
│   ├── ai_use.md
│   ├── reviewer.md
│   └── tests.md
├── .gitignore
└── README.md
```

## Lab 3 documentation and evidence

The Lab 3 engineering contract, API/UI specifications, test traceability, AI-use record, reviewer evidence, release checklist, and final screenshots are stored here:

```text
docs/lab-03/
├── specification.md
├── api-spec.md
├── ui-spec.md
├── tests.md
├── reviewer.md
├── ai-use.md
└── release-checklist.md
```

## Git workflow

Lab 3 uses `lab3-staging` as the integration branch and `main` as the stable branch. Each Issue is implemented in a feature branch and reviewed through a Pull Request into `lab3-staging`. After staged integration and approval, `lab3-staging` is merged into `main` through the final release PR (#46).

```text
main
  └── lab3-staging
        ├── feature/lab3-1-specification
        ├── feature/lab3-2-authentication
        ├── feature/lab3-3-authorization-requester
        ├── feature/lab3-4-authentication-ui
        ├── feature/lab3-5-staff-ticket-queue
        ├── feature/lab3-6-ticket-workflow
        ├── feature/lab3-7-admin-users
        ├── feature/lab3-8-final-release
        └── feature/3-documentation
```
