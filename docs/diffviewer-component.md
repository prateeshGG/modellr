# `DiffViewer.tsx` — Component Documentation

> **Location:** `src/components/diff/DiffViewer.tsx`  
> **Type:** React Component — TypeScript/TSX  
> **Purpose:** A full-screen modal dialog that allows users to visually compare the **current canvas schema** against any previously saved named snapshot. Displays structural differences at the table and field level, optionally generates a SQL migration script, and can restore the selected snapshot directly.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Type Definitions](#3-type-definitions)
4. [Internal Helpers](#4-internal-helpers)
5. [Exported Component — `DiffViewer`](#5-exported-component--diffviewer)
6. [State](#6-state)
7. [Diffing Logic — `diffSchemas()`](#7-diffing-logic--diffschemas)
8. [Diff Summary Counters](#8-diff-summary-counters)
9. [JSX Structure & Rendering](#9-jsx-structure--rendering)
10. [SQL Migration Panel](#10-sql-migration-panel)
11. [Footer Actions](#11-footer-actions)
12. [Notable Patterns & Caveats](#12-notable-patterns--caveats)

---

## 1. File Overview

`DiffViewer` is the schema comparison and migration tool. It bridges two systems:

- **`useHistoryStore`** — provides named snapshots (user-created point-in-time copies)
- **`useSchemaStore`** — provides the live current schema state

The component runs a structural diff between the two, renders a categorized diff view (added/removed/changed tables and fields), and optionally generates SQL `ALTER TABLE` / `CREATE TABLE` / `DROP TABLE` migration statements via `generateMigrationsSQL`.

**User workflow:**
1. Open DiffViewer from the sidebar History panel
2. Select a snapshot from the dropdown
3. View structural diff — tables and fields classified as added/removed/changed
4. Optionally generate and copy the SQL migration
5. Optionally restore the snapshot (replaces current canvas)

---

## 2. Dependencies & Imports

```tsx
import React, { useMemo, useState } from 'react';
import { useSchemaStore } from '../../store/schema';
import { useHistoryStore } from '../../store/history';
import type { Table, Field } from '../../types/schema';
import CodeMirror from '@uiw/react-codemirror';
import { sql as sqlLang } from '@codemirror/lang-sql';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { generateMigrationsSQL, type TableDiff, type FieldDiff } from '../../utils/exporters/migrations';
import './DiffViewer.css';
```

| Import | Role |
|---|---|
| `useSchemaStore` | Current live schema (tables + dialect) |
| `useHistoryStore` | Snapshot list + `restoreSnapshot` action |
| `Table`, `Field` | Type annotations for diff functions |
| `CodeMirror` | Syntax-highlighted SQL viewer for the migration panel |
| `sqlLang` | CodeMirror SQL language extension |
| `vscodeDark` | Dark theme for CodeMirror — hardcoded, does not follow app theme |
| `generateMigrationsSQL` | Converts `TableDiff[]` to SQL DDL string |
| `TableDiff`, `FieldDiff` | TypeScript types for diff results |

---

## 3. Type Definitions

### `DiffViewerProps`

```ts
interface DiffViewerProps {
  onClose: () => void;
}
```

Minimal API — a single close callback. All data is pulled directly from Zustand stores.

---

## 4. Internal Helpers

### `diffSchemas(before, after): TableDiff[]`

**Lines:** 15–64

The core diffing algorithm. Compares two schema snapshots **by table name** and returns a flat array of `TableDiff` objects.

**Algorithm:**

```
Phase 1 — Removed tables:
  for table in before:
    if table.name NOT in after → push { kind: 'removed', table }

Phase 2 — Added tables:
  for table in after:
    if table.name NOT in before → push { kind: 'added', table }

Phase 3 — Changed tables (exist in both, compare fields):
  for table in after ∩ before:
    fieldDiffs = []
    for field in before.fields:
      if field.name NOT in after.fields → push { kind: 'removed', field }
    for field in after.fields:
      if field.name NOT in before.fields → push { kind: 'added', field }
      else if type | nullable | unique | isPK changed → push { kind: 'changed', before, after }
    if fieldDiffs.length > 0 → push { kind: 'changed', tableName, fields: fieldDiffs }
```

**Identity keys:**
- Tables are matched by **`name`** (not `id`)
- Fields within a table are matched by **`name`** (not `id`)

This means renaming a table/field is represented as a **remove + add** pair, not as a `'changed'` entry.

**Field change detection — compared attributes:**

| Attribute | Detected? |
|---|---|
| `type` | ✅ |
| `nullable` | ✅ |
| `unique` | ✅ |
| `isPK` | ✅ |
| `isFK` | ❌ (not compared) |
| `default` | ❌ (not compared) |
| field `name` rename | ❌ (treated as remove + add) |

**Return type:** `TableDiff[]` (imported from `migrations.ts`).

---

### `fieldBadges(f: Field): string[]`

**Lines:** 66–73

```ts
function fieldBadges(f: Field): string[] {
  const badges: string[] = [];
  if (f.isPK) badges.push('PK');
  if (f.isFK) badges.push('FK');
  if (f.unique && !f.isPK) badges.push('UQ');  // UQ suppressed when PK
  if (!f.nullable) badges.push('NN');
  return badges;
}
```

Returns an array of short constraint badge strings for display in the diff UI. Used in the "added" table block to show all fields alongside their constraint badges.

- `UQ` is suppressed when `isPK` is true — PKs are implicitly unique.
- `NN` (NOT NULL) shown when `nullable: false`.
- Used only in the `'added'` table block, not for `'changed'` individual fields.

---

## 5. Exported Component — `DiffViewer`

```tsx
export const DiffViewer: React.FC<DiffViewerProps> = ({ onClose }) => { ... }
```

Reads from stores directly — no data props beyond `onClose`.

---

## 6. State

| State | Type | Initial Value | Description |
|---|---|---|---|
| `showSql` | `boolean` | `false` | Toggles the SQL migration CodeMirror panel |
| `snapshotId` | `string` | Last snapshot's `id` | ID of the currently selected snapshot |

**Default snapshot selection:**
```ts
const [snapshotId, setSnapshotId] = useState<string>(
  snapshots.length > 0 ? snapshots[snapshots.length - 1].id : ''
);
```

Defaults to the **last** snapshot in the array. Since `useHistoryStore.createSnapshot` **prepends** new snapshots, `snapshots[snapshots.length - 1]` is the **oldest** snapshot, not the most recent.

> ⚠️ **Bug:** The initial selection defaults to the oldest snapshot. The most recently created snapshot is at `snapshots[0]`, not `snapshots[snapshots.length - 1]`. Users may expect to compare against their most recent save.

---

## 7. Diffing Logic — `diffSchemas()`

```ts
const snapshot = snapshots.find(s => s.id === snapshotId);

const diffs = useMemo(() => {
  if (!snapshot) return [];
  return diffSchemas(
    { tables: snapshot.tables as Table[] },  // BEFORE
    { tables }                               // AFTER = current live state
  );
}, [snapshot, tables]);
```

Direction: `snapshot` = **before**, `tables` (current) = **after**.

Interpretation of diff kinds from the user's perspective:
- **`added`** — table exists now but did NOT exist at snapshot time (new table added since snapshot)
- **`removed`** — table existed at snapshot time but does NOT exist now (table deleted since snapshot)
- **`changed`** — table existed in both, but fields differ (fields added/removed/modified since snapshot)

---

## 8. Diff Summary Counters

```ts
const hasChanges    = diffs.length > 0;
const addedCount    = diffs.filter(d => d.kind === 'added').length;
const removedCount  = diffs.filter(d => d.kind === 'removed').length;
const changedCount  = diffs.filter(d => d.kind === 'changed').length;
```

Shown as colored pill badges below the snapshot `<select>`:

| Pill | Color | Condition |
|---|---|---|
| `+N added` | Green | `addedCount > 0` |
| `−N removed` | Red | `removedCount > 0` |
| `~N changed` | Amber | `changedCount > 0` |
| `✓ No changes` | Gray/green | All three counts = 0 |

---

## 9. JSX Structure & Rendering

```
<div class="diff-overlay">   (backdrop — click outside to close)
  <div class="diff-dialog">
    │
    ├── Header
    │     ├── Title: "Schema Diff" + subtitle
    │     └── ✕ close button
    │
    ├── Controls
    │     ├── Label: "Compare with snapshot:"
    │     ├── IF no snapshots → hint text
    │     ├── IF snapshots    → <select> of all snapshots
    │     └── IF snapshot selected → summary pills (added/removed/changed)
    │
    ├── Body (diff-dialog__body)
    │     ├── IF no snapshot selected → "Select a snapshot to compare."
    │     ├── IF no changes           → "✓ Current schema is identical."
    │     └── IF changes
    │           └── diff-list
    │                 ├── [added table blocks]   → all fields listed with badges
    │                 ├── [removed table blocks] → name only, no fields
    │                 └── [changed table blocks] → per-field: +added / -removed / ~changed
    │
    ├── SQL Panel (only when showSql && snapshot && hasChanges)
    │     └── CodeMirror (SQL, vscodeDark, read-only, 200px height)
    │
    └── Footer
          ├── [Generate SQL Migration / Hide SQL] toggle button (when snapshot + changes)
          ├── [↩ Restore this snapshot] button (when snapshot selected)
          └── [Close] button
```

## Diff Block Rendering — Three Cases

### Case 1: Added Table

```tsx
<div className="diff-block diff-block--added">
  <div className="diff-block__header">
    <span className="diff-badge diff-badge--added">+ TABLE</span>
    <span className="diff-block__name">{d.table.name}</span>
    <span className="diff-block__meta">{d.table.fields.length} fields</span>
  </div>
  <div className="diff-fields">
    {d.table.fields.map(f => (
      <div className="diff-field diff-field--added">
        <span>{f.name}</span>
        <span>{f.type}</span>
        <span>{fieldBadges(f).map(b => <span>{b}</span>)}</span>
      </div>
    ))}
  </div>
</div>
```

Shows all fields of the new table with their constraint badges.

### Case 2: Removed Table

```tsx
<div className="diff-block diff-block--removed">
  <div className="diff-block__header">
    <span className="diff-badge diff-badge--removed">− TABLE</span>
    <span className="diff-block__name">{d.table.name}</span>
  </div>
</div>
```

Only shows the table name — no fields are listed (table is gone, field details are less relevant).

### Case 3: Changed Table

```tsx
<div className="diff-block diff-block--changed">
  <div className="diff-block__header">
    <span className="diff-badge diff-badge--changed">~ TABLE</span>
    <span className="diff-block__name">{d.tableName}</span>
  </div>
  <div className="diff-fields">
    {d.fields.map(fd => {
      if (fd.kind === 'added')   → <div class="diff-field--added">  + name type</div>
      if (fd.kind === 'removed') → <div class="diff-field--removed"> − name type</div>
      // changed:
      → <div class="diff-field--changed"> ~ name  before.type → after.type</div>
    })}
  </div>
</div>
```

For changed fields, only `type` is shown before/after — other changed attributes (`nullable`, `unique`, `isPK`) are detected in the diff but their old/new values are not rendered in the UI.

---

## 10. SQL Migration Panel

```tsx
{showSql && snapshot && hasChanges && (
  <div className="diff-dialog__sql-panel">
    <h3>Generated SQL Migration</h3>
    <CodeMirror
      value={generateMigrationsSQL(diffs, dialect)}
      height="100%"
      extensions={[sqlLang()]}
      theme={vscodeDark}
      editable={false}
    />
  </div>
)}
```

- **`generateMigrationsSQL(diffs, dialect)`** — converts the `TableDiff[]` array into SQL DDL. Uses the active `dialect` from the schema store (`'postgres'`, `'mysql'`, etc.).
- **`editable={false}`** — read-only CodeMirror instance (no editing, but text is selectable/copyable).
- **`vscodeDark` theme** — hardcoded dark theme, does not follow the app's light/dark theme toggle.
- **Fixed height: 200px** — may be too short for large migration scripts; no scroll indicator.
- **No copy button** — users must manually select all text. `Ctrl+A` inside CodeMirror selects all.

**Toggle button:**
```tsx
<button onClick={() => setShowSql(!showSql)}>
  {showSql ? 'Hide SQL' : 'Generate SQL Migration'}
</button>
```

`generateMigrationsSQL` is called every render when `showSql` is true — it's not memoized. For large schemas this could be a minor perf concern, but it's a pure function and typically fast.

---

## 11. Footer Actions

### Generate SQL Migration / Hide SQL
- Only visible when `snapshot && hasChanges`
- Toggles `showSql` state
- SQL panel appears between the body and footer

### Restore Snapshot
```tsx
<button onClick={() => { restoreSnapshot(snapshotId); onClose(); }}>
  ↩ Restore this snapshot
</button>
```
- Calls `useHistoryStore.restoreSnapshot(snapshotId)` → which calls `useSchemaStore.loadSnapshot(snapshot)` → replaces entire canvas state.
- Then closes the dialog.
- **No confirmation dialog** — restore happens immediately on click.
- If the snapshot does not contain `notes` or `groups` (which `createSnapshot` does not save), restoring silently clears them from the canvas.

### Close
```tsx
<button className="diff-dialog__close-btn" onClick={onClose}>Close</button>
```
Also triggered by clicking the backdrop overlay (`onClick={(e) => e.target === e.currentTarget && onClose()}`).

---

## 12. Notable Patterns & Caveats

| | Detail |
|---|---|
| **Default snapshot is oldest, not newest** | `snapshots[snapshots.length - 1]` selects the oldest snapshot. `createSnapshot` prepends to the array, so `snapshots[0]` is the most recent |
| **Name-based identity** | Tables and fields are matched by `name` — renaming a table or field appears as a remove + add pair, not a modify |
| **`isFK` and `default` not diffed** | FK and default changes are not detected at the field level |
| **Changed field details not all shown** | Only `type` is shown before/after in `~changed` field rows; `nullable`, `unique`, `isPK` changes are detected but silently included without displaying the old/new values |
| **No copy button for SQL** | CodeMirror is `editable={false}` — users must manually select and copy generated SQL |
| **`vscodeDark` hardcoded** | SQL panel always dark regardless of the app theme (light mode shows a dark island) |
| **Restore has no confirmation** | `restoreSnapshot` runs immediately without a confirmation dialog — current canvas is overwritten without warning |
| **Restore drops notes and groups** | `createSnapshot` (in `history.ts`) only saves `tables` and `relationships` — restoring a snapshot loses all notes and groups from the canvas |
| **`generateMigrationsSQL` not memoized** | Called every render when SQL panel is open — pure function so no side effects, but a `useMemo` over `[diffs, dialect]` would be cleaner |
| **`diffs` array index used as React key** | `diffs.map((d, i) => <div key={i}>)` — index-as-key is fine here since the list is not reordered by user interaction |
| **Accessibility** | `role="dialog"` + `aria-modal="true"` + `aria-label="Schema diff"` on the overlay — good baseline accessibility |

---

## Data Flow Summary

```
useHistoryStore.snapshots  →  <select> snapshot picker
                                       │
                                       ▼ selected snapshot
useSchemaStore.tables      →  diffSchemas(snapshot.tables, tables)
                                       │
                                       ▼ TableDiff[]
                         ┌─────────────┴──────────────┐
                         ▼                             ▼
               Diff visual blocks            generateMigrationsSQL(diffs, dialect)
               (added/removed/changed)       → CodeMirror SQL viewer

useHistoryStore.restoreSnapshot(id)  →  useSchemaStore.loadSnapshot(snapshot)
                                         → replaces canvas state
```

---

*Generated documentation for SchemaForge — `src/components/diff/DiffViewer.tsx`*
