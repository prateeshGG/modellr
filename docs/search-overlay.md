# `SearchOverlay.tsx` — Component Documentation

> **Location:** `src/components/search/SearchOverlay.tsx`  
> **Type:** React Component — TypeScript/TSX  
> **Purpose:** A keyboard-driven, scored search overlay for finding tables and fields within the current schema. Opened via `Ctrl+F` / `sf:open-search` event. Results ranked by match quality and support inline highlight of the matched substring. Selecting a result sets the UI selection state and pans the canvas to the corresponding table.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Type Definitions](#3-type-definitions)
4. [Scoring Algorithm — `scoreMatch()`](#4-scoring-algorithm--scorematch)
5. [Component State](#5-component-state)
6. [Search Logic — `hits` useMemo](#6-search-logic--hits-usememo)
7. [Effects](#7-effects)
8. [Actions — `selectHit()`](#8-actions--selecthit)
9. [Keyboard Navigation — `handleKeyDown`](#9-keyboard-navigation--handlekeydown)
10. [Highlight Helper — `highlight()`](#10-highlight-helper--highlight)
11. [JSX Structure](#11-jsx-structure)
12. [Result Row Rendering](#12-result-row-rendering)
13. [Notable Patterns & Caveats](#13-notable-patterns--caveats)

---

## 1. File Overview

`SearchOverlay` is a **modal search dialog** with real-time scoring and filtering. It searches across all table names and all field names/types in the current schema, ranks results by match quality (exact > prefix > contains), and limits the output to 30 results.

On selection, it:
1. Updates the UI selection state (`setSelection`) → opens the correct editor in `RightPanel`
2. Fires `sf:focus-table` custom event → `SchemaCanvas` pans and zooms to the node

The component has no server or store write operations — it is purely a **read + navigate** interface.

---

## 2. Dependencies & Imports

```tsx
import { useSchemaStore } from '../../store/schema';
import { useUIStore }     from '../../store/ui';
```

| Import | Role |
|---|---|
| `useSchemaStore` | `tables` — read-only access to schema data |
| `useUIStore` | `setSelection` — updates the editor's active selection |

---

## 3. Type Definitions

### `SearchHit`

```ts
interface SearchHit {
  kind:       'table' | 'field';
  tableId:    string;
  tableName:  string;
  fieldId?:   string;    // present when kind === 'field'
  fieldName?: string;    // present when kind === 'field'
  fieldType?: string;    // present when kind === 'field'
  score:      number;    // relevance score: 0.5–3.5
}
```

A flat result item that carries enough context to render and navigate regardless of whether it represents a table or a field. Field hits include their parent table name and ID for display.

---

## 4. Scoring Algorithm — `scoreMatch()`

```ts
function scoreMatch(haystack: string, needle: string): number {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (h === n)          return 3;   // exact match
  if (h.startsWith(n)) return 2;   // prefix match
  if (h.includes(n))   return 1;   // substring match
  return 0;                         // no match
}
```

Returns a match quality score 0–3:

| Return | Condition | Example: query `"user"` |
|---|---|---|
| `3` — exact | `haystack === needle` (case-insensitive) | `"user"` |
| `2` — prefix | `haystack.startsWith(needle)` | `"users"`, `"user_id"` |
| `1` — contains | `haystack.includes(needle)` | `"power_user"`, `"new_users"` |
| `0` — no match | none of the above | `"orders"` |

Called separately for table names and field names/types. A matched table hit receives a `+0.5` bonus to rank tables above same-score field hits in the sorted output.

---

## 5. Component State

| State | Type | Initial | Description |
|---|---|---|---|
| `query` | `string` | `''` | Current search input value |
| `activeIndex` | `number` | `0` | Index into `hits[]` — the keyboard-highlighted row |

---

## 6. Search Logic — `hits` useMemo

```ts
const hits = useMemo<SearchHit[]>(() => {
  // Empty query → show all tables (up to 20)
  if (!query.trim()) {
    return tables.map(t => ({
      kind: 'table', tableId: t.id, tableName: t.name, score: 0
    })).slice(0, 20);
  }

  const q = query.trim();
  const results: SearchHit[] = [];

  for (const table of tables) {
    // Score the table name
    const ts = scoreMatch(table.name, q);
    if (ts > 0) {
      results.push({ kind: 'table', ..., score: ts + 0.5 });
    }

    // Score each field's name and type
    for (const field of table.fields) {
      const fs = scoreMatch(field.name, q) || scoreMatch(field.type, q);
      if (fs > 0) {
        results.push({ kind: 'field', ..., score: fs });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 30);
}, [query, tables]);
```

### Empty Query Behaviour

When the input is blank, returns up to **20 table hits** (no fields) with `score: 0`. This gives users a quick overview of all tables rather than a blank result list.

### Field Scoring: Name OR Type

```ts
const fs = scoreMatch(field.name, q) || scoreMatch(field.type, q);
```

Uses short-circuit `||` — if the field **name** matches (`score > 0`), uses that score. Only falls back to matching against the field **type** if the name doesn't match. This means type-matched hits always score lower than or equal to name-matched hits for the same query string.

**Practical result:** Searching for `"varchar"` returns all fields of type `varchar`. Searching for `"id"` returns fields named `id`, `user_id`, etc. (name match), not fields whose type contains `"id"`.

### Score Distribution

| Hit Type | Score Range |
|---|---|
| Table exact match | 3.5 (3 + 0.5 bonus) |
| Table prefix match | 2.5 |
| Table contains match | 1.5 |
| Field name exact match | 3 |
| Field name prefix match | 2 |
| Field name contains match | 1 |
| Field type exact match | 3 (only if name doesn't match) |
| Field type prefix match | 2 |
| Field type contains match | 1 |

The table bonus (+0.5) ensures exact-match tables rank above exact-match fields, and prefix-match tables rank above exact-match fields.

### Result Limits

| Mode | Limit |
|---|---|
| Empty query (tables only) | 20 |
| With query (tables + fields, scored) | 30 |

---

## 7. Effects

### Focus on Mount

```ts
useEffect(() => {
  inputRef.current?.focus();
}, []);
```

Focuses the search input immediately when the overlay mounts.

### Reset `activeIndex` on `hits` Change

```ts
useEffect(() => { setActiveIndex(0); }, [hits]);
```

Every time `hits` changes (new query → new results), the keyboard highlight resets to the first result.

### Auto-Scroll Active Item

```ts
useEffect(() => {
  const el = listRef.current?.children[activeIndex] as HTMLElement;
  el?.scrollIntoView({ block: 'nearest' });
}, [activeIndex]);
```

Reads `listRef.current.children[activeIndex]` to scroll the highlighted item into view.

> **Note:** Unlike `CommandPalette` (which has the same pattern but groups results under category headers), `SearchOverlay` renders results **as a flat list** — `listRef.current.children[i]` correctly maps to the `hits[i]` button. No grouping wrappers exist, so `scrollIntoView` works correctly here.

---

## 8. Actions — `selectHit()`

```ts
const selectHit = useCallback((hit: SearchHit) => {
  // 1. Set UI selection state
  if (hit.kind === 'field' && hit.fieldId) {
    setSelection({ type: 'field', tableId: hit.tableId, fieldId: hit.fieldId });
  } else {
    setSelection({ type: 'table', tableId: hit.tableId });
  }

  // 2. Pan canvas to the table node
  window.dispatchEvent(new CustomEvent('sf:focus-table', { detail: hit.tableId }));

  // 3. Close the overlay
  onClose();
}, [setSelection, onClose]);
```

Three effects in sequence on selection:

1. **`setSelection`** — updates `useUIStore.selection` → `RightPanel` opens `TableEditor` or `FieldEditor`
2. **`sf:focus-table`** — `SchemaCanvas` listens for this event and calls `fitView` / pan+zoom to the specified `tableId`
3. **`onClose()`** — closes the search overlay

The `sf:focus-table` event passes `hit.tableId` as `event.detail`. `SchemaCanvas` handler:
```ts
// In SchemaCanvas:
window.addEventListener('sf:focus-table', (e) => {
  const tableId = (e as CustomEvent).detail;
  const node = getNode(tableId);
  if (node) fitView({ nodes: [node], padding: 0.3, duration: 400 });
});
```

---

## 9. Keyboard Navigation — `handleKeyDown`

```ts
const handleKeyDown = (e: React.KeyboardEvent) => {
  if      (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, hits.length - 1)); }
  else if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
  else if (e.key === 'Enter')     { e.preventDefault(); const hit = hits[activeIndex]; if (hit) selectHit(hit); }
  else if (e.key === 'Escape')    { onClose(); }
};
```

Attached to `search-dialog` div — catches key events from the input and from button focus.

| Key | Action |
|---|---|
| `↓` | Move down, clamp at last result |
| `↑` | Move up, clamp at 0 |
| `Enter` | Select the currently highlighted hit |
| `Escape` | Close overlay |

Mouse `onMouseEnter` also updates `activeIndex` to keep keyboard and pointer in sync.

---

## 10. Highlight Helper — `highlight()`

```ts
const highlight = (text: string): React.ReactNode => {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return <>
    {text.slice(0, idx)}
    <mark className="search-hit__mark">{text.slice(idx, idx + query.length)}</mark>
    {text.slice(idx + query.length)}
  </>;
};
```

Wraps the first occurrence of `query` within `text` in a `<mark>` element, preserving original case. Returns a React fragment.

**First-match only** — if the query `"id"` appears in `"user_id_lookup"`, only the first `"id"` is wrapped (`user_` + `[id]` + `_lookup`).

**Case-preserving** — the slice uses the original `text` (not lowercased), so displayed text retains its original casing. The `<mark>` content is exactly as it appears in the stored field/table name.

**Used for:** `hit.tableName` in table results, `hit.fieldName` in field results. Field type (`hit.fieldType`) is **not highlighted** — shown as plain text even if matched by type.

---

## 11. JSX Structure

```
<div class="search-overlay">  (backdrop — click outside to close)
  <div class="search-dialog" onKeyDown={handleKeyDown}>

    Input Row
    ├── ◎ icon
    ├── <input ref={inputRef} value={query} autoFocus />
    ├── [✕ Clear] button (only when query !== '')
    └── <kbd>esc</kbd> hint

    Results  (ref={listRef})
    ├── IF hits.length === 0 → "No matches for '{query}'"
    └── hits.map → <button> result rows (see below)

    Footer
    ├── "↑↓ navigate"
    ├── "↩ select"
    └── "{N} result(s)"

  </div>
</div>
```

---

## 12. Result Row Rendering

### Table Hit

```tsx
<button key={`${hit.tableId}-tbl`}
        className={`search-result ${i === activeIndex ? 'search-result--active' : ''}`}
        onMouseEnter={() => setActiveIndex(i)}
        onClick={() => selectHit(hit)}>

  <span class="search-result__icon search-result__icon--table">⊞</span>
  <span class="search-result__label">{highlight(hit.tableName)}</span>
  <span class="search-result__meta">
    {tables.find(t => t.id === hit.tableId)?.fields.length} fields
  </span>
</button>
```

> **Re-lookup in render:** `tables.find(t => t.id === hit.tableId)?.fields.length` — looks up the table again from the full `tables` array during render to get the live field count. This is a minor inefficiency since `hit` already contains `tableName` and the table lookup in `hits` useMemo ran just before rendering. The field count could be included in the `SearchHit` object at creation time.

### Field Hit

```tsx
<button key={`${hit.tableId}-${hit.fieldId}`} ...>

  <span class="search-result__icon search-result__icon--field">·</span>
  <span class="search-result__parent">{hit.tableName}</span>
  <span class="search-result__sep">.</span>
  <span class="search-result__label">{highlight(hit.fieldName ?? '')}</span>
  <span class="search-result__meta search-result__meta--type">{hit.fieldType}</span>
</button>
```

Displays as `tableName.fieldName [fieldType]` — the dot notation mirrors how the RightPanel displays selected fields.

### Row Key Strategy

```ts
key={`${hit.tableId}-${hit.fieldId ?? 'tbl'}`}
```

Composite key: `tableId + '-' + fieldId`. When it's a table hit, `fieldId` is undefined → key becomes `"abc123-tbl"`. Stable and unique unless a table and a field in a different table happen to produce the same composite — unlikely given UUIDs but technically possible if `fieldId` is `"tbl"`.

---

## 13. Notable Patterns & Caveats

| | Detail |
|---|---|
| **`scrollIntoView` works correctly here** | Unlike `CommandPalette`, results are flat (no group wrappers) — `listRef.current.children[i]` correctly maps to result button `i` |
| **Field type match is lower priority** | `scoreMatch(field.name, q) || scoreMatch(field.type, q)` — type score only used if name doesn't match at all. A field named `"status"` with type `"varchar"` queried as `"varc"` → matched via type (score 2), but `"sta"` → matched via name (score 2, takes precedence) |
| **Table bonus is always +0.5** | Tables always outscore field hits at the same quality level — table prefix match (2.5) > exact field name match (3)? No — 2.5 < 3. Tables only beat same-quality fields (exact-table 3.5 > exact-field 3) |
| **First-match only highlight** | `indexOf` finds only the first occurrence of the query within the text — repeated matches are not all highlighted |
| **Field type not highlighted** | Even when the match is via field type, the displayed type text is plain — only `fieldName` gets the `<mark>` treatment |
| **`tables.find()` in render** | Re-looks up the table during rendering to display `fields.length` — minor inefficiency; the field count could be embedded in `SearchHit` at creation |
| **Empty query shows tables only (max 20)** | Fields are excluded from the empty-query default list — shows the canvas overview without showing every field |
| **Both `setSelection` and `sf:focus-table` on select** | Selection update is immediate (store mutation); canvas pan is async (event → React Flow). The panel opens and canvas moves at slightly different times — no visible issue |
| **`onClose()` fires third** | Selection → canvas focus event → close. The overlay doesn't unmount until after `onClose()`, so the user sees the overlay while the canvas begins to pan |
| **No `relationships` in search** | Relationship names/cardinalities are not searchable — only tables and fields are indexed |
| **Score 0.5 table bonus is small** | Exact field match (3) beats prefix table match (2.5) — field hits can appear above table hits when the field name is an exact match |

---

## Full Data Flow

```
useSchemaStore.tables
  │
  ▼ useMemo [query, tables]
scoreMatch(tableName, query)
scoreMatch(fieldName, query) || scoreMatch(fieldType, query)
  │
  ▼ sort by score desc, slice 30
hits: SearchHit[]
  │
  ▼ render
<button> rows with highlight() inline marks
  │
  ▼ selectHit(hit) on click/Enter
  ├── setSelection({ type, tableId, fieldId? })    → RightPanel opens editor
  ├── dispatchEvent('sf:focus-table', tableId)     → SchemaCanvas pans to node
  └── onClose()                                    → overlay unmounts
```

---

*Generated documentation for SchemaForge — `src/components/search/SearchOverlay.tsx`*
