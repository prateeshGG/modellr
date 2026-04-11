# Canvas Components — Documentation

> **Location:** `src/components/canvas/`  
> **Type:** React Components — TypeScript/TSX  
> **Purpose:** Eight components that together form the entire visual canvas layer of Modellr. Built on top of `@xyflow/react` (React Flow), they render tables, fields, relationships, notes, groups, empty state, multiplayer cursors, and the orchestrating canvas container.

---

## Overview

| File | Export(s) | Role |
|---|---|---|
| `SchemaCanvas.tsx` | `SchemaCanvas`, `CanvasInner` | Root canvas — React Flow setup, event routing, node/edge conversion |
| `TableNode.tsx` | `TableNode` | Custom node — table header, field list, rename, color picker, add/delete |
| `FieldRow.tsx` | `FieldRow` | Row within a table node — field display, inline edit, drag-reorder, React Flow handles |
| `RelationshipEdge.tsx` | `RelationshipEdge`, `RelationshipMarkerDefs` | Custom edge — Bezier curve with crow's-foot SVG markers |
| `NoteNode.tsx` | `default NoteNode` | Sticky note custom node — resizable, editable, color-themed |
| `GroupNode.tsx` | `default GroupNode` | Table grouping container node — resizable, named, deletable |
| `MultiplayerCursors.tsx` | `MultiplayerCursors` | Renders floating cursor + name-tag overlays for collaborators |
| `EmptyState.tsx` | `EmptyState` | Welcome panel shown when no tables exist — template quick-start chips |

---

---

# `SchemaCanvas.tsx` — Component Documentation

> **Location:** `src/components/canvas/SchemaCanvas.tsx`

## File Overview

The **root canvas component** — orchestrates the entire React Flow instance. Converts Zustand schema state into React Flow `Node[]` and `Edge[]`, handles all user interactions (drag, drop, connect, double-click, keyboard events), implements auto-layout, and exposes the global `sf:*` custom event API.

Structured as two components:
- **`SchemaCanvas`** (exported) — wraps `CanvasInner` in `ReactFlowProvider`
- **`CanvasInner`** (internal) — all logic; must be inside `ReactFlowProvider` to call `useReactFlow()`

## Dependencies & Imports

```tsx
import { ReactFlow, Background, MiniMap, useNodesState, useEdgesState,
         ReactFlowProvider, useReactFlow, Panel, Controls } from '@xyflow/react';
import { TableNode } from './TableNode';
import NoteNode from './NoteNode';
import GroupNode from './GroupNode';
import { RelationshipEdge, RelationshipMarkerDefs } from './RelationshipEdge';
import { EmptyState } from './EmptyState';
import { useSchemaStore } from '../../store/schema';
import { useUIStore } from '../../store/ui';
import { CANVAS_SNAP_GRID, ACCENT_HEX, PILL_NODE_ZOOM_THRESHOLD } from '../../utils/constants';
import { autoLayout } from '../../utils/autoLayout';
```

## Node & Edge Type Registry

```ts
const nodeTypes = { tableNode: TableNode, noteNode: NoteNode, groupNode: GroupNode };
const edgeTypes = { relationshipEdge: RelationshipEdge };
```

Defined **outside** the component — React Flow requires stable object references for `nodeTypes`/`edgeTypes`. Re-creating them inside the component on every render causes React Flow to unmount and remount all nodes.

## Converter Functions

### `tableToNode(table: Table): Node`
```ts
{ id: table.id, type: 'tableNode', position: table.position, parentId: table.groupId, data: { ...table }, dragHandle: '.table-node__header' }
```
- `parentId: table.groupId` — React Flow uses this for relative positioning within a group node.
- `dragHandle: '.table-node__header'` — Only the header bar initiates drag; field areas don't.

### `noteToNode(note: Note): Node`
```ts
{ id: note.id, type: 'noteNode', position: note.position, data: { ...note } }
```

### `groupToNode(group: Group): Node`
```ts
{ id: group.id, type: 'groupNode', position: group.position, data: { ...group }, style: { width: group.width, height: group.height, zIndex: -1 } }
```
- `zIndex: -1` — Groups render behind all other canvas elements.

