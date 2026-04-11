# Dashboard Components — Documentation

> **Location:** `src/components/dashboard/`  
> **Type:** React Components — TypeScript/TSX  
> **Purpose:** Five components that compose the dashboard page UI — the page header, navigation sidebar, usage stats bar, individual project cards, and the template preview modal with a live read-only React Flow canvas.

---

## Overview

| File | Export | Role |
|---|---|---|
| `DashboardHeader.tsx` | `DashboardHeader` | "My Projects" heading + search input + "New Schema" button |
| `DashboardSidebar.tsx` | `DashboardSidebar` | Left nav sidebar with route links, "Team" teaser, and sign-out |
| `DashboardStats.tsx` | `DashboardStats` | Four stat cards — schemas used, total tables, collaborators, last activity |
| `ProjectCard.tsx` | `ProjectCard` | Individual schema card with mini-map thumbnail and action buttons |
| `TemplatePreviewModal.tsx` | `TemplatePreviewModal` | Full-screen modal with a live read-only React Flow canvas for template previews |

---

---

# `DashboardHeader.tsx` — Component Documentation

> **Location:** `src/components/dashboard/DashboardHeader.tsx`

## File Overview

Renders the top section of the dashboard page: a title/subtitle block on the left and a search input + "New Schema" button on the right. The new schema button is disabled when the user's schema limit is reached.

## Dependencies & Imports

```tsx
import { Lock, Plus } from 'lucide-react';
```

> **Note:** `React` is not imported — the file uses JSX without a React import, relying on the automatic JSX transform (Vite/React 17+ feature). This is valid but inconsistent with other components that do import React.

## Props

```tsx
interface DashboardHeaderProps {
  searchQuery:    string;
  setSearchQuery: (val: string) => void;
  onCreateNew:    () => void;
  limitReached:   boolean;
}
```

| Prop | Type | Description |
|---|---|---|
| `searchQuery` | `string` | Controlled search input value — passed from the parent page |
| `setSearchQuery` | `(val: string) => void` | Called on every keystroke — parent filters the schema list |
| `onCreateNew` | `() => void` | Called when the "New Schema" button is clicked |
| `limitReached` | `boolean` | When `true`, disables the create button and shows a Lock icon with "Limit Reached" label |

## Button — Limit-Aware States

```tsx
<button
  className="btn-primary"
  onClick={onCreateNew}
  disabled={limitReached}
  style={{ opacity: limitReached ? 0.6 : 1, cursor: limitReached ? 'not-allowed' : 'pointer' }}
>
  {limitReached ? (
    <><Lock size={14} /> Limit Reached</>
  ) : (
    <><Plus size={16} /> New Schema</>
  )}
</button>
```

- Both `disabled` attribute AND inline `opacity`/`cursor` style are used — the `disabled` attribute already handles `cursor: not-allowed` and `opacity` on most browsers, so the inline styles are partially redundant for the `limitReached` case.
- `onCreateNew` is passed via `onClick` even when `disabled` — the browser suppresses click on disabled form elements, so this is safe.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **`React` not imported** | Works with automatic JSX runtime but inconsistent with other files |
| **Search is controlled** | `searchQuery` is fully controlled by the parent — no internal state. Filtering logic lives in the parent (`Dashboard.tsx`) |
| **No debounce on search** | `onChange` fires on every keystroke, calling `setSearchQuery` immediately — parent must handle filtering performance |
| **Lock icon size smaller than Plus** | `Lock size={14}` vs `Plus size={16}` — possibly intentional for visual weight balance |

---

---

# `DashboardSidebar.tsx` — Component Documentation

> **Location:** `src/components/dashboard/DashboardSidebar.tsx`

## File Overview

The persistent left sidebar on the dashboard. Renders a logo, a navigation list with active-state highlighting, and a footer with Settings and Sign Out. Uses `react-router-dom` for navigation and `useLocation` for active link detection.

## Dependencies & Imports

```tsx
import { useNavigate, useLocation } from 'react-router-dom';
```

No Zustand or schema stores — purely a navigation component.

## Props

```tsx
interface DashboardSidebarProps {
  onSignOut: () => void;
}
```

| Prop | Type | Description |
|---|---|---|
| `onSignOut` | `() => void` | Callback for the Sign Out action — triggers `useAuthStore.signOut()` in the parent |

## Navigation Items

```ts
const navItems = [
  { label: 'My Projects',           path: '/app',              icon: null },
  { label: 'Community Templates',   path: '/app/templates',    icon: null },
  { label: 'Team Workspace',        path: '#team',             icon: null, disabled: true },
  { label: 'Developer API',         path: '/app/settings#api', icon: null },
  { label: 'Documentation',         path: '/docs',             icon: null },
];
```

