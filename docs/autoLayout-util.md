# `autoLayout.ts` — Utility Documentation

> **Location:** `src/utils/autoLayout.ts`  
> **Type:** Async Utility Function — TypeScript  
> **Purpose:** Automatically computes optimal 2D canvas positions for schema tables using the ELK graph layout engine. Takes the current set of tables and relationships and returns a map of table IDs to `{ x, y }` coordinates, ready to be applied to the canvas.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Code Structure & Organization](#3-code-structure--organization)
4. [Internal Types & Constants](#4-internal-types--constants)
5. [Internal Function — `estimateNodeHeight`](#5-internal-function--estimatenodeheight)
6. [Exported Function — `autoLayout`](#6-exported-function--autolayout)
7. [ELK Layout Configuration](#7-elk-layout-configuration)
8. [Layout Algorithm Details](#8-layout-algorithm-details)
9. [Input & Output Shapes](#9-input--output-shapes)
10. [Error Handling](#10-error-handling)
11. [Notable Patterns & Conventions](#11-notable-patterns--conventions)
12. [Known Caveats & Limitations](#12-known-caveats--limitations)
13. [Usage Example](#13-usage-example)
14. [Consumers of This Module](#14-consumers-of-this-module)

---

## 1. File Overview

`autoLayout.ts` solves the **canvas arrangement problem**: when tables are loaded (e.g. from a DB introspection, a template, or AI generation), they all start at `{ x: 0, y: 0 }`, making the canvas unusable. This utility uses the **Eclipse Layout Kernel (ELK)** — a production-grade graph layout library — to compute non-overlapping, relationship-aware positions.

The key insight is that this isn't just a grid — ELK **respects the FK relationship graph**, placing connected tables close to each other and using a left-to-right **layered layout** algorithm (similar to how dependency graphs or entity diagrams are typically presented).

The function is `async` because ELK's layout computation runs asynchronously (it uses web workers or promises internally).

---

## 2. Dependencies & Imports

```ts
import ELK from 'elkjs/lib/elk.bundled.js';
import type { Table, Relationship } from '../types/schema';
```

| Import | Source | Role |
|---|---|---|
| `ELK` | `elkjs/lib/elk.bundled.js` | Eclipse Layout Kernel — graph layout engine |
| `Table` | `../types/schema` | Type for canvas table objects |
| `Relationship` | `../types/schema` | Type for canvas relationship (FK) objects |

### Why `elkjs/lib/elk.bundled.js`?

`elkjs` has multiple entry points. The **bundled** variant (`elk.bundled.js`) bundles the ELK layout algorithms into a single self-contained file that runs synchronously in environments without web worker support — important for a Vite/browser environment where web worker setup may be complex. It avoids the need to configure a separate `elk.worker.js`.

---

## 3. Code Structure & Organization

```
autoLayout.ts
├── Import ELK                      (line 1)
├── Import types                    (line 2)
├── ELK singleton                   (line 4)      — const elk = new ELK()
├── LayoutNode interface            (lines 6–12)  — Internal ELK node shape
├── estimateNodeHeight()            (lines 15–20) — Height calculator helper
└── autoLayout()                    (lines 22–69) — Main exported async function
    ├── Node construction           (lines 29–33)
    ├── Edge construction           (lines 35–39)
    ├── ELK graph assembly          (lines 41–53)
    ├── elk.layout() call           (line 56)
    ├── Position extraction         (lines 57–63)
    ├── Return positions Map        (line 64)
    └── Error handler               (lines 65–68)
```

---

## 4. Internal Types & Constants

### `LayoutNode` Interface

**Lines:** 6–12

```ts
interface LayoutNode {
  id: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
}
```

Represents an ELK graph node. `x` and `y` are optional inputs (not set initially) — ELK computes and populates them in the layout result.

### ELK Singleton

```ts
const elk = new ELK();
```

A **module-level singleton** — one ELK instance shared across all calls to `autoLayout()`. This avoids re-instantiation overhead on every call and is safe since ELK's `layout()` is stateless across calls.

---

## 5. Internal Function — `estimateNodeHeight`

**Lines:** 15–20  
**Signature:**
```ts
function estimateNodeHeight(table: Table, density: 'comfortable' | 'compact'): number
```

Estimates the **pixel height** of a table node on the canvas, based on its number of fields and the current density setting. This height is passed to ELK so it can properly space and avoid node overlaps.

```ts
const headerH = 40;           // Table header row height (constant)
const footerH = 28 + 24;      // Add-field button + AI chip row heights
const fieldH = density === 'compact' ? 28 : 32;  // Per-field row height

return headerH + table.fields.length * fieldH + footerH;
```

**Formula:**
```
height = 40 + (fieldCount × fieldRowHeight) + 52
```

| Density | Field row height | 5-field table height | 10-field table height |
|---|---|---|---|
| `comfortable` | 32px | 92 + 160 = 252px | 92 + 320 = 412px |
| `compact` | 28px | 92 + 140 = 232px | 92 + 280 = 372px |

> The estimates are **hardcoded pixel approximations** of the actual rendered DOM heights. If the canvas node CSS changes, these values should be updated to match.

---

## 6. Exported Function — `autoLayout`

**Lines:** 22–69  
**Signature:**
```ts
async function autoLayout(
  tables: Table[],
  relationships: Relationship[],
  density: 'comfortable' | 'compact' = 'comfortable'
): Promise<Map<string, { x: number; y: number }>>
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `tables` | `Table[]` | ✅ | — | All canvas tables to lay out |
| `relationships` | `Relationship[]` | ✅ | — | FK relationships used as graph edges |
| `density` | `'comfortable' \| 'compact'` | ❌ | `'comfortable'` | Determines field row height for node size estimation |

**Returns:**  
`Promise<Map<string, { x: number; y: number }>>` — a Map from table `id` to its computed `{ x, y }` position.

On error, returns an **empty Map** (no positions computed).

---

## 7. ELK Layout Configuration

**Lines:** 41–53

```ts
const graph = {
  id: 'root',
  layoutOptions: {
    'elk.algorithm': 'layered',
    'elk.direction': 'RIGHT',
    'elk.spacing.nodeNode': '60',
    'elk.layered.spacing.nodeNodeBetweenLayers': '80',
    'elk.layered.nodePlacement.strategy': 'SIMPLE',
    'elk.padding': '[top=40, left=40, bottom=40, right=40]',
  },
  children: nodes,
  edges,
};
```

### Layout Options Explained

| Option | Value | Effect |
|---|---|---|
| `elk.algorithm` | `'layered'` | Uses the **Sugiyama layered layout** — ideal for DAGs and FK relationship graphs. Places nodes in layers (columns) based on dependency depth. |
| `elk.direction` | `'RIGHT'` | Layers are arranged **left-to-right** — relationships flow from left (source) to right (target). Matches natural reading direction. |
| `elk.spacing.nodeNode` | `'60'` | **60px minimum gap** between nodes within the same layer (vertical spacing). |
| `elk.layered.spacing.nodeNodeBetweenLayers` | `'80'` | **80px minimum gap** horizontally between layers (columns of tables). |
| `elk.layered.nodePlacement.strategy` | `'SIMPLE'` | Uses ELK's simple node placement — fast and predictable. Alternatives (`NETWORK_SIMPLEX`, `LINEAR_SEGMENTS`) are more complex but may produce better results. |
| `elk.padding` | `'[top=40, left=40, bottom=40, right=40]'` | **40px padding** on all sides of the layout bounding box — prevents tables from being flush against the canvas edge. |

---

## 8. Layout Algorithm Details

### Nodes

Each table becomes an ELK node with:
- `id` = the table's `id` string
- `width` = fixed **240px** (constant `nodeWidth`)
- `height` = computed by `estimateNodeHeight()`

### Edges

Each relationship becomes an ELK edge:
```ts
{
  id: r.id,
  sources: [r.sourceTableId],
  targets: [r.targetTableId],
}
```

ELK uses edges to determine the **topological order** of layers — tables that are FK targets (referenced tables like `users`) tend to appear in earlier (left) layers, while tables with FK columns (source tables like `orders`) appear in later (right) layers.

### Position Extraction

```ts
for (const child of laid.children ?? []) {
  if (child.x !== undefined && child.y !== undefined) {
    positions.set(child.id, { x: child.x, y: child.y });
  }
}
```

ELK returns nodes with `x`, `y` coordinates populated. The function extracts these into a clean `Map<tableId, position>` that the caller applies to the canvas store.

---

## 9. Input & Output Shapes

### Input — `Table`
```ts
{
  id: string;
  name: string;
  fields: { id: string; name: string; type: string; ... }[];
  position: { x: number; y: number };
  accentColor: string;
}
```

### Input — `Relationship`
```ts
{
  id: string;
  sourceTableId: string;
  targetTableId: string;
  sourceFieldId: string;
  targetFieldId: string;
  cardinality: string;
}
```

### Output
```ts
Map<string, { x: number; y: number }>

// Example:
Map {
  "tbl_users"  → { x: 40,  y: 40  },
  "tbl_orders" → { x: 380, y: 120 },
  "tbl_items"  → { x: 720, y: 200 }
}
```

---

## 10. Error Handling

```ts
} catch (err) {
  console.error('[auto-layout] ELK error:', err);
  return new Map();
}
```

If ELK throws (e.g. malformed graph, internal error), the function:
1. Logs the error with the `[auto-layout]` prefix for easy log filtering.
2. Returns an **empty Map** — callers receive no positions and should fall back to existing positions or a default layout.

The caller is responsible for handling the empty Map case gracefully (e.g. keeping current positions unchanged).

---

## 11. Notable Patterns & Conventions

- **Module-level ELK singleton:** `const elk = new ELK()` is created once at module load time — not per call. This is safe and efficient since ELK is stateless between layout calls.
- **Fixed node width (240px):** All tables use the same width regardless of content. This simplifies layout computation and matches the fixed-width canvas table node design.
- **Height estimation, not measurement:** Node heights are mathematically estimated from field counts rather than measured from the DOM — avoids needing a React render cycle before computing layout.
- **`as any` type cast on ELK call:** `elk.layout(graph as any)` — the ELK TypeScript types don't perfectly match `elkjs/lib/elk.bundled.js`'s bundled export. A pragmatic cast allows building without fighting library type mismatches.
- **Returns a `Map` not a plain object:** Using `Map<string, position>` allows O(1) lookups by table ID and is the idiomatic JavaScript structure for key-value pairs with non-trivial keys.
- **`density` parameter for future use:** The density parameter is already wired through to `estimateNodeHeight()`, anticipating that the canvas may support compact/comfortable density modes that affect node heights.

---

## 12. Known Caveats & Limitations

| Issue | Description |
|---|---|
| **Height estimation may be inaccurate** | Hardcoded pixel values (`headerH = 40`, `footerH = 52`) may drift out of sync if the canvas CSS changes, causing ELK to under- or over-space nodes vertically. |
| **No self-loop handling** | Tables with a FK referencing themselves (self-referential) are passed to ELK as self-loops, which the layered algorithm may not render cleanly. |
| **Disconnected graphs** | Tables with no relationships form disconnected components. ELK may stack these arbitrarily or overlap them — the result depends on ELK's internal handling of disconnected subgraphs. |
| **Fixed width ignores content** | Some tables may have very long column names that overflow the 240px fixed width, but the layout engine doesn't know this. |
| **No incremental layout** | `autoLayout` is a full re-layout — calling it after adding one table repositions all tables, which may disorient users who carefully arranged them. |
| **`SIMPLE` placement strategy** | `SIMPLE` is the fastest but not the most aesthetically optimal strategy. `NETWORK_SIMPLEX` may produce better results for complex schemas. |
| **Async — no cancellation** | There's no `AbortController` or cancellation mechanism. Multiple rapid calls will all complete and the last one to return will win (race condition if the caller doesn't guard). |

---

## 13. Usage Example

```ts
import { autoLayout } from './autoLayout';

async function applyAutoLayout(tables, relationships) {
  const positions = await autoLayout(tables, relationships, 'comfortable');

  if (positions.size === 0) {
    console.warn('Auto-layout returned no positions — keeping current layout.');
    return;
  }

  // Apply positions to your store
  const updatedTables = tables.map(table => ({
    ...table,
    position: positions.get(table.id) ?? table.position
  }));

  schemaStore.setTables(updatedTables);
}
```

### Fallback Pattern

```ts
const positions = await autoLayout(tables, relationships);
const newPos = positions.get(table.id) ?? table.position; // keep original if not computed
```

---

## 14. Consumers of This Module

| Consumer | Usage |
|---|---|
| Schema editor canvas | Auto-layout button / "Organize" action — applies computed positions to all tables |
| DB introspection handler | After importing a MySQL/Postgres schema (all tables start at `{0,0}`), auto-layout is triggered |
| Template loader | After applying a template, positions are pre-set — may or may not call auto-layout |

---

*Generated documentation for Modellr — `src/utils/autoLayout.ts`*