### `relationshipToEdge(rel, positions): Edge`

The most complex converter — handles **dynamic edge direction** based on relative table positions:

```ts
const isSourceLeftOfTarget = (sourcePos.x + 150) <= (targetPos.x + 150);

const edgeSourceTableId = isSourceLeftOfTarget ? rel.sourceTableId : rel.targetTableId;
const edgeTargetTableId = isSourceLeftOfTarget ? rel.targetTableId : rel.sourceTableId;
```

**Why this is needed:** React Flow handles must use `type="source"` on the right side and `type="target"` on the left. When the logical target table is to the left of the logical source table, the edge direction must be logically swapped in React Flow terms so handles align correctly. The crow's-foot marker is placed on `markerStart` instead of `markerEnd` to compensate.

**Handle ID format:** `"tableId__fieldId__left"` and `"tableId__fieldId__right"` — parsed by `onConnect` and assembled in `FieldRow`.

**`PositionMap`** — A `Map<tableId, position>` derived from live React Flow node state (not stale Zustand state) to ensure edges recalculate during drag frames:
```ts
const livePositions = useMemo<PositionMap>(() => {
  const map = new Map();
  nodes.forEach(n => map.set(n.id, n.position));
  return map;
}, [nodes]);
```

## State Synchronization

```ts
// Nodes: sync from Zustand → React Flow
useEffect(() => {
  setNodes([...groups.map(groupToNode), ...tables.map(tableToNode), ...notes.map(noteToNode)]);
}, [tables, notes, groups, setNodes]);

// Edges: sync from Zustand → React Flow (with live positions)
useEffect(() => {
  setEdges(relationships.map(r => relationshipToEdge(r, livePositions)));
}, [relationships, livePositions, setEdges]);
```

Zustand is the **source of truth** — React Flow state is always derived from it. The node order is `groups → tables → notes` to ensure correct z-index layering (groups behind, tables on top).

## Event Handlers

### `onConnect` — Create Relationship by Handle Drag
```ts
const onConnect = (connection: Connection) => {
  const sourceFieldId = connection.sourceHandle.split('__')[1];
  const targetFieldId = connection.targetHandle.split('__')[1];
  addRelationship({ sourceTableId, sourceFieldId, targetTableId, targetFieldId, cardinality: 'one-to-many' });
};
```
Parses the `tableId__fieldId__side` handle ID format to extract field IDs. New relationships default to `one-to-many`.

### `onNodeDragStop` — Drop to Group Assignment
```ts
const onNodeDragStop = (_, node: Node) => {
  if (node.type === 'tableNode') {
    const intersections = getIntersectingNodes(node).filter(n => n.type === 'groupNode');
    const targetGroup = intersections[0] ?? null;
    if (targetGroup) {
      // Compute position relative to group using absolute positions
      const relativePos = { x: tableAbsPos.x - groupAbsPos.x, y: tableAbsPos.y - groupAbsPos.y };
      updateTable(node.id, { position: relativePos, groupId: targetGroup.id });
    } else {
      // Restore absolute position, clear groupId
      updateTable(node.id, { position: tableAbsPos, groupId: undefined });
    }
  }
  // notes and groups: save new position directly
};
```
Uses React Flow's `getIntersectingNodes` to detect group-drop interactions. Falls back to `node.position`, `node.positionAbsolute`, or `node.computed?.positionAbsolute` (different React Flow versions store this differently).

### `onDoubleClick` — Add Table at Cursor Position
```ts
// Only fires if click is NOT on a node, panel, or controls
const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
useSchemaStore.getState().addTable(pos);
```

### `handleAutoLayout`
```ts
const positions = await autoLayout(ungroupedTables, ungroupedRels, density);
positions.forEach((pos, tableId) => moveTable(tableId, pos));
setTimeout(() => fitView({ padding: 0.12, duration: 400 }), 100);
```
Only lays out **ungrouped** tables (tables with no `groupId`). Grouped tables are excluded — their positions are managed relative to their group. Uses ELK layout engine via `autoLayout()`.

