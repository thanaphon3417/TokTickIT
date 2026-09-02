# Lab 2 Zen Green UI Specification

## 1. Design tokens

- Primary: `#006B3C` for header, primary actions, and strong emphasis.
- Secondary: `#0B7A46` for active navigation, links, focus, and hover.
- Pale green: `#EAF6EF` for selected and success surfaces.
- Page background: `#F5F7F6`.
- Surface: white with a subtle neutral border and restrained shadow.
- Text: dark charcoal-green, never pure black.
- Editable control: white background and neutral border.
- Read-only control: soft gray-green background and readable text.
- Error: dark red border/text with a message immediately below the field.
- Warning: amber only for warnings and attachment limits.

Use a readable sans-serif font, 8px spacing rhythm, 10-12px control radius, visible 2px keyboard focus ring, and minimum 44px touch targets. Required labels show a red `*` plus a text error when invalid.

## 2. Application shell

Header contains TokTickIT identity, My Tickets, Create Ticket, current Development Requester name, and Change Requester. The selected navigation item has a secondary-green indicator and accessible `aria-current="page"`. On mobile, navigation wraps or becomes a labelled menu without hiding the current requester or primary action.

## 3. Requester selection

Show title `Select Development Requester`, clear text that this is Lab 2 testing only and not authentication, an accessible required dropdown, Continue, loading, empty, and safe API-failure states. Only active requesters from PostgreSQL are options. Continue is disabled until a requester is selected. Store only the selected numeric ID in browser storage. Changing requester clears requester-specific cached data and reloads it.

## 4. Create Ticket

Group fields in this order:

1. Read-only requester context and generated fields when available.
2. Category, Related System, and Requested Priority.
3. Summary across the available width.
4. Description with a taller textarea.
5. Attachments with selected, uploading, valid, invalid, and limit messages.
6. Cancel and Submit Ticket actions.

Ticket number and ticket date are backend-generated and read-only after success; they are not editable inputs before creation. Submit is disabled while busy and visibly says `Submitting...`. On success, show a non-color-only confirmation containing the official ticket number and actions to view the ticket or create another. On API failure, retain every entered value and show a safe retry message. Do not show only a top-level error; field errors stay beside fields.

## 5. My Tickets

The desktop layout has a page heading, Create Ticket, Clear Filters, search, category, requested priority, status, sort controls, and a table. Table fields are Ticket Number, Created Date, Summary, Category, Requested Priority, Current Status, and Last Updated. Ticket number and summary open Ticket Detail. Use consistent text badges: priority badges include label and distinct shape/contrast; status badge includes its text.

Show loading skeleton/message, first-use empty state, no-results state with clear filters, API-failure state with retry, result count, and previous/next pagination. Reset page to 1 when search or filters change. On mobile, use stacked ticket cards containing the same identifying fields and actions; no horizontal page scrolling is allowed.

## 6. Ticket Detail

Show a breadcrumb/back action, read-only ticket fields, current status, and a separate Attachments section. Do not show comments, internal notes, Actions Taken, IT Priority controls, or status-change controls. Each active attachment shows filename, type, size, upload date, Download, and Remove. Removed attachments remain metadata-only with a visible `Removed` label, removal date/reason, and disabled download/preview. Removal opens a keyboard-accessible confirmation with a required reason.

## 7. States and accessibility

Every screen defines initial, loading, success, validation, empty, no-results, and failure states. Controls have labels, associated error text via `aria-describedby`, disabled styling, and visible focus. Async actions announce busy/success/failure text. Icon-only controls require an accessible name and tooltip; important actions also have visible text. Errors never rely on color alone.

## 8. Responsive rules

- Desktop, 992px and above: centered max-width content; multi-column form; table visible.
- Tablet, 768-991px: two-column form where practical; summary and description remain wide; table may reduce nonessential spacing.
- Mobile, below 768px: fields stack; cards replace table; buttons stack or stretch to touch-friendly width; long filenames wrap; no horizontal page overflow.

At all widths, labels, errors, buttons, attachment names, and pagination must not clip, overlap, or disappear.

## 9. Visual checks

For Create Ticket, My Tickets, and Ticket Detail capture desktop (1280px), tablet (900px), and mobile (390px) screenshots under `artifacts/lab-02/screenshots/`. Check: token colors, editable/read-only contrast, focus ring, required markers, field-error placement, button hierarchy, busy state, badge consistency, no clipping, no overlap, no unintended horizontal scroll, usable filters/pagination, readable attachment names, and visible empty/failure states.
