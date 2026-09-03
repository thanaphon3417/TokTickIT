# Lab 2 Test Plan and Results

Status is `Planned` until implementation is complete. Every acceptance criterion must have at least one passing test before the release PR.

## 1. Test Strategy

Use Vitest for unit and API tests, Supertest for HTTP behavior, Testing Library for UI behavior and style assertions, and Playwright for responsive screenshots and the complete requester flow. Use a seeded test database and mock storage failures where needed. Tests must cover happy paths, invalid input, boundaries, ownership, loading, empty, no-results, failure, accessibility, and requester switching.

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What it tests | Expected result | Automated test file | Result |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-01, AC-01 | Ticket number format and uniqueness | `TKT-YYYY-NNNNNN`; collision retries | `server/tests/lab-02/ticket-number.test.ts` | Planned |
| API-01 | API | AC-01 | Create valid ticket | 201; one saved ticket; number and NEW returned | `server/tests/lab-02/create-ticket.api.test.ts` | Passed |
| API-02 | API | AC-02, BR-06 | Required, trimmed, and boundary validation | 400 field errors; no save | `server/tests/lab-02/create-ticket.api.test.ts` | Passed |
| API-03 | API | BR-07 | Invalid or inactive references | 400 safe error | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-04 | API | AC-03, AC-04 | Owned list search/filter/sort/page | Correct items and pagination metadata | `server/tests/lab-02/my-tickets.api.test.ts` | Passed |
| API-05 | API | AC-06, BR-10 | Cross-requester list/detail access | Other requester's data returns 404/empty | `server/tests/lab-02/my-tickets.api.test.ts` and `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| API-06 | API | BR-13 | Invalid page, page size, sort, and filter values | 400; no unsafe query | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-07 | API | AC-07, AC-08 | Valid, invalid, oversized, and sixth attachment | 201 valid; 400/413/409 invalid cases | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-08 | API | AC-09, BR-19 | Soft removal with valid/invalid reason | Metadata retained; removed download returns 404 | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-09 | API | BR-18 | Cross-requester attachment operations | Upload/list/download/remove return 404 | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-10 | API | BR-17 | Storage/upload failure | Safe 500; ticket and form workflow remain recoverable | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| UI-01 | UI | FR-01, AC-11 | Requester selector loading, empty, failure, switch | Active users only; correct states; reload on switch | `client/tests/lab-01/App.test.tsx` | Planned |
| UI-02 | UI | AC-02 | Create form field validation | Messages beside fields; API not called | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-03 | UI | AC-01, BR-09 | Create success and duplicate prevention | Busy button; one call; backend ticket number shown | `client/tests/lab-01/App.test.tsx` | Passed |
| UI-04 | UI | AC-10 | Create API failure | Safe error; all values preserved; retry available | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-05 | UI | AC-08 | Attachment validation and limit message | Invalid files rejected with specific messages | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| UI-06 | UI | AC-03, AC-04, AC-05 | My Tickets controls and states | Search/filter/sort/page; loading/empty/no-results/error | `client/tests/lab-01/App.test.tsx` | Planned |
| UI-07 | UI | AC-06 | Detail read-only and attachment states | Fields not editable; removed file has no download | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Planned |
| STYLE-01 | UI style | AC-12 | Required classes, labels, focus, badges, errors | Zen Green and accessible states are present | `client/tests/lab-02/ui-style.test.tsx` | Planned |
| RESP-01 | Responsive | AC-12 | Desktop, tablet, mobile layouts | No clipping, overlap, or horizontal overflow | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-01 | E2E | AC-01, AC-03 | Select requester, create, find ticket | Official number appears and ticket is listed | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-06, AC-11 | Switch requester and attempt cross-access | A tickets disappear; B cannot open A ticket | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-03 | E2E | AC-07, AC-09 | Add, download, remove attachment | Active download works; removed download blocked | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

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

- [ ] Desktop, tablet, and mobile screenshots captured for all three screens.
- [ ] No horizontal page overflow, clipping, overlap, or hidden controls.
- [ ] Editable and read-only fields are visually distinct.
- [ ] Required markers, field errors, focus rings, busy state, and disabled state are visible.
- [ ] Priority/status badges include readable text and consistent styling.
- [ ] Filters, clear action, pagination, attachment actions, and empty states remain usable.
- [ ] Long summaries and filenames wrap safely.

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

Not run yet. Update this section with command output, pass counts, date, and branch after implementation and integration.

## 7. Known Limitations or Deferred Tests

Real authentication and production object storage are deferred to Lab 3. E2E tests require PostgreSQL, seeded data, both dev servers, and Playwright browser installation. No test may be marked passed until it is actually executed.
