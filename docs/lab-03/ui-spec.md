# Lab 3 UI Specification

## Visual system

Use `#006B3C` for the header and primary buttons, `#0B7A46` for active/focus states, `#EAF6EF` for selected surfaces, `#F5F7F6` for the page, white cards, dark green-charcoal text, 10px radii, and a visible 2px focus ring. Controls are at least 44px tall and fields use clear labels and inline errors.

## Screens

- **Login / password change:** centred narrow card; readable busy, invalid, inactive, and safe failure feedback.
- **Staff queue:** green application bar; search/filter row, result table on desktop and cards on mobile; status, priority, and assignment badges; clear empty/no-results/failure states.
- **Staff ticket detail:** breadcrumb/back action; three-column read-only detail grid; editable staff controls; tabs for public comments, internal notes, and attachments. UI-2 is the layout reference.
- **Administrator users:** list, search, role filter, create action, and create/edit panel. UI-1 is the layout reference. The panel shows account details, one role, active switch, initial-password/reset action, safe validation, and cancel/save actions.

## Responsive and accessibility rules

At 992px use centered multi-column layouts. At 768-991px reduce columns. Below 768px stack fields and actions, replace wide tables with cards, and prevent horizontal page overflow. All icon-only controls have accessible names; async actions announce state; errors are associated with their fields and do not depend on color alone.
