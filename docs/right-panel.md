# `RightPanel.tsx` — Component Documentation

> **Location:** `src/components/panel/RightPanel.tsx`  
> **Type:** React Component — TypeScript/TSX  
> **Purpose:** The context-sensitive properties panel docked on the right side of the editor. Renders a different editor sub-component depending on what is currently selected — a field editor, table editor, relationship editor, or (with nothing selected) a project stats summary. All editors write directly to the Zustand schema store on every change.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Module-Level Constants](#3-module-level-constants)
4. [Exported Component — `RightPanel`](#4-exported-component--rightpanel)
5. [Selection Resolution Logic](#5-selection-resolution-logic)
6. [Sub-Component: `FieldEditor`](#6-sub-component-fieldeditor)
7. [Sub-Component: `TableEditor`](#7-sub-component-tableeditor)
8. [Sub-Component: `RelationshipEditor`](#8-sub-component-relationshipeditor)
9. [Sub-Component: `ProjectStats`](#9-sub-component-projectstats)
10. [Notable Patterns & Caveats](#10-notable-patterns--caveats)

---

## 1. File Overview

`RightPanel` is a **selection-driven properties inspector**. It is always mounted when `rightPanelOpen` is `true` (returns `null` otherwise) and renders one of four views:

| Selection State | Rendered Component |
|---|---|
| `selection.type === 'field'` | `FieldEditor` (full field property form) |
| `selection.type === 'table'` (no field) | `TableEditor` (table name, comment, field list) |
| `selection.type === 'relationship'` | `RelationshipEditor` (cardinality toggle, delete) |
| No selection / null | `ProjectStats` (tables/fields/relationships count) |

All four sub-components are defined in the same file and are not exported. The overall panel has a fixed header showing the selected entity's name and type.

---

## 2. Dependencies & Imports

```tsx
import { useSchemaStore } from '../../store/schema';
import { useUIStore }     from '../../store/ui';
import { FIELD_TYPES_BY_DIALECT } from '../../utils/constants';
import type { Field, Dialect, Cardinality } from '../../types/schema';
```

| Import | Role |
|---|---|
| `useSchemaStore` | Schema CRUD operations + `tables`, `relationships`, `dialect` |
| `useUIStore` | `selection`, `rightPanelOpen`, `toggleRightPanel`, `clearSelection`, `readOnly` |
| `FIELD_TYPES_BY_DIALECT` | Dialect-specific SQL type dropdown options |
| `Field`, `Dialect`, `Cardinality` | TypeScript types |

---

## 3. Module-Level Constants

### `LENGTH_TYPES`

```ts
const LENGTH_TYPES = new Set([
  'varchar', 'char', 'character varying', 'nvarchar', 'nchar', 'binary', 'varbinary'
]);
```

Types that show the **Length** input (`max={65535}`) in `FieldEditor`. Checked via `LENGTH_TYPES.has(field.type.toLowerCase())`.

### `PRECISION_TYPES`

```ts
const PRECISION_TYPES = new Set([
  'numeric', 'decimal', 'float', 'real', 'money'
]);
```

Types that show the **Precision** + **Scale** dual input in `FieldEditor`. Checked via `PRECISION_TYPES.has(field.type.toLowerCase())`.

### `CARDINALITY_LABELS`

```ts
const CARDINALITY_LABELS: Record<Cardinality, string> = {
  'one-to-one':   '1 : 1',
  'one-to-many':  '1 : N',
  'many-to-many': 'N : M',
};
```

Display labels for the three cardinality toggle buttons in `RelationshipEditor`. Uses `N : M` (not `N : N`) for many-to-many — standard relational notation.

---

## 4. Exported Component — `RightPanel`

```tsx
export const RightPanel: React.FC = () => { ... }
```

No props — reads everything from Zustand stores directly.

### Gate — `rightPanelOpen`

```tsx
if (!rightPanelOpen) return null;
```

Early return before any hooks are called... except this is an `if` before the JSX return but **after** all store hooks are called. Hooks are always called (correct); the conditional return only affects rendering. This is valid React.

### Panel Header

```tsx
<aside className="right-panel" aria-label="Field editor panel">
  <div className="right-panel__header">
    <span className="right-panel__title">{titleText}</span>
    <span className="right-panel__subtitle">{subtitleText}</span>
    <button className="right-panel__close" onClick={toggleRightPanel} aria-label="Close panel">✕</button>
  </div>
```

`toggleRightPanel` hides the panel — **does not clear selection**. The selection state persists while the panel is hidden. Re-opening displays the same context.

---

## 5. Selection Resolution Logic

### Entity Lookup Chain

```ts
//  selectedTable: resolved when selection is 'table' OR 'field'
const selectedTable = (selection?.type === 'table' || selection?.type === 'field')
  ? tables.find(t => t.id === selection.tableId)
  : null;

// selectedField: resolved only when selection is 'field' AND table was found
const selectedField = (selection?.type === 'field' && selectedTable)
  ? selectedTable.fields.find(f => f.id === selection.fieldId)
  : null;

// selectedRel: resolved when selection is 'relationship'
const selectedRel = (selection?.type === 'relationship')
  ? relationships?.find(r => r.id === selection.relationshipId)
  : null;

// Source/target tables for relationship display
const sourceTable = selectedRel ? tables.find(t => t.id === selectedRel.sourceTableId) : null;
const targetTable = selectedRel ? tables.find(t => t.id === selectedRel.targetTableId) : null;
```

**Precedence order in the body:** `selectedField` → `selectedTable` → `selectedRel` → nothing.

A field selection always shows `FieldEditor` (not `TableEditor`) — field editors show field-level properties only.

### Dynamic Panel Title

```ts
const titleText = selectedField
  ? `${selectedTable?.name}.${selectedField.name}`   // → "users.email"
  : selectedTable
  ? selectedTable.name                               // → "users"
  : selectedRel
  ? `${sourceTable?.name} → ${targetTable?.name}`   // → "users → orders"
  : 'Properties';
```

| Selection | Title Example |
|---|---|
| Field selected | `users.email` |
| Table selected | `users` |
| Relationship selected | `users → orders` |
| Nothing selected | `Properties` |

---

## 6. Sub-Component: `FieldEditor`

### Props

```tsx
interface FieldEditorProps {
  tableId: string;         // Parent table ID (unused in the component body)
  field:   Field;          // Full field object
  dialect: any;            // Current SQL dialect
  onUpdate: (patch: Partial<Field>) => void;  // Partial update to field
  onDelete: () => void;
  readOnly?: boolean;
}
```

> **`tableId` is declared but unused** — never referenced inside `FieldEditor`'s body. It's passed from `RightPanel` but serves no purpose here (the parent already binds it in the `onUpdate`/`onDelete` closures).

### Type Dropdown

```ts
const typeOptions: string[] = FIELD_TYPES_BY_DIALECT[dialect as Dialect]
  ?? FIELD_TYPES_BY_DIALECT.postgres;
```

Falls back to PostgreSQL types if `dialect` is unrecognized. Options come from `FIELD_TYPES_BY_DIALECT` in `constants.ts`.

> If a field's current `type` is not in `typeOptions` (e.g. it was set by an importer with a non-standard type), it won't appear as an option — the `<select>` will show no selection or default to the first option visually, but the stored value remains unchanged until the user picks something.

### Conditional Length/Precision Sections

```ts
const showLength    = LENGTH_TYPES.has(field.type.toLowerCase());
const showPrecision = PRECISION_TYPES.has(field.type.toLowerCase());
```

Length section shown for: `varchar`, `char`, `character varying`, `nvarchar`, `nchar`, `binary`, `varbinary`.  
Precision/scale section shown for: `numeric`, `decimal`, `float`, `real`, `money`.

Both are mutually exclusive in practice (no type is in both sets).

**Length input constraints:** `min={1}`, `max={65535}` — MySQL `varchar` max.  
**Precision input constraints:** `min={1}`, `max={65}` — matches SQL standard precision limit.  
**Scale input constraints:** `min={0}`, `max={30}`.

### Constraint Checkboxes

| Checkbox | Field Attribute | Inversion? |
|---|---|---|
| Primary key | `field.isPK` | Direct |
| Not null | `field.nullable` | **Inverted** — checked means `nullable: false` |
| Unique | `field.unique` | Direct |

**Not null inversion:**
```tsx
<input type="checkbox"
  checked={!field.nullable}
  onChange={(e) => onUpdate({ nullable: !e.target.checked })}
/>
```
The checkbox is `checked` when the field is NOT nullable. This double negation can be confusing when reading the code but is correct in behavior.

### Default Value

```tsx
<input
  value={field.default ?? ''}
  onChange={(e) => onUpdate({ default: e.target.value || undefined })}
  placeholder="NULL"
/>
```

Empty string → sets `default: undefined` (removes field). Non-empty string → stores as-is. No type validation — free text (e.g. `now()`, `0`, `'active'`).

### Check Constraint

```tsx
<input
  value={field.check ?? ''}
  onChange={(e) => onUpdate({ check: e.target.value || undefined })}
  placeholder="e.g. value > 0"
/>
```

Raw SQL check constraint expression. No validation — stored as a string, emitted verbatim by the SQL exporter.

### Comment

```tsx
<textarea
  value={field.comment ?? ''}
  onChange={(e) => onUpdate({ comment: e.target.value || undefined })}
  rows={2}
  placeholder="Optional description"
/>
```

Stored in `field.comment`. Depending on the SQL exporter, this may be emitted as a `COMMENT ON COLUMN` statement (PostgreSQL) or ignored.

### All Inputs Are Uncontrolled w.r.t. Zustand

Every `onChange` fires `onUpdate({ key: value })` which flows to `updateField(tableId, fieldId, patch)` in the schema store. There is no local state — every keystroke immediately mutates the Zustand store. This causes a Yjs broadcast on every character typed, which could be noisy for collaborators.

---

## 7. Sub-Component: `TableEditor`

### Props

```tsx
{
  table:         any;
  onUpdateTable: (p: any) => void;
  onAddField:    () => void;
  onRemoveField: (id: string) => void;
  onUpdateField: (id: string, p: any) => void;
  onDeleteTable: () => void;
  dialect:       any;
  readOnly?:     boolean;
}
```

### Sections

| Section | Input | Action |
|---|---|---|
| Table name | `<input>` | `onUpdateTable({ name })` |
| Comment | `<textarea rows={2}>` | `onUpdateTable({ comment })` |
| Fields list | Mini name input + type `<select>` per field | `onUpdateField(f.id, patch)` |
| Add field button | "+ Add field" | `onAddField()` |
| Delete table button | "Delete table" (danger) | `onDeleteTable()` + `clearSelection()` |

### Fields Mini-Row List

```tsx
{table.fields.map((f: Field) => (
  <div key={f.id} className="panel-field-row">
    <input value={f.name} onChange={(e) => onUpdateField(f.id, { name: e.target.value })} />
    <select value={f.type} onChange={(e) => onUpdateField(f.id, { type: e.target.value })}>
      {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
    {!readOnly && (
      <button onClick={() => onRemoveField(f.id)} aria-label="Remove field">✕</button>
    )}
  </div>
))}
```

A compact list of all fields with only name and type editable — no constraints visible. For deeper field editing, clicking the field in the canvas triggers `selection.type === 'field'` which shows `FieldEditor`.

**`TableEditor` is a summary view; `FieldEditor` is the detailed inspector.**

### Delete Table Flow

```tsx
onDeleteTable={() => { removeTable(selectedTable.id); clearSelection(); }}
```

No confirmation — table is deleted immediately. `clearSelection()` is called to avoid stale `selectedTable` state pointing to a deleted table.

---

## 8. Sub-Component: `RelationshipEditor`

### Props

```tsx
{
  relationship: any;
  sourceTable:  any;
  targetTable:  any;
  onUpdate:     (patch: any) => void;
  onDelete:     () => void;
  readOnly?:    boolean;
}
```

### Field Resolution

```ts
const sourceField = sourceTable?.fields?.find(f => f.id === relationship.sourceFieldId);
const targetField = targetTable?.fields?.find(f => f.id === relationship.targetFieldId);
```

Displayed as dot-notation: `users.id → orders.user_id`.

### Cardinality Toggle

```tsx
{(['one-to-one', 'one-to-many', 'many-to-many'] as Cardinality[]).map(c => (
  <button
    className={`cardinality-btn ${relationship.cardinality === c ? 'cardinality-btn--active' : ''}`}
    onClick={() => onUpdate({ cardinality: c })}
    disabled={readOnly}
  >
    {CARDINALITY_LABELS[c]}  {/* '1 : 1', '1 : N', 'N : M' */}
  </button>
))}
```

A three-button toggle — one active at a time. Calls `updateRelationship(rel.id, { cardinality: c })` in the store.

### Optional Chaining on Store Actions

```tsx
onUpdate={(patch) => updateRelationship?.(selectedRel.id, patch)}
onDelete={() => { removeRelationship?.(selectedRel.id); clearSelection(); }}
```

`updateRelationship` and `removeRelationship` are called with optional chaining (`?.`) — these operations are treated as potentially missing from the store interface. Consistent with `useSchemaStore() as any` cast.

---

## 9. Sub-Component: `ProjectStats`

```tsx
const ProjectStats: React.FC = () => {
  const { tables, relationships } = useSchemaStore();
  const totalFields = tables.reduce((a, t) => a + t.fields.length, 0);
  return (
    <div className="project-stats">
      <p className="stats-hint">Select a table or field to edit its properties.<br />
        Click a relationship edge to edit cardinality.</p>
      <div className="stats-grid">
        <div class="stat-card"><span>{tables.length}</span><span>Tables</span></div>
        <div class="stat-card"><span>{totalFields}</span><span>Fields</span></div>
        <div class="stat-card"><span>{relationships.length}</span><span>Relationships</span></div>
      </div>
    </div>
  );
};
```

The fallback view when nothing is selected. Shows three summary stat cards and a usage hint.

`ProjectStats` calls `useSchemaStore()` directly — the only sub-component that does this (all others receive store values through props from `RightPanel`). Consistent with it being a standalone display component with no editing operations.

---

## 10. Notable Patterns & Caveats

| | Detail |
|---|---|
| **Every keystroke mutates Zustand** | No local buffered state — each `onChange` immediately calls `updateField`/`updateTable`. In collaborative mode, this broadcasts a Yjs update per keypress for name/comment inputs |
| **`tableId` prop is unused in `FieldEditor`** | Declared in `FieldEditorProps` and passed from `RightPanel`, but never referenced inside the component body — dead prop |
| **`useSchemaStore() as any` on `RightPanel`** | Casts the store to `any` to access `removeRelationship`, `updateRelationship`, and other actions not in the TypeScript interface |
| **Delete has no confirmation** | Both "Delete field" and "Delete table" fire immediately — no undo dialog, no confirmation prompt (though undo via `⌘Z` is available) |
| **`Not null` checkbox logic is inverted** | `checked={!field.nullable}` — double negation correct in behavior but easy to misread during maintenance |
| **Type dropdown doesn't handle unknown types** | If `field.type` is not in `typeOptions` (e.g. a custom type from import), the `<select>` renders with no matching option — value is preserved in store but invisible in UI |
| **`readOnly` blocks all mutation UI** | When `readOnly` is `true`: all inputs/selects are `disabled`, add/delete buttons are hidden. Cardinality buttons also `disabled={readOnly}` |
| **No `isFK` editor** | `field.isFK` can be seen in `FieldRow` badges but there is no checkbox for it in `FieldEditor` — FK status is inferred from relationship connections, not manually set |
| **`toggleRightPanel` doesn't clear selection** | Closing the panel preserves current selection — re-opening shows the same editor. Intentional UX choice but worth noting |
| **`RelationshipEditor` uses optional chaining on store actions** | `updateRelationship?.()` / `removeRelationship?.()` — defensive coding that masks potential missing store method errors |

---

## Component Hierarchy Within the File

```
RightPanel (exported)
│
├── reads: useSchemaStore (tables, relationships, updateField, updateTable,
│           addField, removeField, removeRelationship, updateRelationship,
│           removeTable, dialect)
│
├── reads: useUIStore (selection, rightPanelOpen, toggleRightPanel,
│           clearSelection, readOnly)
│
├── resolves: selectedTable, selectedField, selectedRel
│
└── renders one of:
      ├── FieldEditor        (selection.type === 'field')
      │     └── reads: FIELD_TYPES_BY_DIALECT, LENGTH_TYPES, PRECISION_TYPES
      │
      ├── TableEditor        (selection.type === 'table', no field)
      │     └── reads: FIELD_TYPES_BY_DIALECT
      │
      ├── RelationshipEditor (selection.type === 'relationship')
      │     └── reads: CARDINALITY_LABELS
      │
      └── ProjectStats       (no selection)
            └── reads: useSchemaStore() directly
```

---

## Selection → Panel Content Decision Tree

```
rightPanelOpen?
  └── NO  → return null

selection?.type
  ├── 'field'        → FieldEditor   (detailed: name, type, length/precision,
  │                    selectedField   PK, NN, UQ, default, check, comment)
  │
  ├── 'table'        → TableEditor   (summary: name, comment, all fields
  │   (no field sel)   selectedTable   mini-list, add/delete controls)
  │
  ├── 'relationship' → RelationshipEditor  (From.field → To.field,
  │                    selectedRel         cardinality toggle, delete)
  │
  └── null / other  → ProjectStats   (tables N, fields N, relationships N)
```

---

*Generated documentation for Modellr — `src/components/panel/RightPanel.tsx`*