| Nav Item | Path | Status |
|---|---|---|
| My Projects | `/app` | Active |
| Community Templates | `/app/templates` | Active |
| **Team Workspace** | `#team` | **Disabled** — shows "PRO" badge |
| Developer API | `/app/settings#api` | Active (navigates to settings with hash) |
| Documentation | `/docs` | Active |

## `handleNav(item)` — Navigation Logic

```ts
const handleNav = (item: any) => {
  if (item.disabled) return;
  if (item.path.startsWith('#')) {
    document.getElementById(item.path.substring(1))?.scrollIntoView({ behavior: 'smooth' });
  } else {
    navigate(item.path);
  }
};
```

- **Disabled items** — early return, no navigation.
- **Hash paths** (e.g. `#team`) — scroll to in-page element by ID. Currently only used by "Team Workspace" which is disabled — so this branch never executes.
- **All other paths** — `react-router-dom` `navigate()`.

## Active Link Detection

```tsx
className={`sidebar-link ${location.pathname === item.path ? 'sidebar-link--active' : ''} ${item.disabled ? 'sidebar-link--disabled' : ''}`}
```

`location.pathname` exact match. Note: `/app/settings#api` won't match because `location.pathname` is `/app/settings` (no hash) — the "Developer API" link will **never** show as active even when on the settings page.

## Footer

```tsx
<div className="sidebar-footer">
  <div className="sidebar-link" onClick={() => navigate('/app/settings')}>Settings</div>
  <div className="sidebar-link" onClick={onSignOut} style={{ color: 'var(--alert-error)' }}>Sign Out</div>
</div>
```

Settings and Sign Out — always visible regardless of current page.

## PRO Feature Teaser

```tsx
{item.disabled && (
  <span style={{ fontSize: '9px', background: 'var(--surface-raised)', padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto' }}>
    PRO
  </span>
)}
```

Inline style only — no CSS class. "Team Workspace" shows a small PRO badge to signal it's a future paid feature.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Active detection fails for hash routes** | `/app/settings#api` !== `location.pathname` (`/app/settings`) — Developer API nav item never highlights as active |
| **Hash scroll-to is dead code** | `#team` branch in `handleNav` scrolls to a `team` anchor element, but that item is `disabled: true` — the scroll logic never runs |
| **`icon: null` on all items** | All nav items have `icon: null` — rendering code ignores this field. Icons were likely planned but not implemented |
| **`onSignOut` as prop** | Sign-out is delegated to the parent rather than calling `useAuthStore.signOut()` directly — allows the parent to perform cleanup after auth |

---

---

# `DashboardStats.tsx` — Component Documentation

> **Location:** `src/components/dashboard/DashboardStats.tsx`

## File Overview

Renders a row of **four stat cards** summarizing the user's activity at a glance: schemas used vs. limit, total tables across all schemas, collaborator count, and last active timestamp. Derives all values from the `schemas` array passed as a prop.

## Props

```tsx
interface DashboardStatsProps {
  schemas: any[];  // Array of raw Supabase schema rows
  limit:   number; // User's schema quota
}
```

## Stat Calculations

### Schemas Used
```tsx
{schemas.length} / {limit}
```
Simple array length vs. the quota limit.

### Total Tables
```ts
const totalTables = schemas.reduce((acc, schema) => {
  try {
    const cs = typeof schema.canvas_state === 'string'
      ? JSON.parse(schema.canvas_state)
      : schema.canvas_state;
    return acc + ((cs?.tables?.length) || 0);
  } catch { return acc; }
}, 0);
```
Sums `tables.length` from every schema's `canvas_state`. The try/catch handles both:
- `canvas_state` as a JSON string (old or serialized format)
- `canvas_state` as a pre-parsed object (Supabase JSONB columns return objects directly)

### Collaborators
```tsx
<div className="stat-value">1</div>
```
**Hardcoded to `1`** — always shows "1" regardless of actual collaborator data. This is a placeholder — real-time collaborator tracking is not yet implemented on the dashboard.

### Last Activity
```ts
const lastActiveDate = schemas.length > 0
  ? new Date(Math.max(...schemas.map(s => new Date(s.updated_at).getTime())))
  : null;

const timeAgoHours = lastActiveDate
  ? Math.floor((Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60))
  : null;

const timeAgoStr = timeAgoHours === null ? 'Never'
  : (timeAgoHours < 1 ? 'Just now' : `${timeAgoHours}h ago`);
```