### `handleAddNote` / `handleAddGroup`
```ts
const { x, y, zoom } = getViewport();
const centerX = -x / zoom + window.innerWidth / (2 * zoom) - 100;
const centerY = -y / zoom + window.innerHeight / (2 * zoom) - 75;
addNote({ x: centerX, y: centerY });
```
Calculates viewport center in canvas-space coordinates to spawn new notes/groups at the center of what's currently visible.

## Custom Event API (`sf:*` Events)

Canvas subscribes to six custom events via `window.addEventListener`:

| Event | Payload | Action |
|---|---|---|
| `sf:auto-layout` | none | Runs ELK auto-layout on ungrouped tables |
| `sf:fit-view` | none | Calls `fitView({ padding: 0.12, duration: 300 })` |
| `sf:zoom-preset` | `detail: 1–5` | Sets viewport zoom to 0.25/0.5/1/1.5/2× |
| `sf:focus-filter` | none | Focuses `.sidebar__filter` input |
| `sf:focus-table` | `detail: tableId` | Pans + zooms to a specific table node |
| `sf:bulk-delete` | none | Deletes all nodes in `selectedNodeIds.current` |

`sf:bulk-delete` uses a `useRef<string[]>` (not state) to track selected node IDs — avoids stale closure in the event listener.

## React Flow Configuration

| Prop | Value | Meaning |
|---|---|---|
| `connectionMode` | `'loose'` | Allows connecting source → source or target → target handles (any combination) |
| `snapToGrid` | `true` | Snap to `CANVAS_SNAP_GRID` (from constants, e.g. `[16, 16]`) |
| `minZoom` | `0.1` | Can zoom out to 10% |
| `maxZoom` | `4` | Can zoom in to 400% |
| `deleteKeyCode` | `null` | Disables React Flow's built-in delete key — handled by `useKeyboardShortcuts` |
| `multiSelectionKeyCode` | `'Shift'` | Shift+click for multi-select |
| `isValidConnection` | `conn.source !== conn.target` | Prevents self-referencing relationships |
| `proOptions` | `{ hideAttribution: true }` | Removes React Flow watermark |

## Pill Mode

```ts
const isPillMode = zoom < PILL_NODE_ZOOM_THRESHOLD;
// Adds className="table-node--pill" when zoomed out past threshold
```

At very low zoom levels, tables switch to a compact "pill" display mode. `PILL_NODE_ZOOM_THRESHOLD = 0.0` (disabled — see `constants.ts` docs).

## Canvas Toolbar (Bottom-Left Panel)

Four buttons rendered via React Flow `Panel`:
- **Note** — `handleAddNote()`
- **Group** — `handleAddGroup()`
- **⊞ Layout** — `handleAutoLayout()`
- **⤢ Fit** — `fitView()`

Note and Group buttons are `disabled={readOnly}`. Layout and Fit are always enabled.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **`livePositions` for edge routing** | Edges recalculate from live React Flow node state, not Zustand — fixes "edges disappear while dragging" bug |
| **`selectedNodeIds` ref for bulk delete** | `useRef<string[]>` prevents stale closure in the `sf:bulk-delete` event handler |
| **`sf:bulk-delete` calls `removeTable` on all types** | `ids.forEach(id => removeTable(id))` — this will silently no-op for note/group IDs since `removeTable` only matches table IDs |
| **Absolute position fallback chain** | `node.computed?.positionAbsolute || node.positionAbsolute || node.position` — three paths to handle React Flow API differences across versions |
| **`useUIStore() as any`** | Cast to `any` to access `showToast` and other properties not in the UI store's TypeScript interface |
| **Groups ordered first in nodes array** | `[...groups, ...tables, ...notes]` — ensures groups render before tables in the DOM (lower z-index) |

---

---

# `TableNode.tsx` — Component Documentation

> **Location:** `src/components/canvas/TableNode.tsx`

## File Overview

