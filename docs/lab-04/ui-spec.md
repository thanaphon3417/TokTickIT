# Lab 4 UI Specification

## Shared visual and interaction rules

Keep the existing Zen Green shell: green header and primary action, pale gray page, white cards, clear role/status badges, and visible 2px focus outline. Preserve the established TokTickIT typography, spacing, labels, button, table, tabs, and error styles. Status is always expressed in text as well as color. Interactive controls have accessible names, associated labels/errors, keyboard operation, and a visible focus state. Async results announce loading/success/failure. No page-level horizontal scrolling at 390px, 768px, or 1280px widths.

## Navigation and dashboard screens

Add a Dashboard destination for each role and indicate the active page. Requesters see only their own summary; IT Staff and Administrators see the operational dashboard. Unauthorized dashboard routes show the standard forbidden state.

Requester dashboard: four compact cards for open, waiting-for-requester, recently updated, and recently resolved counts; below them, attention-required, recent, and recently resolved ticket rows. Each count opens My Tickets with a corresponding filter; each row opens ticket detail. Empty lists show concise guidance and a link to My Tickets. Cards stack two columns on tablet and one on narrow mobile.

Staff/Admin dashboard: cards for unassigned, owned by me, open tickets by status/priority, and my open assigned actions; below, recent tickets, high-priority urgent tickets, and my actions. Card clicks open the staff queue with the corresponding query filter. Ticket/action rows open staff ticket detail and select the action when appropriate. Counts and rows use stable, concise labels. Lists show an explicit empty state rather than blank space.

Both dashboards use skeleton/loading feedback, safe retry on API failure, and clear forbidden feedback. No dashboard renders an unbounded ticket collection.

## Ticket detail: Actions Taken

Add an Actions Taken section to staff ticket detail, with chronological list/table fields: action date/time, description, result, performed by, assignee, follow-up, attachment notes, and status. Requesters see a read-only list on owned tickets. Staff/Admin can create and edit; creator, ticket, and date/time are read-only after creation. The editor has labeled fields, inline validation, optional active staff assignee, follow-up note conditional requirement, save/cancel actions, and status transition controls. Disable duplicate submission while saving. Preserve form data after recoverable network/conflict failures and show the current server version for conflict resolution.

At desktop, actions use a readable table or aligned rows; under 768px switch to stacked cards with labels. Long notes wrap. Do not put the only control in a hover state.

## Ticket workflow

Display only legal next states from the contract. Explain why Resolve is unavailable until a completed action with a result exists. Requester resolution feedback remains informational and never shows formal status success. Reopen/cancel reason is requested inline. After successful mutation, refresh ticket status/version and dashboard data; conflict feedback asks the user to reload/review current status without silently resubmitting.

## Feedback, responsive behavior, and accessibility checklist

- Every API-backed screen supports loading, no results, forbidden, validation, not found, conflict, and safe failure states.
- Errors appear beside related fields and in an announced summary when needed; entered values remain after recoverable failure.
- Keyboard order follows visual order; dialogs (if used) trap/restore focus and close accessibly. Prefer inline editor to avoid unnecessary modal barriers.
- At 992px reduce dashboard columns; at 768px stack form fields and replace wide lists with cards; at 390px all controls fit the viewport and touch targets are at least 44px.
- Check contrast, visible focus, accessible names, semantic headings/table labels, text alternatives to color, zoom/reflow, no overlap/clipped text, and no horizontal page overflow.
- Capture desktop/tablet/mobile screenshots under `artifacts/lab-04/screenshots/{staff-dashboard,requester-dashboard,actions-taken}/` after final review.
