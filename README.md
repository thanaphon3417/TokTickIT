# TokTickIT

Lab 2 delivers the requester-facing ticket MVP: development requester selection, ticket creation, requester-owned ticket lists and detail, and permitted attachment upload, download, and soft removal. The selector is a testing mechanism, not authentication.

TokTickIT is an IT service desk application. Lab 1 delivers a small full-stack vertical slice that proves the frontend, REST API, Prisma ORM, and PostgreSQL database work together.

Clicking **Check System** in the browser calls the backend health endpoint and retrieves the supported request categories from PostgreSQL.

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

The seed is safe to run multiple times. It creates these categories without duplicates:

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

Open `http://localhost:5173`, select an active Development Requester, and continue to Create Ticket. Use **My Tickets** to search, filter, sort, page through, and open only that requester's tickets. Use **Change Requester** to test requester ownership. If the API or database is unavailable, the page shows a safe error and preserves entered ticket form values.

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

The committed visual evidence for the Lab 2 submission belongs under `artifacts/lab-02/screenshots/`; temporary Playwright output is ignored.

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

## Git workflow

Lab 1 work uses `main` as the stable branch and `lab1-staging` as the integration branch. Each Issue is implemented in its required feature branch, reviewed through a Pull Request to `lab1-staging`, and merged to `main` only after all Lab 1 work is complete.
