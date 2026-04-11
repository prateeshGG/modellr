# `CommandPalette.tsx` — Component Documentation

> **Location:** `src/components/palette/CommandPalette.tsx`  
> **Type:** React Component — TypeScript/TSX  
> **Purpose:** A keyboard-driven, searchable global command palette (⌘K / Ctrl+K) that provides centralized access to all major editor actions — table creation, schema import/export, AI operations, canvas layout, undo/redo, mode switching, template loading, and navigation. Commands are dispatched via Zustand store actions or `sf:*` custom events.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Type Definitions](#3-type-definitions)
4. [Command Registry](#4-command-registry)
5. [State](#5-state)
6. [Filtering & Grouping Logic](#6-filtering--grouping-logic)
7. [Effects](#7-effects)
8. [Keyboard Navigation — `handleKeyDown`](#8-keyboard-navigation--handlekeydown)
9. [JSX Structure](#9-jsx-structure)
10. [Command Item Rendering](#10-command-item-rendering)
11. [Notable Patterns & Caveats](#11-notable-patterns--caveats)

---

## 1. File Overview

`CommandPalette` is a **globally accessible overlay** toggled by `paletteOpen` state in `useUIStore`. It is mounted for the lifetime of the editor and renders `null` when closed (`if (!paletteOpen) return null`).

The palette is the **only place** in the UI that surfaces all available actions in one searchable list. It connects to the rest of the app via three mechanisms:
- **Direct store calls** — `addTable()`, `importTables()`, `undo()`, `redo()`, etc.
- **`sf:*` custom events** — delegated actions that other components listen for
- **`useUIStore` actions** — `toggleTheme()`, `toggleSidebar()`, `setMode()`, etc.

---

## 2. Dependencies & Imports

```tsx
import { useSchemaStore } from '../../store/schema';
import { useUIStore }     from '../../store/ui';
import { useUndoRedo }    from '../../hooks/useUndoRedo';
import { TEMPLATES }      from '../../utils/templates';
```

| Import | Role |
|---|---|
| `useSchemaStore` | `addTable`, `tables`, `importTables` |
| `useUIStore` | `paletteOpen`, `closePalette`, `setMode`, `toggleTheme`, `toggleSidebar`, `toggleRightPanel`, `showToast`, `selection` |
| `useUndoRedo` | `undo`, `redo`, `canUndo`, `canRedo` |
| `TEMPLATES` | Template registry for dynamic template commands |

---

## 3. Type Definitions

### `Category`

```ts
type Category = 'All' | 'Actions' | 'Navigate' | 'Insert' | 'Templates' | 'AI';
```

Six category values. `'All'` is used in the filter UI only — commands are never declared with category `'All'`. The `Exclude<Category, 'All'>` type ensures this in the `Command` interface.

### `Command`

```ts
interface Command {
  id:           string;
  label:        string;
  description?: string;
  shortcut?:    string;
  category:     Exclude<Category, 'All'>;
  icon:         string;     // Unicode character or text glyph
  action:       () => void;
  disabled?:    boolean;
}
```

All commands are uniform objects — no union types, no variants. The `disabled` flag blocks keyboard execution and mouse clicks, and shows a "Phase 2" badge in the UI (implying unimplemented features).

---

## 4. Command Registry

All commands are defined in a single `useMemo(() => [...], deps)` block. Total: **19 hardcoded commands + N template commands** (one per entry in `TEMPLATES`).

### Command List by Category

#### Insert

| ID | Label | Shortcut | Action |
|---|---|---|---|
| `new-table` | New table | `T` | `addTable({ x, y })` at grid position based on existing table count |

**Grid positioning for new tables:**
```ts
x: 120 + (tables.length % 4) * 260,
y: 120 + Math.floor(tables.length / 4) * 160
```
→ 4-column grid, 260px horizontal spacing, 160px vertical spacing.

---

#### AI

| ID | Label | Shortcut | Disabled? | Action |
|---|---|---|---|---|
| `ai-gen-schema` | ✦ Generate schema with AI | — | Never | `sf:open-ai-generate` event (no `initialPrompt`) |
| `ai-normalize` | Suggest normalization for selected table | — | When no table selected | `sf:open-ai-generate` with `initialPrompt` |

**`ai-normalize` — context-aware command:**
```ts
disabled: selection?.type !== 'table',
action: () => {
  if (selection?.type === 'table') {
    const table = tables.find(t => t.id === selection.tableId);
    if (table) {
      window.dispatchEvent(new CustomEvent('sf:open-ai-generate', {
        detail: { initialPrompt: `Analyze and suggest normalizations for the ${table.name} table.` }
      }));
    }
  }
  closePalette();
}
```

When a table is selected, fires `sf:open-ai-generate` with a pre-filled prompt including the table name. When no table is selected, the command is `disabled` — shown greyed-out with a "Phase 2" badge.

---

#### Actions

| ID | Label | Shortcut | Action |
|---|---|---|---|
| `connect-live-db` | Connect live database | — | `sf:open-live-import` event |
| `search` | Search tables & fields | — | `sf:open-search` event |
| `import-sql` | Import SQL DDL | — | `sf:open-import` event |
| `import-prisma` | Import Prisma schema | — | `sf:open-import` event |
| `open-diff` | Compare with snapshot | — | `sf:open-diff` event |
| `share-link` | Copy share link | — | `sf:share` event |
| `auto-layout` | Auto-layout schema | `G` | `sf:auto-layout` event |
| `fit-view` | Fit canvas to view | `0` | `sf:fit-view` event |
| `undo` | Undo | `⌘Z` | `undo()` — disabled if `!canUndo` |
| `redo` | Redo | `⌘Y` | `redo()` — disabled if `!canRedo` |
| `clear-schema` | Clear schema | — | `importTables([], [])` + `clearSelection()` + toast |
| `toggle-sidebar` | Toggle sidebar | `⌘B` | `toggleSidebar()` |
| `toggle-panel` | Toggle right panel | `⌘\` | `toggleRightPanel()` |
| `toggle-theme` | Toggle light / dark mode | — | `toggleTheme()` |

> **`import-sql` and `import-prisma` fire the same event:** Both dispatch `sf:open-import` without any payload — the `ImportDialog` has no way to know which format was intended. Both commands open the same dialog defaulting to SQL format. The Prisma command's description implies it should pre-select Prisma, but it does not.

---

#### Navigate

| ID | Label | Action |
|---|---|---|
| `mode-canvas` | Switch to Canvas mode | `setMode('canvas')` |
| `mode-split` | Switch to Split mode | `setMode('split')` |
| `mode-code` | Switch to Code mode | `setMode('code')` |

---

#### Templates

Dynamically generated from `Object.keys(TEMPLATES)`:

```ts
...(Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]).map((key) => ({
  id:          `template-${key}`,
  label:       `Load ${TEMPLATES[key].label} template`,
  description: TEMPLATES[key].description,
  category:    'Templates' as const,
  icon:        '◈',
  action:      () => { importTables(TEMPLATES[key].tables, TEMPLATES[key].relationships); closePalette(); },
}))
```

One command per template — `importTables()` **replaces the entire canvas** without confirmation. Number of template commands = `Object.keys(TEMPLATES).length`.

> **Note:** Template commands are absent from the category filter UI. `categories` array used in the filter tabs = `['All', 'Actions', 'Navigate', 'AI', 'Insert']` — `'Templates'` is not included. Template commands are reachable by:
> - Searching by name with the query input
> - Selecting "All" category (default)
> - But **not** by clicking a "Templates" filter tab

---

## 5. State

| State | Type | Initial | Description |
|---|---|---|---|
| `query` | `string` | `''` | Search input value |
| `activeCategory` | `Category` | `'All'` | Currently selected category filter |
| `activeIndex` | `number` | `0` | Keyboard-highlighted command index (relative to `filtered[]`) |

---

## 6. Filtering & Grouping Logic

### `filtered` — Search + Category Filter

```ts
const filtered = useMemo(() => {
  const cat = activeCategory === 'All'
    ? commands
    : commands.filter(c => c.category === activeCategory);
  if (!query.trim()) return cat;
  const q = query.toLowerCase();
  return cat.filter(c =>
    c.label.toLowerCase().includes(q) ||
    c.description?.toLowerCase().includes(q)
  );
}, [commands, query, activeCategory]);
```

- **Category first** — filter to the active category (or all)
- **Then fuzzy-ish text search** — `includes()` substring match on `label` and `description`
- Both filters are `AND`-combined (category AND text)
- Search is case-insensitive

### `grouped` — Group by Category for Rendering

```ts
const categories: Category[] = ['All', 'Actions', 'Navigate', 'AI', 'Insert'];

const grouped = categories.slice(1).reduce((acc, cat) => {
  const items = filtered.filter(c => c.category === cat);
  if (items.length) acc[cat] = items;
  return acc;
}, {} as Record<string, Command[]>);
```

Builds a `{ Actions: [...], Navigate: [...], AI: [...], Insert: [...] }` object from `filtered`. Categories with no matching commands are omitted.

> `'Templates'` is excluded from `categories.slice(1)` — template commands are visible in "All" and search results but not rendered under a "Templates" group header. They appear under their actual category `'Templates'`, which is absent from the reduce loop, so they are effectively **invisible in the grouped view** even in "All" mode.

> **Bug:** Template commands have `category: 'Templates'` but `'Templates'` is not in the `categories` array used for rendering. Template commands are filtered by the `filtered` array but never appear in any group in the `grouped` object → **Templates are never rendered**. Users cannot access template loading through the palette in its current state.

---

## 7. Effects

### Reset `activeIndex` on Filter Change

```ts
useEffect(() => { setActiveIndex(0); }, [filtered]);
```

Resets keyboard highlight to the first item whenever `filtered` changes (new query or category).

### Reset and Focus on Open

```ts
useEffect(() => {
  if (paletteOpen) {
    setQuery('');
    setActiveCategory('All');
    setTimeout(() => inputRef.current?.focus(), 0);
  }
}, [paletteOpen]);
```

Clears search and category filter on every open. Deferred focus (0ms timeout) ensures the input renders before focus is attempted.

### Auto-Scroll Active Item Into View

```ts
useEffect(() => {
  const el = listRef.current?.children[activeIndex] as HTMLElement;
  el?.scrollIntoView({ block: 'nearest' });
}, [activeIndex]);
```

Calls `scrollIntoView` on `listRef.current.children[activeIndex]`. This assumes `children[N]` directly maps to `filtered[N]` — but the actual DOM children of `listRef` are `palette__group` divs, not individual command buttons. Therefore `children[activeIndex]` is a **group div** (category header), not the active command button, and `scrollIntoView` scrolls to the wrong element.

> **Bug:** `listRef.current.children` contains group wrappers, not individual command items. The scroll-into-view effect targets group div elements, not the highlighted command button.

---

## 8. Keyboard Navigation — `handleKeyDown`

```ts
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setActiveIndex(i => Math.max(i - 1, 0));
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const cmd = filtered[activeIndex];
    if (cmd && !cmd.disabled) cmd.action();
  } else if (e.key === 'Escape') {
    closePalette();
  }
};
```

Attached to the `palette` div (not the `input`) — catches all key events within the palette including those from the search input.

| Key | Action |
|---|---|
| `↓` ArrowDown | Move highlight down, clamps at last item |
| `↑` ArrowUp | Move highlight up, clamps at 0 |
| `Enter` | Execute `filtered[activeIndex].action()` if not disabled |
| `Escape` | Close palette |

`activeIndex` is an index into `filtered[]` — the flat filtered list. Active state is computed per-item during render: `globalIndex = filtered.indexOf(cmd)`.

**Mouse hover** also updates `activeIndex` via `onMouseEnter={() => setActiveIndex(globalIndex)}` — keeps keyboard and mouse selection in sync.

---

## 9. JSX Structure

```
<div class="palette-overlay">  (backdrop — click outside to close)
  <div class="palette" onKeyDown={handleKeyDown}>

    Search Bar
    ├── ◎ icon
    ├── <input ref={inputRef} placeholder="Search commands…" />
    └── <kbd>esc</kbd>

    Category Filter Tabs  (role="tablist")
    ├── [All]     [Actions]     [Navigate]     [AI]     [Insert]

    Results  (ref={listRef})
    ├── palette__group (per category in grouped)
    │     ├── <div class="palette__group-label">CATEGORY NAME</div>
    │     └── command buttons × N
    │           ├── icon
    │           ├── label + optional description
    │           ├── optional <kbd> shortcut
    │           └── optional "Phase 2" badge (if disabled)
    │
    └── "No commands found for '{query}'" (if filtered.length === 0)
  </div>
</div>
```

---

## 10. Command Item Rendering

```tsx
<button
  className={[
    'palette__item',
    globalIndex === activeIndex  ? 'palette__item--active'   : '',
    cmd.disabled                 ? 'palette__item--disabled' : '',
    cmd.category === 'AI'        ? 'palette__item--ai'       : '',
  ].filter(Boolean).join(' ')}
  onMouseEnter={() => setActiveIndex(globalIndex)}
  onClick={() => !cmd.disabled && cmd.action()}
  disabled={cmd.disabled}
>
  <span class="palette__item-icon">{cmd.icon}</span>
  <span class="palette__item-content">
    <span class="palette__item-label">{cmd.label}</span>
    {cmd.description && <span class="palette__item-desc">{cmd.description}</span>}
  </span>
  {cmd.shortcut && <kbd class="palette__shortcut">{cmd.shortcut}</kbd>}
  {cmd.disabled && <span class="palette__coming-soon">Phase 2</span>}
</button>
```

CSS class rules:
- `palette__item--active` → keyboard/mouse highlighted (background highlight)
- `palette__item--disabled` → grayed out, `disabled` attribute prevents click
- `palette__item--ai` → special styling for AI commands (purple `✦` glow)

The `disabled` badge label "Phase 2" is shown for all disabled commands — currently only `undo`, `redo` (when not applicable), and `ai-normalize` (when no table is selected). Using "Phase 2" for `undo`/`redo` is semantically incorrect — they are fully implemented, just contextually unavailable.

---

## 11. Notable Patterns & Caveats

| | Detail |
|---|---|
| **Template commands never rendered** | `'Templates'` not in `categories` array used for grouping → template commands are visible in `filtered[]` but dropped by `grouped`. Users can search for them but see no results in the grouped view |
| **`import-sql` and `import-prisma` fire identical events** | Both dispatch `sf:open-import` with no payload — `ImportDialog` always opens to SQL tab. The Prisma command's differentiation is purely cosmetic |
| **`scrollIntoView` targets wrong DOM nodes** | `listRef.current.children[activeIndex]` accesses group wrapper divs, not individual command buttons — scroll-to-active is broken |
| **"Phase 2" label on non-future commands** | `undo`, `redo`, and `ai-normalize` show "Phase 2" when disabled — but these are fully implemented features that are conditionally unavailable, not future features |
| **`clear-schema` has no confirmation** | `importTables([], [])` runs immediately — entire canvas wiped with a single keypress and no undo prompt |
| **`'Templates'` absent from category filter UI** | Template commands are in category `'Templates'` but the filter tab row shows `['All', 'Actions', 'Navigate', 'AI', 'Insert']` — no "Templates" tab |
| **`useSchemaStore() as any`** | Cast to `any` to access `importTables` — suggests it may not be in the store's TypeScript interface |
| **`(showToast as any)?.()` double cast** | `showToast` is extracted typed but called via `(showToast as any)?.(...)` — same pattern as `ImportDialog` |
| **Templates override canvas without confirmation** | Template commands call `importTables(tables, rels)` immediately — any existing schema is silently replaced |
| **`activeIndex` global across groups** | `activeIndex` is the command's position in the flat `filtered[]` array, mapped to a rendering position via `filtered.indexOf(cmd)`. Keyboard navigation moves linearly across groups, not within groups |

---

## `sf:*` Event API Used by CommandPalette

| Event Dispatched | Listener Component | Purpose |
|---|---|---|
| `sf:open-ai-generate` | `AIBottomDrawer` | Opens AI chat drawer (with optional `initialPrompt` detail) |
| `sf:open-live-import` | Editor page | Opens `LiveImportDialog` |
| `sf:open-search` | `SchemaCanvas` → `sf:focus-filter` | Focuses sidebar search input |
| `sf:open-import` | Editor page | Opens `ImportDialog` |
| `sf:open-diff` | Editor page | Opens `DiffViewer` |
| `sf:share` | `useShareLink` | Encodes schema and copies share URL |
| `sf:auto-layout` | `SchemaCanvas` | Runs ELK auto-layout on ungrouped tables |
| `sf:fit-view` | `SchemaCanvas` | Fits all nodes into viewport |

---

*Generated documentation for SchemaForge — `src/components/palette/CommandPalette.tsx`*