The **primary canvas node** — renders a single database table as a card. Manages inline table rename, accent color picker, field list (via `FieldRow`), add-field button, and delete. Receives table data via React Flow's `data` prop.

## Props

```tsx
// Standard React Flow NodeProps:
{ data: unknown, selected: boolean, ... }
// data is cast to: Table (TableNodeData)
```

## State

| State | Type | Purpose |
|---|---|---|
| `renamingName` | `string` | Current value of the inline rename input |
| `isRenaming` | `boolean` | Whether the header rename input is visible |
| `dragFromIndex` | `number \| null` | Source index for field drag-reorder |
| `dragOverIndex` | `number \| null` | Current hover target index during reorder |
| `accentOpen` | `boolean` | Whether the color picker popup is visible |

## Inline Table Rename

```tsx
// Triggered by double-click on header
const startRename = (e) => {
  setRenamingName(table.name);
  setIsRenaming(true);
  setTimeout(() => { nameInputRef.current?.focus(); nameInputRef.current?.select(); }, 0);
};

const commitRename = () => {
  if (trimmed && trimmed !== table.name) updateTable(table.id, { name: trimmed });
  setIsRenaming(false);
};
```

- `setTimeout(..., 0)` defers focus to after the input renders.
- `select()` highlights all text for immediate replacement.
- Empty or unchanged names are silently discarded (no update).

Keys: `Enter` → commit, `Escape` → cancel (sets `isRenaming: false` without saving).

## Accent Color Picker

```tsx
// Left vertical bar — click to toggle picker
<div className="table-node__accent-bar" style={{ background: accentHex }} onClick={togglePicker} />

// Picker popup
{accentOpen && (
  <div className="table-node__accent-picker">
    {ACCENT_COLORS.map(color => (
      <button className="accent-swatch" style={{ background: ACCENT_HEX[color] }}
              onClick={(e) => handleAccentPick(e, color)} />
    ))}
  </div>
)}
```

Clicking a swatch calls `updateTable(table.id, { accentColor: color })` and closes the picker. `e.stopPropagation()` throughout prevents the canvas pane click handler from firing.

## Field Drag-Reorder

```tsx
// Drag start (set in FieldRow via draggable span)
onDragStart={setDragFromIndex}

// Drag over (triggered per-field as cursor moves)
onDragOver={setDragOverIndex}

// Drop
const handleDrop = () => {
  if (dragFromIndex !== null && dragOverIndex !== null && dragFromIndex !== dragOverIndex) {
    reorderFields(table.id, dragFromIndex, dragOverIndex);
  }
  setDragFromIndex(null);
  setDragOverIndex(null);
};
```

Index state lives in `TableNode`, passed down to each `FieldRow`. Visual feedback (`isDragging`, `isDropTarget`) is derived from comparing row index to state values.

## Selection & Delete

- Clicking the node calls `setSelection({ type: 'table', tableId: table.id })`.
- Delete button (✕) only appears when **both** `!readOnly` AND `isSelected`.
- Delete calls `removeTable(table.id)` + `clearSelection()`.

## CSS Class Composition

```tsx
className={[
  'table-node',
  selected ? 'table-node--selected' : '',          // React Flow selection
  `density-${density}`,                             // compact / comfortable / spacious
  isRenaming ? 'table-node--renaming' : '',         // wider input state
].filter(Boolean).join(' ')}
```

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **`selected` vs `isSelected`** | `selected` is from React Flow (node frame); `isSelected` is from `useUIStore.selection` (right panel sync). Both can be true simultaneously but serve different purposes |
| **`data as unknown as TableNodeData`** | Double cast required because React Flow types `data` as `Record<string, unknown>` |
| **Accent picker has no close-on-outside-click** | `accentOpen` can only be closed by picking a color or clicking the bar again — no backdrop dismiss |
| **`e.stopPropagation()` everywhere** | Nearly every button click stops propagation to prevent the canvas or node click handlers from interfering |

---

---

# `FieldRow.tsx` — Component Documentation

> **Location:** `src/components/canvas/FieldRow.tsx`

## File Overview

