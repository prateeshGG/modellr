# `Sidebar.tsx` — Component Documentation

> **Location:** `src/components/sidebar/Sidebar.tsx`  
> **Type:** React Component — TypeScript/TSX  
> **Purpose:** The left-hand editor sidebar — a collapsible panel containing the table list with filter input, a history (snapshots) section (host-only), a templates section, and a footer "New table" button. Switches to a narrow icon rail when collapsed. All interactions write directly to Zustand stores.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Props](#3-props)
4. [State](#4-state)
5. [Collapsed vs Expanded Modes](#5-collapsed-vs-expanded-modes)
6. [Section: Tables List](#6-section-tables-list)
7. [Section: History (Snapshots)](#7-section-history-snapshots)
8. [Section: Templates](#8-section-templates)
9. [Section: Footer — New Table Button](#9-section-footer--new-table-button)
10. [Collapsed Icon Rail](#10-collapsed-icon-rail)
11. [Notable Patterns & Caveats](#11-notable-patterns--caveats)

---

## 1. File Overview

`Sidebar` is the **editor's left panel** — always rendered but conditionally styled via `sidebar--open` / `sidebar--collapsed` CSS classes based on `sidebarOpen` from `useUIStore`. When collapsed, it shows a minimal three-button icon rail.

It is the **only place in the editor** where snapshots are listed, created, and restored from the UI (the `DiffViewer` also shows snapshots but only for comparison, not restore).

---

## 2. Dependencies & Imports

```tsx
import { useSchemaStore }  from '../../store/schema';
import { useUIStore }      from '../../store/ui';
import { useHistoryStore } from '../../store/history';
import { ACCENT_HEX }      from '../../utils/constants';
import { TEMPLATES }       from '../../utils/templates';
```

| Import | Role |
|---|---|
| `useSchemaStore` | `tables`, `addTable`, `importTables` |
| `useUIStore` | `sidebarOpen`, `setSelection`, `readOnly` |
| `useHistoryStore` | `snapshots`, `createSnapshot`, `restoreSnapshot` |
| `ACCENT_HEX` | Table accent color dot in the list |
| `TEMPLATES` | Template registry for the templates section |

---

## 3. Props

```tsx
interface SidebarProps {
  isHost?: boolean;  // default: false
}
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `isHost` | `boolean` | `false` | Controls visibility of the History section — only the schema owner sees snapshots |

The `isHost` prop is set by the parent (`Editor.tsx`) based on the authenticated user's ownership of the current schema — same logic as `ShareModal`'s `isHost` determination.

---

## 4. State

| State | Type | Initial | Description |
|---|---|---|---|
| `filter` | `string` | `''` | Current table name filter input value |
| `historyOpen` | `boolean` | `false` | Whether the History collapsible section is expanded |
| `templatesOpen` | `boolean` | `false` | Whether the Templates collapsible section is expanded |

Both collapsible sections start closed. State persists for the lifetime of the component but resets on unmount (not persisted to store or localStorage).

---

## 5. Collapsed vs Expanded Modes

```tsx
<aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--collapsed'}`}>
  {sidebarOpen ? (
    <> {/* Full sidebar content */} </>
  ) : (
    <div className="sidebar__icon-rail"> {/* 3 icon buttons */} </div>
  )}
</aside>
```

The `<aside>` always renders — CSS controls width/visibility via `sidebar--open` and `sidebar--collapsed` classes. The JSX branches conditionally:
- **Open** → full content (tables, filter, history, templates, footer)
- **Collapsed** → icon rail only (3 buttons)

`sidebarOpen` is managed by `useUIStore.toggleSidebar()` — triggered by `⌘B` shortcut or toolbar button.

---

## 6. Section: Tables List

### Header

```tsx
<div className="sidebar__section-header">
  <span className="sidebar__section-label">TABLES</span>
  {!readOnly && (
    <button
      onClick={() => addTable({ x: 100 + tables.length * 20, y: 100 + tables.length * 20 })}
      title="New table (T)"
      aria-label="Add table"
    >+</button>
  )}
</div>
```

"+" button hidden in `readOnly` mode. Spawns new tables in a diagonal cascade:
```ts
x: 100 + (tables.length * 20)
y: 100 + (tables.length * 20)
```
→ Each new table is offset 20px right and 20px down from the previous. After ~10 tables this starts to diverge meaningfully from the viewport center.

### Filter Input

```tsx
<input
  placeholder="Filter tables…"
  value={filter}
  onChange={(e) => setFilter(e.target.value)}
  className="sidebar__filter"
  aria-label="Filter tables"
/>
```

Controlled `<input>` — filters client-side as the user types. The `sf:focus-filter` custom event (fired by `useKeyboardShortcuts` on `Ctrl+F`) targets this element:

```ts
// In useKeyboardShortcuts.ts:
window.addEventListener('sf:focus-filter', () => {
  document.querySelector('.sidebar__filter')?.focus();
});
```

The filter uses `querySelector('.sidebar__filter')` — this works only when the sidebar is open and the input is in the DOM. If the sidebar is collapsed, the filter input is not rendered and the focus attempt silently no-ops.

### Table Rows

```tsx
<div className="sidebar__table-list">
  {filtered.map(table => (
    <button key={table.id} className="sidebar__table-item"
            onClick={() => setSelection({ type: 'table', tableId: table.id })}>
      <span className="sidebar__table-dot"
            style={{ background: ACCENT_HEX[table.accentColor] }} />
      <span className="sidebar__table-name">{table.name}</span>
      <span className="sidebar__table-count">{table.fields.length}</span>
    </button>
  ))}
  {filtered.length === 0 && tables.length > 0 && (
    <p className="sidebar__empty-filter">No tables match "{filter}"</p>
  )}
</div>
```

Each row shows:
- **Colored dot** — the table's `accentColor` rendered via `ACCENT_HEX`
- **Table name** — full text, no truncation in CSS (truncation may be handled by CSS)
- **Field count** — `table.fields.length` as a right-aligned badge

**Click action:** `setSelection({ type: 'table', tableId })` — opens `TableEditor` in `RightPanel`. Does NOT pan the canvas to the table (no `sf:focus-table` event fired). Contrast with `SearchOverlay` which fires both `setSelection` and `sf:focus-table`.

**Empty filter state:** Shown only when `filtered.length === 0 AND tables.length > 0` — hides when the canvas is empty (no confusing "no tables match" when there are no tables at all).

### Filter Logic

```ts
const filtered = tables.filter(t =>
  t.name.toLowerCase().includes(filter.toLowerCase())
);
```

Case-insensitive substring match on table name only. Computed on every render — no `useMemo`. Fast enough for typical schema sizes (< 100 tables).

---

## 7. Section: History (Snapshots)

```tsx
{isHost && (
  <div className="sidebar__collapsible">
    <button className="sidebar__collapsible-header"
            onClick={() => setHistoryOpen(o => !o)}
            aria-expanded={historyOpen}>
      <span>HISTORY</span>
      <span>{historyOpen ? '▾' : '▸'}</span>
    </button>

    {historyOpen && (
      <div className="sidebar__history">
        {!readOnly && (
          <button onClick={() => createSnapshot()}>+ Save snapshot</button>
        )}
        {snapshots.map(snap => (
          <button key={snap.id}
                  onClick={() => restoreSnapshot(snap.id)}
                  title={new Date(snap.timestamp).toLocaleString()}>
            <span className="snapshot-label">{snap.label}</span>
            <span className="snapshot-time">
              {new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </button>
        ))}
        {snapshots.length === 0 && <p>No snapshots yet</p>}
      </div>
    )}
  </div>
)}
```

**Host-only** — the entire History section is gated behind `{isHost && ...}`. Guests never see it.

### `createSnapshot()`

Calls `useHistoryStore.createSnapshot()` — captures current `tables` + `relationships` into a named snapshot entry. The label is auto-generated (e.g. `"Snapshot 1"`, `"Snapshot 2"`). See `history.ts` documentation.

### Snapshot Rows

Each snapshot button shows:
- **Label** — `snap.label` (auto-generated name)
- **Time** — locale time in `HH:MM` format (hours:minutes only, no seconds)
- **`title` attribute** — full `toLocaleString()` with date — shown on hover as a browser tooltip

**Click → `restoreSnapshot(snap.id)`** — replaces entire canvas state with the snapshot. **No confirmation dialog** — restore happens immediately. This loses all current unsaved changes.

> Cross-reference with `DiffViewer`: The diff viewer also calls `restoreSnapshot` but shows a diff first. The sidebar's snapshot items restore **without any comparison or confirmation**.

### `readOnly` Interaction

- `"+ Save snapshot"` button is hidden in `readOnly` mode
- Snapshot rows are still shown (and clickable) in `readOnly` mode — guests cannot create snapshots but they can call `restoreSnapshot`. Since `restoreSnapshot` writes to the schema store, this appears to be an oversight — guests with `readOnly` should not be able to restore snapshots.

> ⚠️ **Potential issue:** Snapshot restore buttons are visible and clickable in `readOnly` mode for guests. `restoreSnapshot` calls `importTables` internally which should be blocked by the Yjs zero-trust patch, but the local schema state would still be modified. The guest's local view could diverge from the Yjs-synced state.

---

## 8. Section: Templates

```tsx
<div className="sidebar__collapsible">
  <button className="sidebar__collapsible-header"
          onClick={() => setTemplatesOpen(o => !o)}
          aria-expanded={templatesOpen}>
    <span>TEMPLATES</span>
    <span>{templatesOpen ? '▾' : '▸'}</span>
  </button>

  {templatesOpen && (
    <div className="sidebar__templates">
      {!readOnly ? (
        (Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]).map(key => (
          <button key={key} className="sidebar__template-item"
                  onClick={() => { const t = TEMPLATES[key]; importTables(t.tables, t.relationships); }}>
            {TEMPLATES[key].label}
          </button>
        ))
      ) : (
        <p>Templates disabled in View-Only mode.</p>
      )}
    </div>
  )}
</div>
```

Templates section is available to **all users** (no `isHost` gate) but content is `readOnly`-aware:
- **Edit mode** — lists all templates as clickable buttons
- **Read-only mode** — shows "Templates disabled in View-Only mode." message

**Template click → `importTables(t.tables, t.relationships)`** — replaces the entire canvas with no confirmation. Same behavior as the `CommandPalette` template commands and `EmptyState` chips.

Unlike `CommandPalette` where template commands were invisible due to a categorization bug, templates here work correctly — they appear in the collapsible section and fire `importTables` directly.

---

## 9. Section: Footer — New Table Button

```tsx
{!readOnly && (
  <div className="sidebar__footer">
    <button className="sidebar__new-table"
            onClick={() => addTable({ x: 120, y: 120 })}>
      + New table
    </button>
  </div>
)}
```

A secondary "New table" button at the bottom. Spawns at a **fixed position** `{ x: 120, y: 120 }` — unlike the header "+" which uses the cascade offset, this always places the table at the same position regardless of how many tables already exist.

This means if the user creates a table via the footer button multiple times, each new table spawns at exactly `120, 120` — stacked on top of each other.

> ⚠️ **Minor issue:** Footer button always uses `{ x: 120, y: 120 }` — tables stack if created multiple times without moving. The header "+" uses the cascade offset formula. The two "New table" buttons are not consistent.

---

## 10. Collapsed Icon Rail

```tsx
<div className="sidebar__icon-rail">
  <button title="Tables"
          onClick={() => useUIStore.getState().toggleSidebar()}>
    ☰
  </button>
  <button title="History"
          onClick={() => { useUIStore.getState().toggleSidebar(); setHistoryOpen(true); }}>
    ⏱
  </button>
  <button title="Templates"
          onClick={() => { useUIStore.getState().toggleSidebar(); setTemplatesOpen(true); }}>
    ⊞
  </button>
</div>
```

Three icon buttons when collapsed:

| Icon | Label | Action |
|---|---|---|
| `☰` | Tables | `toggleSidebar()` — expands sidebar, no section preset |
| `⏱` | History | `toggleSidebar()` + `setHistoryOpen(true)` — expands sidebar with History open |
| `⊞` | Templates | `toggleSidebar()` + `setTemplatesOpen(true)` — expands sidebar with Templates open |

**`useUIStore.getState().toggleSidebar()`** — called via `getState()` rather than the hook's subscription. This is valid in an event handler (no stale closure issue) but bypasses React's subscription mechanism. Functionally correct.

**History icon always shown** — even when `isHost === false`. Clicking it would expand the sidebar but the History section wouldn't exist in the DOM (gated by `{isHost && ...}`). The icon rail doesn't respect the `isHost` guard.

> **UX issue:** The `⏱` History icon appears in the collapsed rail regardless of `isHost`. Guests see the icon, click it, the sidebar expands, and the History section is simply absent. No error, but a confusing experience.

---

## 11. Notable Patterns & Caveats

| | Detail |
|---|---|
| **Sidebar clicking a table doesn't pan canvas** | `setSelection` only — no `sf:focus-table` event. `SearchOverlay` does pan; sidebar does not |
| **Footer "New table" always at `{120, 120}`** | Stacks tables; header "+" uses cascade offset — inconsistent behavior |
| **Snapshot restore available in `readOnly`** | Snapshot buttons are not hidden for guests — calling `restoreSnapshot` in read-only mode modifies local schema state but won't broadcast via Yjs |
| **`⏱` History icon shown to all users** | Collapsed icon rail doesn't check `isHost` — guests see the icon but find no History section after expanding |
| **`sf:focus-filter` fails when sidebar is collapsed** | `querySelector('.sidebar__filter')` returns `null` when the sidebar is closed — the keyboard shortcut silently no-ops |
| **`filter` not memoized** | `tables.filter(...)` runs on every render — fine for typical schema sizes, could be `useMemo` for very large schemas |
| **Template import has no confirmation** | `importTables(t.tables, t.relationships)` replaces entire canvas immediately |
| **`createSnapshot` auto-labels** | Snapshot names are `"Snapshot N"` — users cannot rename a snapshot from the sidebar |
| **Collapsible state resets on unmount** | `historyOpen` / `templatesOpen` are component-local state — not persisted in the store — reset when the editor page unmounts |

---

## Sidebar Sections Summary

```
<aside class="sidebar sidebar--open">
  │
  ├── TABLES header                      [always shown]
  │     └── [+] add table (edit mode only)
  │
  ├── Filter input                       [always shown]
  │     └── .sidebar__filter (focus target of sf:focus-filter event)
  │
  ├── Table list                         [always shown]
  │     ├── {filtered.map → button}
  │     │     ├── ● accent dot
  │     │     ├── table name
  │     │     └── field count
  │     └── "No tables match" (if filter returns empty)
  │
  ├── HISTORY (collapsible)              [isHost only]
  │     ├── [+ Save snapshot] (edit mode only)
  │     └── {snapshots.map → button}
  │           ├── label
  │           └── HH:MM timestamp
  │
  ├── TEMPLATES (collapsible)            [all users]
  │     ├── Edit mode: {TEMPLATES.map → button}
  │     └── readOnly: "Templates disabled in View-Only mode."
  │
  └── Footer                             [edit mode only]
        └── [+ New table]

<aside class="sidebar sidebar--collapsed">
  └── Icon rail
        ├── ☰ Tables  → toggleSidebar()
        ├── ⏱ History → toggleSidebar() + setHistoryOpen(true)
        └── ⊞ Templates → toggleSidebar() + setTemplatesOpen(true)
```

---

*Generated documentation for SchemaForge — `src/components/sidebar/Sidebar.tsx`*
