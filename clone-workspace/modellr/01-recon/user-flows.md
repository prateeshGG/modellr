# Stage 2 — Core user flows (entry → steps → states → exit)

Each flow lists: entry · sequence · validation · loading · errors · success · recovery · exit. These are the flows validated end to end in Stage 10.

## F1. Discover → try → start (the conversion flow)
Entry: `/` from search/GitHub. Sequence: read hero → interact with live sandbox (drag a table) → click **Open the editor** → `/app` → **New schema** → `/app/:id`.
States: sandbox loading skeleton; reduced-motion = no reveal animation; mobile = sandbox replaced by video/poster + CTA. Errors: storage blocked → warning banner. Success: editor open on a new project. Exit: browser back returns to `/`.

## F2. Import an existing schema
Entry: Editor → Import. Paste/upload SQL or Prisma → **Import schema**. Validation: empty text disables button; unparseable → inline error list. Loading: parse is synchronous (<100 ms for 500 tables). Success: tables appear, auto-layout, previous schema saved as snapshot, warnings listed in the dialog. Recovery: Ctrl+Z, restore snapshot. Exit: dialog closes (or "Done" if warnings).

## F3. Export / share
Entry: Export menu → format → copied toast. Share → link (read-only snapshot) / embed tab; long-link warning. Recipient: `/app/shared#…` → read-only banner → **Save a copy** → new project. Errors: damaged link → friendly message, no crash.

## F4. Snapshot → change → diff → migration
Sidebar History → Save snapshot → edit → Diff → pick snapshot → **Generate SQL migration** → copy. Success: SQL with destructive warnings. Recovery: restore snapshot (confirm).

## F5. Templates
`/templates` → filter category → card → preview modal → **Use template** → project created → editor. Empty filter state offers "Show all".

## F6. Docs reading
`/docs` → sidebar → article (deep link `?a=`) → "Open the editor". Mobile: sidebar becomes a drawer; Escape closes; focus returns to trigger.

## F7. Backup / restore / delete (trust flow)
`/app` or Settings → Download backup → Restore from file (validation: invalid JSON error) → Delete all (destructive confirm, focus on Cancel).

## F8. Optional AI (bring your own key)
Editor → AI → "Set up AI" → dialog (provider preset, key, model, Test connection) → Save → ask → proposal card → Accept/Reject. Errors: 401/429/CORS messages. Privacy: key stays in the browser.

## F9. Recovery
Unknown URL → 404 screen → Home / Open editor. Missing project id → toast + redirect to `/app`. Page refresh in editor → project restored from IndexedDB.

## Cross-cutting
Keyboard: logical tab order, visible focus ring (3px blue), Escape closes dialogs/drawers/menus, skip-to-content link. Back/forward works for all routes. Deep links: every public route and doc article.