Finds the most recently updated schema using `Math.max` spread over timestamps. Time formatting:

| Condition | Display |
|---|---|
| No schemas | `'Never'` |
| < 1 hour ago | `'Just now'` |
| N hours ago | `'Nh ago'` (e.g. `'3h ago'`) |
| Days/weeks | Still shown as `'Nh ago'` for large values (no days/weeks formatting) |

## Rendered Layout

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Schemas Used│ │ Total Tables│ │ Collaborators│ │ Last Activity│
│   3 / 10   │ │     24      │ │      1      │ │   2h ago    │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Collaborators is hardcoded `1`** | Always shows `1` — not computed from real data |
| **`schemas: any[]`** | No TypeScript type for individual schema rows — relies on duck typing of `canvas_state`, `updated_at` |
| **Large hour values not humanized** | `'168h ago'` instead of `'7 days ago'` — time display degrades for older schemas |
| **`canvas_state` double-parse guard** | Handles both string and object forms — necessary because Supabase JSONB may already be parsed |
| **Total tables color hardcoded** | `style={{ color: 'rgb(162, 107, 252)' }}` inline — should use a CSS variable or theme token |

---

---

# `ProjectCard.tsx` — Component Documentation

> **Location:** `src/components/dashboard/ProjectCard.tsx`

## File Overview

Renders a **clickable project card** for a single schema in the dashboard grid. Contains a mini-map thumbnail preview (up to 6 tables shown as tiny blocks), schema metadata (name, table count, last updated), and four action buttons (Open, Copy/Duplicate, Export, Delete).

## Dependencies & Imports

```tsx
import { useNavigate } from 'react-router-dom';
import { ACCENT_HEX } from '../../utils/constants';
import type { Table, AccentColor } from '../../types/schema';
```

## Props

```tsx
interface ProjectCardProps {
  schema:      any;                                           // Raw Supabase schema row
  onDuplicate: (e: React.MouseEvent, schema: any) => void;
  onExport:    (e: React.MouseEvent, schema: any) => void;
  onDelete:    (e: React.MouseEvent, id: string)  => void;
}
```

All action callbacks receive a `MouseEvent` — callers call `e.stopPropagation()` to prevent the card's own `onClick` (which navigates to the editor) from firing.

## `canvas_state` Parsing

```ts
let tables: Table[] = [];
try {
  const cs = typeof schema.canvas_state === 'string'
    ? JSON.parse(schema.canvas_state)
    : schema.canvas_state;
  tables = cs?.tables || [];
} catch {}
```

Same dual-format guard as `DashboardStats` — handles pre-parsed JSONB objects and JSON strings. Falls back to `[]` on any error (malformed/null canvas state).

## Mini-Map Thumbnail

```tsx
{tables.slice(0, 6).map((t, idx) => {
  const x = (idx % 3) * 70 - 70;    // col 0→–70, col 1→0, col 2→70
  const y = Math.floor(idx / 3) * 40 - 20;  // row 0→–20, row 1→20

  return (
    <div className="mini-map-table"
         style={{ transform: `translate(${x}px, ${y}px) scale(0.8)`, opacity: 0.7 }}>
      <div className="mini-map-header"
           style={{ background: ACCENT_HEX[t.accentColor as AccentColor] || 'rgb(162, 107, 252)' }} />
      {/* 3 field lines */}
      <div style={{ width: '80%', height: '2px', background: 'var(--border-default)' }} />
      <div style={{ width: '60%', height: '2px', background: 'var(--border-default)' }} />
      <div style={{ width: '70%', height: '2px', background: 'var(--border-default)' }} />
    </div>
  );
})}
```

**Grid layout (up to 6 tables):**

| Table idx | Col (x) | Row (y) | Position |
|---|---|---|---|
| 0 | –70px | –20px | top-left |
| 1 | 0px | –20px | top-center |
| 2 | +70px | –20px | top-right |
| 3 | –70px | +20px | bottom-left |
| 4 | 0px | +20px | bottom-center |
| 5 | +70px | +20px | bottom-right |

Each mini-table is a simplified block:
- **Colored header bar** — uses the table's `accentColor` via `ACCENT_HEX`
- **3 fixed-width lines** — abstract representation of 3 fields (always 3 regardless of actual field count)

Empty canvas shows a centered `"Empty Canvas"` label instead of table blocks.

## Card Click vs Action Button Click

```tsx
<div className="project-card" onClick={() => navigate(`/app/${schema.id}`)}>
  {/* ... */}
  <button onClick={(e) => { e.stopPropagation(); navigate(`/app/${schema.id}`) }}>Open</button>
  <button onClick={(e) => onDuplicate(e, schema)}>Copy</button>
  <button onClick={(e) => onExport(e, schema)}>Export</button>
  <button onClick={(e) => onDelete(e, schema.id)}>Delete</button>
```

