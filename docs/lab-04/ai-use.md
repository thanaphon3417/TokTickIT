# Lab 4 AI Use Record

## Tools used

- Codex (GPT-6), 2026-10-12: handout analysis, issue planning, and review preparation.
- Codex (GPT-6), 2026-10-12: Issue #49 Actions Taken UI implementation, Administrator access-path review, API wiring, and component/browser test verification. The existing Zen Green theme was retained.
- Codex (GPT-6), 2026-10-13: Issue #52 final handout review, regression/build execution, screenshot capture at desktop/tablet/mobile widths, and visual review. The visual pass found missing mobile staff-queue rows and overlapping mobile work controls; both were corrected while retaining the Zen Green styles.
- No separate specification-agent service is recorded in this work session; the planning artifacts and decisions are in the linked Lab 4 specification files and review history.

## Selected prompts used during planning

These are excerpts from the actual user prompts in this planning conversation. Add implementation prompts as the work proceeds.

1. “Let's start Lab4. Please make sure you check everything correct before execute PR.”
2. “There should be 6 issues include planning.”
3. “There should be lab4-staging branch.”
4. “Re-name all the issues to this format `feature/lab4-x-name`; x is run number.”
5. “Make sure everything until now is correct according to lab4 instruction file.”
6. “Fix everything that needed to be fixed.”
7. “PR approved!” and “a reminder to prevent any errors, UIs are remain the same theme as they are parts of requirement in instruction”.
8. “let's continue”.
9. “PR approved! a reminder to prevent any errors, UIs are remain the same theme as they are parts of requirement in instruction”.
10. “everything good so far? yes or no only”.

## My Reflection

AI helped convert the Lab 4 requirements into a specification, implementation plan, test traceability, and review checklist. I checked the generated suggestions against the project’s existing architecture, API contracts, and automated test results before using them. During testing and visual review, I found mobile layout problems in the staff queue and ticket work controls. Those issues were corrected and the screenshots and browser tests were rerun. AI output still required review because it could not replace my own judgment, manual accessibility checks, GitHub review evidence, or verification of final release results.