Renders a **single field row** within a `TableNode`. Handles two modes: view (shows field name, type, PK/FK badges) and edit (inline name input + type `<select>`). Also hosts the React Flow `Handle` elements for relationship wires, and a drag handle for row reordering.

## Props

```tsx
interface FieldRowProps {
  tableId:      string;
  field:        Field;
  index:        number;
  totalFields:  number;
  onDragStart:  (index: number) => void;
  onDragOver:   (index: number) => void;
  onDrop:       () => void;
  isDragging:   boolean;
  isDropTarget: boolean;
  readOnly?:    boolean;
}
```

## State

| State | Type | Purpose |
|---|---|---|
| `localName` | `string` | Buffered name input value (not saved until `commitEdit`) |
| `localType` | `string` | Buffered type select value |

These local states prevent every keystroke from triggering a Zustand update (which would cause canvas re-renders on every character).

## Edit Lifecycle

```
startEdit() ← double-click on row
  → setLocalName(field.name)  // sync local with current value
  → setLocalType(field.type)
  → setEditingField(field.id) // global editingFieldId in UI store
  → setTimeout(nameRef.focus) // deferred focus after render

commitEdit() ← Enter / Tab / blur on input or select
  → updateField(tableId, field.id, { name, type }) // only if name not empty
  → setEditingField(null)

cancelEdit() ← Escape
  → setLocalName(field.name)  // reset to original
  → setLocalType(field.type)
  → setEditingField(null)
```

## React Flow Handles

```tsx
<Handle type="target" position={Position.Left}
  id={`${tableId}__${field.id}__left`}
  isConnectable={!readOnly && !isEditing} />

<Handle type="source" position={Position.Right}
  id={`${tableId}__${field.id}__right`}
  isConnectable={!readOnly && !isEditing} />
```

- **Every field** has both a left (target) and right (source) handle.
- Handle ID format: `"tableId__fieldId__side"` — parsed by `SchemaCanvas.onConnect` to extract field IDs.
- Handles are disabled while editing to prevent accidental edge creation during typing.
- `connectionMode='loose'` in the parent allows connecting any handle type → any handle type.

## Drag Reorder Handle

```tsx
{!readOnly && !isEditing && (
  <span className="field-drag-handle" draggable
        onDragStart={(e) => { e.stopPropagation(); onDragStart(index); }}>
    ⠿
  </span>
)}
```

- `e.stopPropagation()` prevents React Flow from treating the drag as a node move.
- Only the `⠿` glyph is draggable — clicking elsewhere on the row does not start a drag.

## View Mode Badge Display

```tsx
<span className="field-name">{field.name || <em>unnamed</em>}</span>
{!field.nullable && <span className="field-nullable-dot" title="NOT NULL">·</span>}
<span className="field-type mono">{field.type}</span>
<div className="field-badges">
  {field.isPK && <span className="badge badge--pk">PK</span>}
  {field.isFK && <span className="badge badge--fk">FK</span>}
</div>
{field.aiGenerated && <span className="ai-mark" title="AI generated">✦</span>}
```

