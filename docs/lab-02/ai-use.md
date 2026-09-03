# Lab 2 AI Use and Reflection

**LLM/agent used:** GitHub Copilot and OpenAI Codex.

## Selected key prompts

| # | Prompt | Use and review |
|---|---|---|
| 1 | “Plan this carefully as this can only do once no rollback.” | Used to establish the branch and PR workflow. I checked each branch state before Git operations. |
| 2 | “Create those file for me.” | Drafted the Lab 2 specification, test plan, UI specification, and API contract. I reviewed the decisions against the handout. |
| 3 | “Let's continue next step.” | Implemented requester context, ticket creation, My Tickets, Ticket Detail, and attachments in separate feature branches. |
| 4 | “Check everything again, I want to make sure every system works and no error.” | Ran Prisma validation, migrations, builds, TypeScript checks, server/client tests, and E2E checks. |
| 5 | “According to the lab file, do I have to update ai-use.md, reviewer.md, and tests.md?” | Identified the required final evidence updates and kept test status traceable. |
| 6 | “Make PR description for me.” | Drafted PR descriptions from actual commits and test output; I reviewed the final wording. |
| 7 | “Make checkpoint here.” | Recorded branch, PR, commit, and next-step state before later work. |
| 8 | “I want to test by myself in localhost.” | Prepared Docker, backend, migration, seed, frontend, and manual workflow commands. |
| 9 | “Resolve everything for me.” | Audited PR7 against the Lab 02 handout, added missing client/E2E coverage, corrected documentation, and ran the final local checks. |

## My Reflection

I used AI agents to turn the lab handout into small, reviewable increments and to draft code and tests. I remained responsible for verifying generated changes, preserving uncommitted work, checking database and ownership behavior, and deciding which evidence is truthful. The most useful prompts included the active branch, the exact requirement, and a request for test evidence. AI-generated output still required review, especially for API contracts, migration consistency, accessibility, and untested failure states.

## Evidence note

Reviewer identity, PR comments, approvals, merge dates, screenshots, and final test output must come from the actual GitHub and local evidence. They are not invented by an AI agent.
