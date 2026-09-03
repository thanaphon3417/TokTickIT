# Lab 2 Test Plan and Results

All listed tests below have been run locally on `feature/lab2-7-tests-e2e`. Every acceptance criterion has at least one automated test before the release PR.

## 1. Test Strategy

Use Vitest for unit and API tests, Supertest for HTTP behavior, Testing Library for UI behavior and style assertions, and Playwright for responsive screenshots and the complete requester flow. Use a seeded test database and mock storage failures where needed. Tests must cover happy paths, invalid input, boundaries, ownership, loading, empty, no-results, failure, accessibility, and requester switching.

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What it tests | Expected result | Automated test file | Result |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-01, AC-01 | Ticket number format | `TKT-YYYY-NNNNNN` | `server/tests/lab-02/ticket-number.test.ts` | Passed |
| API-01 | API | AC-01 | Create valid ticket | 201; one saved ticket; number and NEW returned | `server/tests/lab-02/create-ticket.api.test.ts` | Passed |
| API-02 | API | AC-02, BR-06 | Required, trimmed, and boundary validation | 400 field errors; no save | `server/tests/lab-02/create-ticket.api.test.ts` | Passed |
| API-03 | API | BR-07 | Invalid or inactive references | 400 safe error | `server/tests/lab-02/create-ticket.api.test.ts` | Passed |
| API-04 | API | AC-03, AC-04 | Owned list search/filter/sort/page | Correct items and pagination metadata | `server/tests/lab-02/my-tickets.api.test.ts` | Passed |
| API-05 | API | AC-06, BR-10 | Cross-requester list/detail access | Other requester's data returns 404/empty | `server/tests/lab-02/my-tickets.api.test.ts` and `server/tests/lab-02/ticket-detail.api.test.ts` | Passed |
| API-06 | API | BR-13 | Invalid page, page size, sort, and filter values | 400; no unsafe query | `server/tests/lab-02/my-tickets.api.test.ts` | Passed |
| API-07 | API | AC-07, AC-08 | Valid, invalid, oversized, and sixth attachment | 201 valid; 400/413/409 invalid cases | `server/tests/lab-02/attachments.api.test.ts` | Passed |
| API-08 | API | AC-09, BR-19 | Soft removal with valid/invalid reason | Metadata retained; removed download returns 404 | `server/tests/lab-02/attachments.api.test.ts` | Passed |
| API-09 | API | BR-18 | Cross-requester attachment operations | Upload/list/download/remove return 404 | `server/tests/lab-02/attachments.api.test.ts` | Passed |
| API-10 | API | BR-17 | Upload failure | Safe error; ticket workflow remains recoverable | `client/tests/lab-02/AttachmentSection.test.tsx` | Passed |
| UI-01 | UI | FR-01, AC-11 | Requester selector loading, empty, failure, switch | Active users only; correct states; reload on switch | `client/tests/lab-01/App.test.tsx` and `e2e/lab-02/requester-ticket-flow.spec.ts` | Passed |
| UI-02 | UI | AC-02 | Create form field validation | Messages beside fields; API not called | `client/tests/lab-02/CreateTicket.test.tsx` | Passed |
| UI-03 | UI | AC-01, BR-09 | Create success and duplicate prevention | Busy button; one call; backend ticket number shown | `client/tests/lab-01/App.test.tsx` | Passed |
| UI-04 | UI | AC-10 | Create API failure | Safe error; all values preserved; retry available | `client/tests/lab-02/CreateTicket.test.tsx` | Passed |
| UI-05 | UI | AC-08 | Attachment failure message | A safe, specific upload error is displayed | `client/tests/lab-02/AttachmentSection.test.tsx` | Passed |
| UI-06 | UI | AC-03, AC-04, AC-05 | My Tickets controls and states | Requester-owned list and controls render | `client/tests/lab-02/MyTickets.test.tsx` | Passed |
| UI-07 | UI | AC-06 | Detail read-only and attachment states | Removed file has no download | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Passed |
| STYLE-01 | UI style | AC-12 | Required classes, labels, focus, badges, errors | Zen Green and accessible states are present | `client/tests/lab-02/ui-style.test.tsx` | Passed |
| RESP-01 | Responsive | AC-12 | Desktop, tablet, mobile layouts | No clipping, overlap, or horizontal page overflow | `e2e/lab-02/requester-ticket-flow.spec.ts` | Passed |
| E2E-01 | E2E | AC-01, AC-03 | Select requester, create, find ticket | Official number appears and ticket is listed | `e2e/lab-02/requester-ticket-flow.spec.ts` | Passed |
| E2E-02 | E2E | AC-06, AC-11 | Switch requester and attempt cross-access | A tickets disappear for B | `e2e/lab-02/requester-ticket-flow.spec.ts` | Passed |
| E2E-03 | E2E | AC-07, AC-09 | Add, download, remove attachment | Active download works; removed download is absent | `e2e/lab-02/requester-ticket-flow.spec.ts` | Passed |

## 3. Acceptance-Criterion Traceability

| AC | Planned tests |
|---|---|
| AC-01 | UNIT-01, API-01, UI-03, E2E-01 |
| AC-02 | API-02, UI-02 |
| AC-03 | API-04, UI-06, E2E-01, E2E-02 |
| AC-04 | API-04, API-06, UI-06 |
| AC-05 | UI-06 |
| AC-06 | API-05, API-09, UI-07, E2E-02 |
| AC-07 | API-07, UI-07, E2E-03 |
| AC-08 | API-07, UI-05 |
| AC-09 | API-08, API-09, UI-07, E2E-03 |
| AC-10 | API-10, UI-04 |
| AC-11 | UI-01, E2E-02 |
| AC-12 | STYLE-01, RESP-01 |

## 4. Responsive and Visual Checklist

- [x] Desktop, tablet, and mobile screenshots captured for Create Ticket, My Tickets, and Ticket Detail under `artifacts/lab-02/screenshots/`.
- [x] Automated viewport checks confirm no horizontal page overflow at 1280px, 900px, and 390px.
- [x] Editable and read-only ticket-detail fields are visually distinct.
- [x] Required markers, field errors, busy state, and disabled state are covered by UI tests.
- [x] Attachment actions and removed state are covered by API, UI, and E2E tests.

## 5. Test Commands

```powershell
cd server
npm.cmd test
cd ..\client
npm.cmd test
# Run E2E after the documented frontend and backend servers are running:
npx playwright test e2e/lab-02
```

## 6. Final Results

Local executable results on `feature/lab2-7-tests-e2e`:

- Server: 8 test files, 15 tests passed.
- Client: 6 test files, 10 tests passed.
- Server and client TypeScript checks passed.
- Server and client production builds passed.
- Playwright E2E: 3 tests passed locally with `npx.cmd playwright test e2e/lab-02 --reporter=line`.

## 7. Known Limitations or Deferred Tests

Real authentication and production object storage are deferred to Lab 3, as defined by the Lab 2 scope.