- The `·` dot (NOT NULL indicator) is a subtle visual cue next to the field name.
- `field.aiGenerated` — a non-standard field property that shows a `✦` sparkle marker. This property is not declared in the core `Field` type (it's added by `applyAIOperations` at runtime).

## CSS Class Composition

```tsx
className={[
  'field-row',
  isEditing   ? 'field-row--editing'     : '',
  isSelected && !isEditing ? 'field-row--selected' : '',
  isDragging  ? 'field-row--dragging'    : '',
  isDropTarget? 'field-row--drop-target' : '',
].filter(Boolean).join(' ')}
```

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Local buffered state** | `localName`/`localType` decouple typing from store updates — prevents canvas re-renders on every keypress |
| **`totalFields` prop unused** | Declared in the interface but never referenced in the component body — dead prop |
| **`aiGenerated` not in `Field` type** | Shown with `✦` if present, but not part of the declared schema type |
| **Both `isEditing` and `isSelected` possible** | An editing field is also selected; CSS guards against double-applying styles |

---

---

# `RelationshipEdge.tsx` — Component Documentation

> **Location:** `src/components/canvas/RelationshipEdge.tsx`

## File Overview

Custom React Flow **edge component** rendering a Bezier curve between two field handles, styled with the source table's accent color. Includes a wide transparent hit-area for easy selection. Also exports `RelationshipMarkerDefs` — an invisible SVG containing crow's-foot marker definitions.

## Two SVG Paths Pattern

```tsx
{/* 1. Invisible 12px-wide hit-area for easier selection */}
<path d={edgePath} fill="none" stroke="transparent" strokeWidth={12} style={{ cursor: 'pointer' }} />

{/* 2. Visible styled edge */}
<path id={id} d={edgePath} fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
      strokeLinecap="round" markerEnd={markerEnd} markerStart={markerStart}
      style={{ transition: `stroke 200ms ease-out, stroke-width 200ms ease-out` }} />
```

The invisible path extends 12px around the visible 1.5px line — makes clicking edges much easier in the UI without visual change.

## Accent Color from Source Table

```ts
const sourceTableId = data?.sourceTableId as string;
const sourceTable   = tables.find(t => t.id === sourceTableId);
const accentHex     = sourceTable ? ACCENT_HEX[sourceTable.accentColor] : '#378ADD';
```

Edge color follows the source table's accent. Falls back to `#378ADD` (blue) if source table isn't found.

## Selection Style

```ts
const strokeColor = selected ? accentHex : `${accentHex}80`;  // 80 = 50% hex alpha
const strokeWidth = selected ? 2 : 1.5;
```

Unselected edges are semi-transparent and thinner. Selected edges animate to full opacity and slightly thicker (200ms ease-out transition).

## Crow's-Foot Markers (`RelationshipMarkerDefs`)

Renders zero-size SVG definitions for use as `markerEnd`/`markerStart` on edges:

| Marker ID | Shape | Used For |
|---|---|---|
| `crowsfoot-many` | Two diverging lines + a vertical bar | `one-to-many` and `many-to-many` relationships |
| `crowsfoot-one` | Two parallel vertical lines | `one-to-one` relationships |

```tsx
// Placed once in the canvas, outside ReactFlow
<RelationshipMarkerDefs />
```

The component is rendered as a `position: absolute; width: 0; height: 0` SVG — invisible itself but defines markers referenced by edge `markerEnd="url(#crowsfoot-many)"`.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Marker is always `crowsfoot-many` for non-`one-to-one`** | Many-to-many and one-to-many use the same visual marker — no visual distinction between these cardinalities |
| **`data?.sourceTableId` from edge `data` prop** | The source table ID must be passed via `data` because React Flow doesn't pass the Zustand relationship ID — it rebuilds edges from `relationshipToEdge()` each render |
| **Transition on stroke only** | Only visual properties animate — `d` (path shape) changes are instant |

---

---

# `NoteNode.tsx` — Component Documentation

> **Location:** `src/components/canvas/NoteNode.tsx`

## File Overview

A **resizable sticky note** custom node. Renders a colored textarea on the canvas that users can type into. Content is committed via `onBlur` (not on every keystroke) to avoid excessive Zustand/Yjs updates during typing.

## Color Theme Map

```ts
const NOTE_COLORS: Record<AccentColor, { bg, border, text }> = {
  blue:   { bg: '#e0f2fe', border: '#7dd3fc', text: '#0369a1' },
  teal:   { bg: '#ccfbf1', border: '#5eead4', text: '#0f766e' },
  coral:  { bg: '#ffedd5', border: '#fdba74', text: '#c2410c' },
  purple: { bg: '#f3e8ff', border: '#d8b4fe', text: '#7e22ce' },
  amber:  { bg: '#fef3c7', border: '#fcd34d', text: '#b45309' },
  green:  { bg: '#dcfce7', border: '#86efac', text: '#15803d' },
  pink:   { bg: '#fce7f3', border: '#f9a8d4', text: '#be185d' },
  gray:   { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' },
};
```

Light-mode color palette regardless of theme. Falls back to `NOTE_COLORS.amber` if an unknown color is provided.

## Commit-on-Blur Pattern

```ts
const [content, setContent] = useState(data.content ?? '');

useEffect(() => { setContent(data.content); }, [data.content]);

const handleBlur = () => {
  if (content !== data.content) {
    updateNote(id, { content });
  }
};
```

- Local `content` state: updates immediately on every keystroke → snappy UI.
- `handleBlur`: only calls `updateNote` on focus loss, and only if content actually changed → avoids flooding the Yjs collab store.
- `useEffect` syncs incoming remote changes (via Yjs) back into local state.

## Resize

```tsx
<NodeResizeControl minWidth={150} minHeight={100} color={theme.text}
  onResizeEnd={(_, params) => updateNote(id, { width: params.width, height: params.height })} />
```

React Flow's built-in resize handle. Only commits after resize ends (not during drag).

## Delete Button

```tsx
{!readOnly && selected && (
  <button className="note-node__delete" onClick={() => removeNote(id)}>
    <Trash2 size={14} />
  </button>
)}
```

Visible only when selected and in edit mode. No undo confirmation.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Light-mode only colors** | `NOTE_COLORS` uses light color values — may have poor contrast in dark mode |
| **`'yellow'` accentColor not in map** | `schema.ts` creates notes with `color: 'yellow'` but `NOTE_COLORS` has no `yellow` key — falls back to `amber` |
| **`data.content` sync via `useEffect`** | Required for collaborative editing — when remote changes arrive via Yjs + `importTables`, React Flow re-passes updated `data`, and the effect syncs it into local state |

---

---

# `GroupNode.tsx` — Component Documentation

> **Location:** `src/components/canvas/GroupNode.tsx`

## File Overview

A **resizable visual group container** for organizing tables. Renders as a semi-transparent colored rectangle with a labeled header bar. Tables can be dragged into groups (handled by `SchemaCanvas.onNodeDragStop`). The group itself is draggable from the header area.

## Accent Color Rendering

```ts
const baseColor = ACCENT_HEX[data.color as AccentColor] || ACCENT_HEX.gray;

style={{
  backgroundColor: `${baseColor}15`,  // 6% opacity (hex 15 = decimal 21)
  borderColor: selected ? baseColor : `${baseColor}60`,  // 37% opacity border
}}
```

Uses hex alpha suffixes for lightweight opacity without CSS filter effects.

> **Note:** `${baseColor}15` is **6.3% opacity** (hex 15 = 21/255), not 15%. The comment in the code says "15% opacity hex" which is incorrect.

## Inline Name Editing

```tsx
// Double-click header → setIsEditing(true)
// Blur or Enter → handleBlur → updateGroup if changed
const handleBlur = () => {
  setIsEditing(false);
  if (name !== data.name) updateGroup(id, { name });
};
```

Same commit-on-blur pattern as `NoteNode` for collaborative safety.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **`zIndex: -1` on group nodes** | Set in `groupToNode()` in `SchemaCanvas.tsx` — ensures groups always render behind table cards |
| **Tables assigned to groups by `SchemaCanvas`** | `GroupNode` itself doesn't handle table assignment — that's done via `onNodeDragStop` + `getIntersectingNodes` in `SchemaCanvas` |
| **Incorrect opacity comment** | `"15% opacity hex"` — hex `15` = decimal 21, which is ~8% opacity, not 15% |
| **`data = rawData as any`** | Bypasses React Flow's generic `NodeProps.data` typing |

---

---

# `MultiplayerCursors.tsx` — Component Documentation

> **Location:** `src/components/canvas/MultiplayerCursors.tsx`

## File Overview

Renders **floating cursor overlays** for all remote collaborators. Reads the `collaborators` array from `useYjsStore` and renders a custom SVG cursor + name label for each one with a non-null cursor position. Positions are in screen-space pixels (not canvas coordinates).

## Key Points

```tsx
const collaborators = useYjsStore(s => s.collaborators);

{collaborators.map(collab => {
  if (!collab.cursor) return null;  // Don't render if cursor is null
  return (
    <div className="mp-cursor"
         style={{ left: collab.cursor.x, top: collab.cursor.y, '--mp-color': collab.color }}>
      <svg ...><path d="M0 0L0 13L3.5..." /></svg>  {/* arrow cursor */}
      <span className="mp-cursor__label">{collab.name}</span>
    </div>
  );
})}
```

- `--mp-color` CSS custom property allows the cursor label and other elements to use the collaborator's color via CSS.
- The component renders in React's fragment (`<>`) — the parent must be positioned to hold absolute cursor elements.
- Reads-only from `yjsStore` — no write operations.

## Screen vs Canvas Coordinates

Cursors are positioned at **screen coordinates** (mouse position in pixels from top-left of viewport). This is intentional — cursor positions don't need to track with canvas pan/zoom since they represent where a user's mouse physically is on screen. Broadcasting is done via `broadcastCursor(e.clientX, e.clientY)` in `yjsStore`.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Screen-space positioning** | `left: cursor.x, top: cursor.y` — positions in viewport pixels, not canvas coordinates |
| **No animation / interpolation** | Cursor jumps instantly to each received position — no smooth interpolation between updates |
| **Self-exclusion in `yjsStore`** | Local user's cursor is already filtered out in `yjsStore` awareness update — this component doesn't need to filter |
| **Read-only users don't broadcast cursors** | Enforced in `yjsStore.broadcastCursor` — guests in read-only mode don't send cursor data |

---

---

# `EmptyState.tsx` — Component Documentation

> **Location:** `src/components/canvas/EmptyState.tsx`

## File Overview

A **welcome screen** rendered inside the canvas when `tables.length === 0`. Shown via React Flow's `Panel` component positioned at the center of the canvas. Displays instructional text and clickable template chips.

## Key Points

```tsx
<Panel position="top-center" style={{ top: '50%', transform: 'translate(-50%, -50%)' }}>
```

React Flow `Panel` is used to keep the element inside the React Flow coordinate system but overlaid on the canvas. The inline style centers it vertically/horizontally.

```tsx
const loadTemplate = (key: keyof typeof TEMPLATES) => {
  const t = TEMPLATES[key];
  importTables(t.tables, t.relationships);
};

{Object.keys(TEMPLATES).map(key => (
  <button className="template-chip" onClick={() => loadTemplate(key)}>
    {TEMPLATES[key].label}
  </button>
))}
```

- Each template chip calls `importTables` which **replaces the entire canvas state** — safe here since the canvas is empty.
- Uses `Object.keys(TEMPLATES)` — template order depends on object key insertion order.
- Conditionally rendered in `SchemaCanvas`: `{tables.length === 0 && <EmptyState />}`

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Replaced entirely by adding first table** | Once any table is added, `EmptyState` unmounts — it does not re-appear until all tables are deleted |
| **`Panel` position cannot be truly centered with `top-center`** | React Flow's `top-center` panel anchors to the top — the inline `style` override forces visual centering |
| **No `notes`/`groups` in template data** | `importTables` receives only `tables` and `relationships` from templates — notes and groups from TEMPLATES are ignored |

---

## Canvas Component Interaction Map

```
SchemaCanvas (ReactFlowProvider + CanvasInner)
│
├── RelationshipMarkerDefs    (SVG <defs> for crow's-foot arrows)
│
├── ReactFlow
│     ├── nodes (tableNode, noteNode, groupNode)
│     │     ├── TableNode ──── FieldRow (× many)
│     │     │                       └── Handle (left + right × each field)
│     │     ├── NoteNode
│     │     └── GroupNode
│     │
│     ├── edges (relationshipEdge)
│     │     └── RelationshipEdge
│     │
│     ├── Background (dots)
│     ├── MiniMap
│     ├── Controls (zoom buttons)
│     ├── Panel bottom-left (canvas toolbar: Note, Group, Layout, Fit)
│     └── EmptyState (when tables.length === 0)
│
└── MultiplayerCursors (overlay, outside ReactFlow)
```

---

*Generated documentation for Modellr — `src/components/canvas/`*