- **Card click** → `navigate('/app/schemaId')`
- **"Open" button** → same navigation, but `e.stopPropagation()` prevents the card click from also firing (double navigation prevented)
- **Other action buttons** → pass the `MouseEvent` to the parent handler; parent calls `e.stopPropagation()` there

## Date Formatting

```ts
const lastUpdate = new Date(schema.updated_at).toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', year: 'numeric'
});
// → "Apr 11, 2026"
```

## Public Badge

```tsx
{schema.is_public && <span className="status-badge status-badge--public">Public</span>}
```

Shown when `schema.is_public === true` — appears next to the project title.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Mini-map always shows 3 field lines** | Regardless of actual field count — purely representative |
| **Capped at 6 tables** | `tables.slice(0, 6)` — schemas with many tables don't show all of them in the thumbnail |
| **"Open" button is redundant** | Clicking the card already navigates to the editor; "Open" does the same thing |
| **`schema: any` type** | No typed schema interface — relies on duck typing throughout |
| **`onDelete` receives `schema.id` not `schema`** | Inconsistent with `onDuplicate` and `onExport` which receive the full schema object |
| **Mini-map uses fixed pixel positions** | Not responsive to card size changes — may look off on non-standard card dimensions |

---

---

# `TemplatePreviewModal.tsx` — Component Documentation

> **Location:** `src/components/dashboard/TemplatePreviewModal.tsx`

## File Overview

A **full-screen modal overlay** that renders a live, read-only React Flow canvas showing a template's tables and relationships. Allows users to visually preview a template schema before applying it to their canvas.

Follows the same two-component pattern as `SchemaCanvas`:
- **`TemplatePreviewModal`** (exported) — wraps `PreviewInner` in `ReactFlowProvider`
- **`PreviewInner`** (internal) — all logic; must be inside `ReactFlowProvider`

## Dependencies & Imports

```tsx
import { ReactFlow, Background, BackgroundVariant, ReactFlowProvider } from '@xyflow/react';
import { TEMPLATES } from '../../utils/templates';
import { TableNode } from '../canvas/TableNode';
import { RelationshipEdge, RelationshipMarkerDefs } from '../canvas/RelationshipEdge';
import '../canvas/SchemaCanvas.css';  // Reuses canvas styles
```

Reuses the actual production `TableNode` and `RelationshipEdge` components — the preview looks identical to the real canvas.

## Props

```tsx
interface TemplatePreviewModalProps {
  templateId: string;    // Key in the TEMPLATES registry
  onClose:    () => void;
  onUse:      () => void; // Parent applies the template and closes modal
}
```

## Node & Edge Type Registry

```ts
const nodeTypes = { tableNode: TableNode };
const edgeTypes = { relationshipEdge: RelationshipEdge };
```

Defined outside the component (stable references). Only includes `tableNode` — no `noteNode` or `groupNode` since template data only contains tables.

## Node Construction

```ts
const nodes = useMemo(() =>
  (template.tables || []).map(t => ({
    id:       t.id,
    type:     'tableNode',
    position: t.position,
    data:     { ...t }
  })), [template]);
```

Directly maps template table objects to React Flow nodes. Uses the template's pre-defined positions (from `utils/templates.ts`).

## Edge Construction — Simplified Handle IDs

```ts
const edges = useMemo(() =>
  (template.relationships || []).map(r => {
    const isSourceLeftOfTarget = true;  // Simplified for preview

    return {
      id: r.id,
      source: r.sourceTableId,
      target: r.targetTableId,
      sourceHandle: JSON.stringify({
        t: r.sourceTableId, f: r.sourceFieldId, type: 'source',
        pos: isSourceLeftOfTarget ? 'right' : 'left'
      }),
      targetHandle: JSON.stringify({
        t: r.targetTableId, f: r.targetFieldId, type: 'target',
        pos: isSourceLeftOfTarget ? 'left' : 'right'
      }),
      type: 'relationshipEdge',
      data: { sourceTableId: r.sourceTableId, cardinality: r.cardinality },
      markerEnd: r.cardinality !== 'one-to-one' ? 'url(#crowsfoot-many)' : 'url(#crowsfoot-one)',
    };
  }), [template]);
```

**Critical issue:** The `sourceHandle` and `targetHandle` IDs are **JSON-serialized objects**, e.g.:
```json
{"t":"abc","f":"def","type":"source","pos":"right"}
```

