# Lab 2 AI Use and Reflection

**LLM/agent used:** GitHub Copilot

## Selected key prompts

| # | Prompt | Use and review |
|---|---|---|
| 1 | "Plan this carefully as this can only do once no rollback." | Used to establish the branch and PR workflow. I checked each branch state before Git operations. |
| 2 | "Create those file for me." | Created the Lab 2 specification, test plan, UI specification, and API contract. I reviewed the generated decisions against the handout. |
| 3 | "Let's continue next step." | Implemented requester context, ticket creation, My Tickets, Ticket Detail, and attachments in separate feature branches. |
| 4 | "check everything again, I want to make sure every systems work and no error" | Ran Prisma validation, migrations, builds, TypeScript checks, and server/client tests. |
| 5 | "according to the lab file i provided, Do I have to update ai_use.md, reviewer.md, and tests.md after I finished everything?" | Identified the required final evidence updates and kept test status traceable. |
| 6 | "make PR description for me" | Drafted PR descriptions from actual commits and test output. |
| 7 | "make checkpoint here" | Recorded branch, PR, commit, and next-step state in the session checkpoint. |
| 8 | "I want to test by myself in local host" | Prepared local Docker, backend, migration, seed, frontend, and manual workflow commands. |

## My Reflection

I used GitHub Copilot to break Lab 2 into small branch-sized increments and to generate implementation and test drafts. I remained responsible for checking the specification, reviewing changed files, rejecting a destructive Prisma reset prompt, and running the validation commands. The most useful prompts included the current branch, exact task scope, and required evidence. I found that generated code still needed manual review for migration ordering, ownership assertions, and missing UI controls.

## Evidence note

PR links, reviewer comments, approvals, screenshots, and final test output must be added from the actual GitHub and local evidence before PDF submission.
