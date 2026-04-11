# `constants.ts` — Utility Documentation

> **Location:** `src/utils/constants.ts`  
> **Type:** Shared Constants Module — TypeScript  
> **Purpose:** Central registry of all application-wide constant values — accent color palettes, SQL dialect definitions, per-dialect field type lists, and canvas/editor behavioral limits. Serves as the single source of truth for values referenced across UI components, the schema store, and export utilities.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Code Structure & Organization](#3-code-structure--organization)
4. [Constants Reference](#4-constants-reference)
   - [`ACCENT_COLORS`](#accent_colors)
   - [`ACCENT_HEX`](#accent_hex)
   - [`DIALECTS`](#dialects)
   - [`DIALECT_LABELS`](#dialect_labels)
   - [`FIELD_TYPES_BY_DIALECT`](#field_types_by_dialect)
   - [`CANVAS_SNAP_GRID`](#canvas_snap_grid)
   - [`PILL_NODE_ZOOM_THRESHOLD`](#pill_node_zoom_threshold)
   - [`MAX_UNDO_STEPS`](#max_undo_steps)
   - [`MAX_SNAPSHOTS`](#max_snapshots)
5. [Notable Patterns & Conventions](#5-notable-patterns--conventions)
6. [Known Caveats & Limitations](#6-known-caveats--limitations)
7. [Consumers of This Module](#7-consumers-of-this-module)

---

## 1. File Overview

`constants.ts` is a **pure data module** — it exports no functions, no classes, and no side effects. Every export is a static, immutable value used as configuration across the application.

By centralizing these values here:
- UI components that render color pickers, dialect selectors, and type dropdowns all read from the same source.
- Changing a field type list, an accent color, or a behavioral limit requires editing only one file.
- TypeScript's `Record<Dialect, ...>` and `Record<AccentColor, ...>` types ensure exhaustive coverage — if a new `Dialect` or `AccentColor` is added to the type, TypeScript will error here until the constant is updated.

---

## 2. Dependencies & Imports

```ts
import type { AccentColor, Dialect } from '../types/schema';
```

| Import | Source | Role |
|---|---|---|
| `AccentColor` | `../types/schema` | Type alias for the union of valid accent color strings |
| `Dialect` | `../types/schema` | Type alias for the union of supported SQL dialects |

Both are **type-only imports** (`import type`) — they are erased at compile time and have zero runtime footprint.

---

## 3. Code Structure & Organization

```
constants.ts
├── Import                       (line 1)
├── ACCENT_COLORS                (lines 3–6)    — Ordered color name list
├── ACCENT_HEX                   (lines 8–17)   — Color name → hex code map
├── DIALECTS                     (line 19)      — Supported dialect list
├── DIALECT_LABELS               (lines 21–26)  — Dialect → display name map
├── FIELD_TYPES_BY_DIALECT       (lines 28–54)  — Dialect → field type list map
├── CANVAS_SNAP_GRID             (line 56)      — Canvas snap grid dimensions
├── PILL_NODE_ZOOM_THRESHOLD     (line 57)      — Zoom collapse threshold
├── MAX_UNDO_STEPS               (line 58)      — Undo history limit
└── MAX_SNAPSHOTS                (line 59)      — Snapshot count limit
```

---

## 4. Constants Reference

---

### `ACCENT_COLORS`

**Line:** 3–6  
**Type:** `AccentColor[]`

```ts
export const ACCENT_COLORS: AccentColor[] = [
  'blue', 'teal', 'coral', 'purple',
  'amber', 'green', 'pink', 'gray',
];
```

An **ordered array** of all valid accent color names. Used to drive color picker UIs (e.g. the table accent color selector in the editor panel). The order determines the display order in the UI.

| Index | Color |
|---|---|
| 0 | `blue` |
| 1 | `teal` |
| 2 | `coral` |
| 3 | `purple` |
| 4 | `amber` |
| 5 | `green` |
| 6 | `pink` |
| 7 | `gray` |

---

### `ACCENT_HEX`

**Lines:** 8–17  
**Type:** `Record<AccentColor, string>`

```ts
export const ACCENT_HEX: Record<AccentColor, string> = {
  blue:   '#378ADD',
  teal:   '#1D9E75',
  coral:  '#D85A38',
  purple: '#7F77DD',
  amber:  '#B9A717',
  green:  '#639922',
  pink:   '#D4537E',
  gray:   '#888780',
};
```

Maps each accent color name to its **canonical hex value**. Used wherever a raw CSS color is needed — e.g. canvas node borders, relationship line colors, thumbnail generation, and any programmatic color application that can't use CSS custom properties.

| Color | Hex | Approximate Visual |
|---|---|---|
| `blue` | `#378ADD` | Medium vibrant blue |
| `teal` | `#1D9E75` | Deep teal-green |
| `coral` | `#D85A38` | Warm orange-red |
| `purple` | `#7F77DD` | Soft violet-purple |
| `amber` | `#B9A717` | Dark golden yellow |
| `green` | `#639922` | Forest green |
| `pink` | `#D4537E` | Rose pink |
| `gray` | `#888780` | Warm medium gray |

---

### `DIALECTS`

**Line:** 19  
**Type:** `Dialect[]`

```ts
export const DIALECTS: Dialect[] = ['postgres', 'mysql', 'sqlite', 'mssql'];
```

Ordered list of all supported SQL dialects. Used to drive dialect selector dropdowns in the UI and as iteration sources for dialect-aware logic.

| Value | Database |
|---|---|
| `'postgres'` | PostgreSQL |
| `'mysql'` | MySQL |
| `'sqlite'` | SQLite |
| `'mssql'` | Microsoft SQL Server |

---

### `DIALECT_LABELS`

**Lines:** 21–26  
**Type:** `Record<Dialect, string>`

```ts
export const DIALECT_LABELS: Record<Dialect, string> = {
  postgres: 'PostgreSQL',
  mysql:    'MySQL',
  sqlite:   'SQLite',
  mssql:    'SQL Server',
};
```

Maps dialect identifiers to their **human-readable display names** for use in the UI. Prevents hardcoding display strings in components.

---

### `FIELD_TYPES_BY_DIALECT`

**Lines:** 28–54  
**Type:** `Record<Dialect, string[]>`

Maps each dialect to its list of supported field/column types. Used to populate the field type dropdown in the table editor, filtered to the currently selected dialect.

#### PostgreSQL Types (25 types)
```
bigint, bigserial, boolean, bytea, char, date, decimal, double precision,
float, inet, integer, interval, json, jsonb, numeric, real, serial,
smallint, text, time, timestamp, timestamptz, uuid, varchar
```

#### MySQL Types (30 types)
```
bigint, binary, bit, blob, boolean, char, date, datetime, decimal, double,
enum, float, int, json, longblob, longtext, mediumblob, mediumint, mediumtext,
smallint, text, time, timestamp, tinyblob, tinyint, tinytext, varbinary, varchar, year
```

#### SQLite Types (5 types — SQLite's type affinity system)
```
blob, integer, numeric, real, text
```

#### SQL Server (MSSQL) Types (30 types)
```
bigint, binary, bit, char, date, datetime, datetime2, datetimeoffset, decimal,
float, image, int, money, nchar, ntext, numeric, nvarchar, real, smalldatetime,
smallint, smallmoney, text, time, tinyint, uniqueidentifier, varbinary, varchar, xml
```

> **Note:** Types are listed in **alphabetical order** within each dialect for ease of scanning in dropdown UIs.

---

### `CANVAS_SNAP_GRID`

**Line:** 56  
**Type:** `[number, number]`

```ts
export const CANVAS_SNAP_GRID: [number, number] = [8, 8];
```

Defines the **snap-to-grid resolution** for the canvas in pixels — `[x, y]`. Tables snap to 8×8 pixel grid increments when dragged. Smaller values = finer positioning; larger = coarser snapping.

This is passed directly to the React Flow / `@xyflow/react` `snapGrid` prop.

---

### `PILL_NODE_ZOOM_THRESHOLD`

**Line:** 57  
**Type:** `number`

```ts
export const PILL_NODE_ZOOM_THRESHOLD = 0.0; // disabled per user feedback
```

Originally intended as a zoom level below which table nodes would collapse into compact "pill" representations (showing only the table name, hiding fields). Set to `0.0` — effectively **disabled** — because tables remain fully expanded at all zoom levels per user feedback.

The inline comment documents the design decision: this was a deliberate revert, not a forgotten feature.

---

### `MAX_UNDO_STEPS`

**Line:** 58  
**Type:** `number`

```ts
export const MAX_UNDO_STEPS = 50;
```

Maximum number of undo operations stored in the editor's undo/redo history (managed by `zundo` in the schema store). When the limit is exceeded, the oldest entry is dropped from the history stack.

---

### `MAX_SNAPSHOTS`

**Line:** 59  
**Type:** `number`

```ts
export const MAX_SNAPSHOTS = 50;
```

Maximum number of schema history snapshots stored per schema. Enforced at the application layer (not the database layer) — when a new snapshot is created and this limit is reached, the oldest snapshot should be pruned.

---

## 5. Notable Patterns & Conventions

- **`Record<K, V>` for exhaustive maps:** Using `Record<AccentColor, string>` and `Record<Dialect, string[]>` instead of plain objects ensures TypeScript will error if any key from the union type is missing — a compile-time completeness guarantee.
- **`import type` only:** No runtime imports — this module has zero side effects and zero bundle overhead beyond its own data.
- **Ordered arrays alongside maps:** `ACCENT_COLORS` and `DIALECTS` are arrays (preserving display order), while `ACCENT_HEX`, `DIALECT_LABELS`, and `FIELD_TYPES_BY_DIALECT` are lookup maps. UI components iterate the array for rendering order and use the map for value lookup.
- **All exports are `const`:** Nothing is mutable. These are read-only configuration values.
- **Tuple type for `CANVAS_SNAP_GRID`:** `[number, number]` (tuple) instead of `number[]` (array) — matches the exact type expected by `@xyflow/react`'s `snapGrid` prop.

---

## 6. Known Caveats & Limitations

| Issue | Description |
|---|---|
| **`PILL_NODE_ZOOM_THRESHOLD` is dead code** | Set to `0.0` to disable the feature — but the constant itself is still exported and presumably still read somewhere. Could be cleaned up. |
| **`MAX_SNAPSHOTS` not DB-enforced** | The limit is only meaningful if the application code checks it before inserting. No database constraint enforces this. |
| **No dark/light theme hex variants** | `ACCENT_HEX` provides a single hex per color with no light/dark variants — all themes use the same color values. |
| **SQLite type list is very limited** | Only 5 types reflect SQLite's type affinity system, but in practice, SQLite accepts any type string. The list may feel too restrictive for advanced SQLite users. |
| **`FIELD_TYPES_BY_DIALECT` not sorted consistently** | Lists appear roughly alphabetical but aren't rigorously sorted (e.g. `'double precision'` in postgres breaks strict alphabetical order between `'double'` and entries starting with 'f'). |

---

## 7. Consumers of This Module

| Consumer | Constants Used |
|---|---|
| Table node / editor panel UI | `ACCENT_COLORS`, `ACCENT_HEX` |
| Dialect selector UI | `DIALECTS`, `DIALECT_LABELS` |
| Field type dropdown | `FIELD_TYPES_BY_DIALECT` |
| Canvas component (`@xyflow/react`) | `CANVAS_SNAP_GRID` |
| Canvas zoom handler | `PILL_NODE_ZOOM_THRESHOLD` |
| Schema store (zundo) | `MAX_UNDO_STEPS` |
| Snapshot manager | `MAX_SNAPSHOTS` |
| `templates.ts` | `AccentColor` type (indirectly, via `Table` type) |

---

*Generated documentation for Modellr — `src/utils/constants.ts`*
