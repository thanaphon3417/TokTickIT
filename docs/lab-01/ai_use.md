# Lab 1 — AI Use and Reflection

**LLM/agent used:** OpenAI Codex (GPT-5)

## Selected key prompts

| # | Prompt name | Actual prompt text | What I did with the result |
|---|-------------|--------------------|----------------------------|
| 1 | Plan Lab 1 | "Read this PDF file and plan this out for me step by step with manual if I have to do it myself." | Used the plan to create the GitHub Issues, branches, implementation order, tests, and evidence checklist. |
| 2 | Health check | "Now I am currently at Issue 2." | Implemented and manually verified `GET /api/health` with the exact required JSON response. |
| 3 | Database setup | "I use Docker instead of PostgreSQL." | Used Docker to run a local PostgreSQL database with the required user, password, database name, and port mapping. |
| 4 | Category schema and seed | "Let's continue Issue 3." | Added the Prisma `Category` model, ran the migration, and seeded the four categories using idempotent `upsert` operations. |
| 5 | Categories endpoint | "Let's continue Issue 4." | Added `GET /api/categories` using Prisma, selected only `id` and `name`, ordered by ID, and handled database failures safely. |
| 6 | API test | "Update the file for me and do not remove any comment." | Added the Supertest category-list test while preserving the starter comments, then checked that the server tests passed. |
| 7 | Check System UI | "Do the edit file work for me and do not remove any comments." | Implemented loading, success, and error UI states. The category list is rendered from the API response rather than hard-coded. |
| 8 | Debug client loading | "It stuck at Loading..." | Diagnosed stale generated JavaScript files overriding the TypeScript source, then used `noEmit` and removed the stale files. |
| 9 | UI tests | "Update UI tests." | Added mocked Vitest tests for successful and failed API calls; all client tests passed. |

## Reflection

I used Codex to break the lab into small tasks, explain commands, generate small code changes, and diagnose errors. My prompts became more useful when I included the current Issue number, file name, required behavior, and constraints such as preserving starter comments. I reviewed each generated change, ran migrations and tests myself, and corrected the client loading problem only after checking which source files Vite was actually loading.