But `FieldRow.tsx` generates handles with IDs in the format:
```
"tableId__fieldId__right"
```

These two formats are **incompatible**. The `sourceHandle`/`targetHandle` values in the preview edges will not match any actual `Handle` component id rendered by `TableNode`/`FieldRow`. As a result, **relationship edges will not connect to field handles** in the preview — they may fall back to table-level connections or render disconnected.

> `isSourceLeftOfTarget = true` is hardcoded — no position-based direction logic like in `SchemaCanvas`. Template tables may be arranged differently, but edge routing always assumes source is to the left.

## React Flow Configuration (Read-Only)

```tsx
<ReactFlow
  nodes={nodes}
  edges={edges}
  nodeTypes={nodeTypes}
  edgeTypes={edgeTypes}
  fitView
  nodesDraggable={false}
  nodesConnectable={false}
  elementsSelectable={false}
  proOptions={{ hideAttribution: true }}
>
```

| Prop | Value | Meaning |
|---|---|---|
| `nodesDraggable` | `false` | Nodes cannot be moved |
| `nodesConnectable` | `false` | Cannot draw new connections |
| `elementsSelectable` | `false` | Nothing is selectable (no click highlighting) |
| `fitView` | `true` | Auto-fits all template nodes on mount |

## `!template` Guard Placement

```ts
// Line 24: template looked up BEFORE null check
const template = TEMPLATES[templateId];

// Line 49: null check AFTER hooks (useMemo calls above)
if (!template) return null;
```

The null guard on line 49 is after `useMemo` calls on lines 26 and 34 — this violates the **Rules of Hooks** (hooks must not be called conditionally). If `templateId` is invalid, the component still calls `useMemo` with `undefined` as `template`, then returns null. React does not throw here because hooks are always called, but `template.tables` in `useMemo` will throw when `template` is `undefined`.

## Modal Layout

```
<div class="preview-modal-overlay">    (backdrop — click to close)
  <div class="preview-modal-content">  (modal panel)
    <header>
      ├── Template name + description
      └── ✕ close button
    </header>

    <div class="preview-canvas-wrapper">
      ├── <RelationshipMarkerDefs />    (SVG marker defs)
      └── <ReactFlow .../>             (live read-only canvas)
    </div>

    <footer>
      ├── "{N}-table architecture" description
      ├── [Use Template] button → onUse()
      └── [Close] button → onClose()
    </footer>
  </div>
</div>
```

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Handle ID format mismatch** | Preview edges use JSON-serialized handle IDs; `FieldRow` generates `"tableId__fieldId__side"` format — edges likely don't connect to field anchors correctly |
| **`isSourceLeftOfTarget = true` hardcoded** | All edges assumed to go left-to-right; templates with right-to-left relationships will have reversed crow's-foot markers |
| **`if (!template) return null` after hooks** | Conditional early return after `useMemo` calls — if `template` is `undefined`, `useMemo` will throw accessing `template.tables` before the guard can execute |
| **Reuses production `TableNode`** | The preview `TableNode` is fully interactive (has rename, color picker, etc.) but `elementsSelectable={false}` and `nodesDraggable={false}` disable most interaction. Double-clicking a table header could still trigger a rename attempt |
| **`SchemaCanvas.css` imported directly** | Shares canvas stylesheet — ensures consistent appearance between editor and preview |
| **No loading state for template** | Template data is synchronous (from `TEMPLATES` constant), so no loading state is needed |

---

## Dashboard Component Data Flow

```
Dashboard.tsx (page)
│
├── props to DashboardSidebar
│     ├── onSignOut → authStore.signOut()
│     └── navigation (useNavigate + useLocation)
│
├── props to DashboardHeader
│     ├── searchQuery (state)
│     ├── setSearchQuery (state setter)
│     ├── onCreateNew → supabase.from('schemas').insert(...)
│     └── limitReached → schemas.length >= SCHEMA_LIMIT
│
├── props to DashboardStats
│     ├── schemas (all user schemas from Supabase)
│     └── limit (SCHEMA_LIMIT constant)
│
└── schemas.filter(search).map(schema =>
      <ProjectCard
        schema={schema}
        onDuplicate → supabase insert clone
        onExport    → exportSQL(...)
        onDelete    → supabase delete + confirm dialog
      />
    )

// Conditionally rendered:
<TemplatePreviewModal
  templateId={selectedTemplate}
  onClose={() => setSelectedTemplate(null)}
  onUse={() => { importTables(...); navigate('/app/new') }}
/>
```

---

*Generated documentation for Modellr — `src/components/dashboard/`*
