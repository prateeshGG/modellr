# Stores — Documentation

> **Location:** `src/store/`  
> **Type:** Zustand State Stores — TypeScript  
> **Purpose:** Six modules that form the complete client-side state layer of Modellr — authentication, schema canvas data, UI ephemeral state, version history snapshots, real-time collaboration (Yjs/WebSockets), and the shared ID generator utility.

---

## Overview

| File | Store / Export | Purpose |
|---|---|---|
| `nanoid.ts` | `nanoid()` | Custom URL-safe ID generator (no external dep) |
| `authStore.ts` | `useAuthStore` | Supabase session management + profile auto-creation |
| `schema.ts` | `useSchemaStore` | Core canvas state (tables, fields, relationships, notes, groups) with zundo undo/redo |
| `ui.ts` | `useUIStore` | Ephemeral editor UI state (panels, selection, theme, toasts, dialogs) |
| `history.ts` | `useHistoryStore` | Named snapshot management — create, restore, delete point-in-time copies |
| `yjsStore.ts` | `useYjsStore` | Real-time collaboration via Yjs CRDT + WebSocket rooms |

---

---

# `nanoid.ts` — ID Generator

> **Location:** `src/store/nanoid.ts`

## File Overview

A **self-contained, dependency-free ID generator** using the Web Crypto API. Named `nanoid` to mirror the popular `nanoid` npm package, but implemented locally to avoid any external dependency and control the exact character set.

## Function — `nanoid(size?)`

```ts
export function nanoid(size = 12): string
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `size` | `number` | `12` | Length of the generated ID string |

**Returns:** A random alphanumeric string of length `size`.

**Alphabet:** `A-Z`, `a-z`, `0-9` — 62 characters total (no special chars, URL-safe).

## Implementation

```ts
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const bytes = crypto.getRandomValues(new Uint8Array(size));
for (let i = 0; i < size; i++) {
  id += chars[bytes[i] % chars.length];
}
```

- Uses `crypto.getRandomValues()` — **cryptographically secure** random source (not `Math.random()`).
- `bytes[i] % 62` maps each byte (0–255) to an index in the 62-char alphabet.
- Slight **modulo bias**: byte values 248–255 map to chars 0–7 with fractionally higher probability. For IDs (not security tokens) this bias is negligible.

## Collision Probability

At default size 12 with a 62-char alphabet: `62^12 = ~3.2 × 10^21` possible values. Collision probability for 1 million IDs ≈ `1.5 × 10^-10` (effectively zero for practical use).

## Usage Across the Codebase

Imported from `'../store/nanoid'` (not from the npm package). Used by:
- `schema.ts` — table IDs, field IDs, relationship IDs, note IDs, group IDs
- `history.ts` — snapshot IDs
- `templates.ts` — template clone IDs
- `importers/prisma.ts`, `importers/sql.ts` — imported entity IDs

## Caveats

| | Detail |
|---|---|
| **Browser-only** | `crypto.getRandomValues` is not available in Node.js without the `node:crypto` shim |
| **Modulo bias** | Minor statistical bias (negligible for non-cryptographic use) |
| **No collision checking** | IDs are assumed unique — no deduplication against existing state |

---

---

# `authStore.ts` — Authentication Store

> **Location:** `src/store/authStore.ts`

## File Overview

Manages the **Supabase authentication session** and user profile lifecycle. Exposes the current `session`, `user`, and `isLoading` state, with `initialize()` to bootstrap auth on app load and `signOut()` to clear the session. Also includes a **profile self-healing** method (`ensureProfile`) to handle cases where the DB trigger failed to create a profile row.

## Dependencies & Imports

```ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
```

## State Interface

```ts
interface AuthState {
  user:      User | null;
  session:   Session | null;
  isLoading: boolean;
  initialize: () => void;
  signOut:    () => Promise<void>;
}
```

> **Note:** `ensureProfile` is **not** declared in `AuthState` — it is stored in the Zustand state object at runtime but TypeScript doesn't know about it (accessed via `(get() as any).ensureProfile`). This is a type gap to be aware of.

## Initial State

| Field | Initial Value | Meaning |
|---|---|---|
| `user` | `null` | No user until `initialize()` completes |
| `session` | `null` | No session until `initialize()` completes |
| `isLoading` | `true` | App shows loading overlay until session is resolved |

## Actions

### `ensureProfile(user: User)` (undeclared in type)

**Lines:** 18–36

```ts
ensureProfile: async (user: User) => {
  const { data, error } = await supabase.from('users').select('id').eq('id', user.id).single();
  if (error || !data) {
    await supabase.from('users').insert({
      id: user.id,
      display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      avatar_url: user.user_metadata?.avatar_url || null,
    });
  }
}
```

**Purpose:** Fallback profile creation. The Supabase `handle_new_user` trigger creates profiles automatically on signup — but OAuth re-logins, edge cases, or trigger failures can leave users without a `public.users` row. This method is called on every session restore/auth change to self-heal.

**Display name priority:**
1. `user.user_metadata.full_name` (from OAuth provider e.g. Google)
2. Email prefix (e.g. `john` from `john@example.com`)
3. `'User'` (last resort)

---

### `initialize()`

**Lines:** 38–61

```ts
initialize: async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) await ensureProfile(session.user);
  set({ session, user: session?.user || null, isLoading: false });

  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    if (newSession?.user) await ensureProfile(newSession.user);
    set({ session: newSession, user: newSession?.user || null });
  });
}
```

**Two-phase initialization:**
1. **Immediate session restore** — calls `getSession()` to restore an existing session from cookies/localStorage. Sets `isLoading: false` so the app can render.
2. **Auth state listener** — registers `onAuthStateChange` to handle future login/logout/token refresh events. The listener persists for the app's lifetime.

Called once from `App.tsx`'s `useEffect` on mount.

---

### `signOut()`

```ts
signOut: async () => {
  await supabase.auth.signOut();
  set({ user: null, session: null });
}
```

Calls Supabase to invalidate the session server-side, then clears local state. The `onAuthStateChange` listener also fires after `signOut()` and will call `set` again — redundant but harmless.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **`ensureProfile` not in type** | Declared outside the `AuthState` interface. Accessed via `(get() as any).ensureProfile` — a known type gap |
| **`isLoading` not reset on error** | If `getSession()` throws, `isLoading` stays `true` forever — the app is stuck on the loading screen |
| **`onAuthStateChange` called in `initialize`** | The listener is registered inside `initialize()` and runs for the app's lifetime. Calling `initialize()` a second time would register a duplicate listener |
| **No `isLoading` on `signOut`** | `signOut()` doesn't set `isLoading: true` before the async call — there's a brief window where `session === null` but the UI may still show auth-gated content |

---

---

# `schema.ts` — Schema Store

> **Location:** `src/store/schema.ts`

## File Overview

The **central state store** for Modellr — holds all canvas content (tables, fields, relationships, notes, groups) and exposes a comprehensive action API. Wrapped with **zundo's `temporal` middleware** for full undo/redo history.

The store logic is intentionally separated into `createSchemaLogic` (a factory function) from the store creation with `temporal` wrapping — enabling reuse and testing.

## Dependencies & Imports

```ts
import { create } from 'zustand';
import { temporal } from 'zundo';
import { nanoid } from '../store/nanoid';
import { useUIStore } from './ui';
import type { Table, Field, Relationship, Dialect, AccentColor, Snapshot, Note, Group } from '../types/schema';
import { ACCENT_COLORS } from '../utils/constants';
```

## State Shape — `SchemaState`

```ts
interface SchemaState {
  tables:          Table[];
  relationships:   Relationship[];
  notes:           Note[];
  groups:          Group[];
  dialect:         Dialect;
  projectName:     string;
  isSaving:        boolean;
  lastSaved:       number | null;
  allowGuestEdits: boolean;
}
```

| Field | Initial Value | Description |
|---|---|---|
| `tables` | `[]` | All canvas table nodes |
| `relationships` | `[]` | All FK relationship edges |
| `notes` | `[]` | Canvas sticky note nodes |
| `groups` | `[]` | Canvas visual grouping boxes |
| `dialect` | `'postgres'` | Active SQL dialect for export |
| `projectName` | `'Untitled schema'` | Schema name (shown in header, saved to DB) |
| `isSaving` | `false` | Manual save-in-progress indicator |
| `lastSaved` | `null` | Unix timestamp of last confirmed cloud save |
| `allowGuestEdits` | `false` | Whether guest collaborators can edit (shared view) |

## Actions Reference

### Global / Config

| Action | Signature | Description |
|---|---|---|
| `setProjectName` | `(name: string) => void` | Updates the project name |
| `setDialect` | `(dialect: Dialect) => void` | Switches the active SQL dialect |
| `setAllowGuestEdits` | `(allow: boolean) => void` | Toggles guest edit permission for shared views |

### Table Actions

| Action | Signature | Description |
|---|---|---|
| `addTable` | `(position) => string` | Creates a new table with a default `id` PK field at given position; returns table ID |
| `removeTable` | `(id: string) => void` | Removes table AND all its associated relationships |
| `updateTable` | `(id, patch) => void` | Partial update (name, accentColor, etc.) |
| `moveTable` | `(id, position) => void` | Updates canvas position only |

**Default new table:**
```ts
{
  id: nanoid(),
  name: 'new_table',
  accentColor: nextAccentColor(s.tables),  // cycling from palette
  position: { x, y },
  fields: [{
    id: nanoid(), name: 'id', type: 'bigserial',
    nullable: false, unique: true, isPK: true, isFK: false
  }]
}
```

### Field Actions

| Action | Signature | Description |
|---|---|---|
| `addField` | `(tableId) => string` | Appends an empty field to a table; returns field ID |
| `removeField` | `(tableId, fieldId) => void` | Removes field AND any relationships referencing it |
| `updateField` | `(tableId, fieldId, patch) => void` | Partial field update |
| `reorderFields` | `(tableId, fromIndex, toIndex) => void` | Drag-and-drop reorder using splice |

**Default new field:**
```ts
{ id: nanoid(), name: '', type: 'text', nullable: true, unique: false, isPK: false, isFK: false }
```

### Relationship Actions

| Action | Signature | Description |
|---|---|---|
| `addRelationship` | `(rel: Omit<Relationship, 'id'>) => string` | Creates a new relationship; returns ID |
| `removeRelationship` | `(id: string) => void` | Removes by ID |
| `updateRelationship` | `(id, patch) => void` | Partial update (cardinality, etc.) |

### Note Actions

| Action | Signature | Description |
|---|---|---|
| `addNote` | `(position) => string` | Creates sticky note (200×150, yellow, empty content) |
| `removeNote` | `(id: string) => void` | Removes note |
| `updateNote` | `(id, patch) => void` | Update content, color, size, position |

### Group Actions

| Action | Signature | Description |
|---|---|---|
| `addGroup` | `(position) => string` | Creates a group box (300×300, gray) |
| `removeGroup` | `(id: string) => void` | Removes group AND unassigns any tables with `groupId` |
| `updateGroup` | `(id, patch) => void` | Update name, color, size, position |

> When a group is removed, all tables with `table.groupId === id` have their `groupId` set to `undefined` — no orphaned group references.

### Bulk / Lifecycle Actions

| Action | Description |
|---|---|
| `importTables(tables, rels, notes?, groups?, allowGuestEdits?)` | Replaces the entire canvas state — used by cloud load, templates, importers |
| `loadSnapshot(snapshot)` | Replaces state with snapshot data (tables, rels, notes, groups) |
| `setSaving(boolean)` | Manual save indicator |
| `setLastSaved(timestamp)` | Records cloud save timestamp |

### `applyAIOperations(ops: any[])`

**Lines:** 308–380

Applies a sequence of AI-generated schema operations atomically in a single `set()` call:

| Operation `action` | Fields Used | Behaviour |
|---|---|---|
| `add_table` | `tableName`, `newFields[]` | Adds table if name doesn't exist; assigns grid x position |
| `remove_table` | `tableName` | Removes table + associated relationships by name |
| `add_field` | `tableName`, `newFields[0]` | Appends field if name doesn't exist in table |
| `remove_field` | `tableName`, `fieldName` | Removes field by name |
| `modify_field` | `tableName`, `fieldName`, `fieldUpdates` | Merges `fieldUpdates` onto matching field |
| `add_relationship` | `tableName`, `fieldName`, `relationTargetTable`, `relationTargetField`, `relationCardinality` | Looks up all by name, creates relationship |

Operations are applied **in order** against a mutable working copy (`currentTables`, `currentRelationships`). The final result replaces the store state in a single commit — captured as one undo step.

## Read-Only Guard

Every mutating action checks `useUIStore.getState().readOnly` at the start:

```ts
addTable: (position) => {
  if (useUIStore.getState().readOnly) return '';
  // ...
}
```

This is the **application-level enforcement** of read-only mode (e.g. for shared/guest viewers). All write operations silently no-op if `readOnly === true`.

## zundo Temporal Middleware

```ts
export const useSchemaStore = create<SchemaStore>()(
  temporal(createSchemaLogic, {
    limit: 50,
    partialize: (state) => ({
      tables:        state.tables,
      relationships: state.relationships,
      notes:         state.notes,
      groups:        state.groups,
    }),
  })
);
```

| Config | Value | Meaning |
|---|---|---|
| `limit` | `50` | Maximum undo steps (matches `MAX_UNDO_STEPS` constant) |
| `partialize` | tables + rels + notes + groups | Only these 4 arrays are tracked in history |

**Not tracked in undo history:** `dialect`, `projectName`, `isSaving`, `lastSaved`, `allowGuestEdits` — these are live preferences, not canvas content.

## `createSchemaLogic` — Separation of Concerns

The store logic is separated from the `create()` call:

```ts
export const createSchemaLogic = (set, _get): SchemaStore => ({ ... });
export const useSchemaStore    = create<SchemaStore>()(temporal(createSchemaLogic, ...));
```

This pattern enables the logic to be tested independently of the `temporal` wrapper.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Cascading deletes** | `removeTable` cascades to relationships; `removeField` cascades to relationships; `removeGroup` unassigns tables |
| **Name-based AI operations** | `applyAIOperations` matches tables/fields by **name** — renaming a table/field between AI generation and application will break the operation |
| **`accentColor: 'yellow'` for notes** | `'yellow'` is not in `ACCENT_COLORS` array — it's hardcoded. If `Note.color` uses the `AccentColor` type, this may cause a type error at the call site |
| **`importTables` replaces everything** | Calling `importTables([], [])` is used to reset the canvas — but it's the same function as loading new data. No distinction between "clear" and "load" |
| **`isSaving` never set to `true` internally** | `setSaving(true)` is called by the save UI, but the auto-save in `useCloudPersistence` never sets `isSaving` — it's a disconnect |

---

---

# `ui.ts` — UI Store

> **Location:** `src/store/ui.ts`

## File Overview

Manages all **ephemeral editor UI state** — things that don't belong in the schema store but control how the editor looks and behaves. Includes panel visibility, selection state, theme, density, toast notifications, modal dialogs, read-only mode, and diff mode.

## Dependencies & Imports

```ts
import { create } from 'zustand';
import type { AppMode, Theme, Density, SelectionTarget } from '../types/schema';
```

## State Shape — `UIState`

| Field | Type | Default | Description |
|---|---|---|---|
| `mode` | `AppMode` | `'canvas'` | Current editor mode (canvas, etc.) |
| `theme` | `Theme` | localStorage or `'dark'` | Visual theme — persisted to `localStorage` |
| `density` | `Density` | localStorage or `'comfortable'` | Node density — persisted to `localStorage` |
| `sidebarOpen` | `boolean` | `true` | Left sidebar visibility |
| `rightPanelOpen` | `boolean` | `false` | Right properties panel visibility |
| `paletteOpen` | `boolean` | `false` | Command palette overlay state |
| `selection` | `SelectionTarget` | `null` | Currently selected canvas item |
| `editingFieldId` | `string \| null` | `null` | Field currently in inline edit mode |
| `zoom` | `number` | `1` | Canvas zoom level (1 = 100%) |
| `diffMode` | `boolean` | `false` | Whether diff overlay is active |
| `diffSnapshotId` | `string \| null` | `null` | ID of snapshot being compared |
| `toastMessage` | `string \| null` | `null` | Active toast notification message |
| `toastType` | `'success' \| 'error' \| 'info'` | `'success'` | Toast severity/color |
| `readOnly` | `boolean` | `false` | Global read-only lock for all schema mutations |
| `dialogConfig` | `object \| null` | `null` | Imperative dialog state |

## localStorage Persistence

```ts
const savedTheme   = (typeof localStorage !== 'undefined' ? localStorage.getItem('sf-theme')   : 'dark')   as Theme   ?? 'dark';
const savedDensity = (typeof localStorage !== 'undefined' ? localStorage.getItem('sf-density') : 'comfortable') as Density ?? 'comfortable';
```

Theme and density are restored from localStorage on store creation. The `typeof localStorage !== 'undefined'` guard handles SSR environments (though this app is CSR-only).

## Actions Reference

### Theme & Display

| Action | Description |
|---|---|
| `toggleTheme()` | Switches between `'dark'` and `'light'`; writes to `data-theme` attribute + localStorage |
| `setTheme(theme)` | Sets theme directly; writes to `data-theme` attribute + localStorage |
| `setDensity(density)` | Sets node density; persists to localStorage |
| `setMode(mode)` | Switches app mode |
| `setZoom(zoom)` | Updates canvas zoom level |

### Panel Visibility

| Action | Description |
|---|---|
| `toggleSidebar()` | Flips `sidebarOpen` |
| `setSidebarOpen(open)` | Sets directly |
| `toggleRightPanel()` | Flips `rightPanelOpen` |
| `setRightPanelOpen(open)` | Sets directly |
| `openPalette()` / `closePalette()` | Command palette visibility |

### Selection

| Action | Description |
|---|---|
| `setSelection(target)` | Sets selected item; **also opens right panel** if target is non-null |
| `clearSelection()` | Clears selection; **also closes right panel** |
| `setEditingField(fieldId \| null)` | Tracks which field has active inline editor |

> `setSelection` and `clearSelection` implicitly drive `rightPanelOpen` — selecting something always opens the properties panel, deselecting closes it.

### Toast Notifications

```ts
showToast: (message, type = 'success') => {
  set({ toastMessage: message, toastType: type });
  setTimeout(() => get().clearToast(), 2200);
}
```

Auto-dismisses after 2.2 seconds via `setTimeout`. No manual dismiss is exposed. Calling `showToast` while one is active replaces it.

### Diff Mode

```ts
enterDiffMode: (snapshotId) => set({ diffMode: true, diffSnapshotId: snapshotId }),
exitDiffMode:  ()           => set({ diffMode: false, diffSnapshotId: null }),
```

Activates a visual overlay comparing the current canvas to a historical snapshot.

### Read-Only

```ts
setReadOnly: (readOnly) => set({ readOnly }),
```

When `readOnly = true`, all `useSchemaStore` mutating actions silently no-op (they check this at the start of every write action).

### Dialog System

```ts
showDialog: (config) => set({ dialogConfig: { ...config, isOpen: true } }),
closeDialog: () => set({ dialogConfig: null }),
```

Drives a global `DialogModal` component (always mounted in `App.tsx`). Supports both `'alert'` and `'confirm'` types:

```ts
dialogConfig: {
  isOpen:    boolean;
  title:     string;
  message:   string;
  type:      'alert' | 'confirm';
  onConfirm?: () => void;  // Only meaningful for 'confirm'
}
```

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **`setSelection` auto-opens right panel** | Side effect coupling — selecting a node always opens the properties panel. Intentional UX behavior |
| **Toast auto-dismiss via `setTimeout`** | If `showToast` is called rapidly, multiple `setTimeout` callbacks queue up — only the last message is displayed but all timeouts will call `clearToast`, clearing the last valid toast prematurely |
| **`readOnly` not persisted** | Lost on page refresh — always starts as `false`. Share link readers have `setReadOnly(true)` called on mount |
| **Theme written to `document.documentElement`** | `document.documentElement.setAttribute('data-theme', ...)` — CSS relies on `[data-theme="dark"]` selectors. This is a side effect in a Zustand setter |

---

---

# `history.ts` — History / Snapshot Store

> **Location:** `src/store/history.ts`

## File Overview

Manages **named schema snapshots** — user-triggered, labeled point-in-time copies of the canvas state. Distinct from zundo's automatic undo/redo history: snapshots are explicit, named, and persistent within a session (though not saved to the DB automatically).

## Dependencies & Imports

```ts
import { create } from 'zustand';
import { nanoid } from '../store/nanoid';
import { useSchemaStore } from './schema';
import type { Snapshot } from '../types/schema';
```

## Type — `Snapshot`

```ts
// From '../types/schema':
interface Snapshot {
  id:            string;
  label:         string;
  timestamp:     number;
  tables:        Table[];
  relationships: Relationship[];
  notes?:        Note[];
  groups?:       Group[];
}
```

## State & Actions

```ts
interface HistoryState {
  snapshots: Snapshot[];
}

interface HistoryActions {
  createSnapshot:  (label?: string) => void;
  deleteSnapshot:  (id: string)     => void;
  restoreSnapshot: (id: string)     => void;
}
```

## Actions Detail

### `createSnapshot(label?)`

```ts
createSnapshot: (label) => {
  const { tables, relationships } = useSchemaStore.getState();
  const id = nanoid();
  const autoLabel = label ?? `Snapshot at ${new Date().toLocaleTimeString()}`;
  const snapshot = {
    id,
    label: autoLabel,
    timestamp: Date.now(),
    tables:        JSON.parse(JSON.stringify(tables)),        // deep clone
    relationships: JSON.parse(JSON.stringify(relationships)), // deep clone
  };
  set((s) => ({ snapshots: [snapshot, ...s.snapshots].slice(0, 50) }));
}
```

**Key behaviours:**
- **Deep clone via `JSON.parse(JSON.stringify(...))`** — ensures the snapshot is a frozen point-in-time copy, not a reference to the live state.
- **Prepends** to the array (newest first) then **slices to 50** — enforces the `MAX_SNAPSHOTS` limit.
- **Auto-label** format: `"Snapshot at 3:45:22 PM"` using locale time if no label is provided.
- **Does not capture `notes` or `groups`** — only `tables` and `relationships`. This is a known data gap.

---

### `deleteSnapshot(id)`

```ts
deleteSnapshot: (id) => set((s) => ({ snapshots: s.snapshots.filter((snap) => snap.id !== id) }))
```

Simple filter by ID. No confirmation — the caller (UI confirmation dialog) handles that.

---

### `restoreSnapshot(id)`

```ts
restoreSnapshot: (id) => {
  const snapshot = get().snapshots.find((s) => s.id === id);
  if (!snapshot) return;
  useSchemaStore.getState().loadSnapshot(snapshot);
}
```

Calls `useSchemaStore.loadSnapshot()` which replaces the live canvas state with the snapshot's `tables` and `relationships`. This is also recorded as a single undo step by zundo.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **In-memory only** | Snapshots exist only in the Zustand store — they are lost on page refresh. Not persisted to Supabase unless explicitly handled elsewhere |
| **`notes` and `groups` not captured** | `createSnapshot` only saves `tables` and `relationships`. Notes and groups are silently absent from any restored snapshot |
| **`createSnapshot` return value** | `createSnapshot` calls `return id` but the function return type is `void` in the interface — callers cannot access the returned ID via the typed API |
| **50-snapshot cap** | `slice(0, 50)` is applied at creation — oldest snapshots are dropped automatically |
| **Deep clone cost** | `JSON.parse(JSON.stringify(...))` is the simplest deep clone but can be slow for schemas with very many tables. Structurally cloned alternatives (e.g. `structuredClone`) would be faster |

---

---

# `yjsStore.ts` — Real-Time Collaboration Store

> **Location:** `src/store/yjsStore.ts`

## File Overview

Manages **real-time collaborative editing** using Yjs (CRDT) + `y-websocket`. Provides a Zustand store for room connection state and collaborator presence, plus synchronization logic between Zustand's schema store and a shared Yjs document.

**Data flow:**
```
Local edits (Zustand schema store)
         ↓  useSchemaStore.subscribe → JSON.stringify → doc.transact()
         ↓
    Yjs Y.Doc ("schema" map)
         ↓  WebsocketProvider
         ↓
    Hocuspocus WebSocket Server (backend)
         ↓
    Other clients' Y.Doc
         ↓  ySchema.observe (remote only)
         ↓  JSON.parse → importTables()
Remote schema applied (Zustand schema store)
```

## Dependencies & Imports

```ts
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';  // @ts-ignore
import { create } from 'zustand';
import { useSchemaStore } from './schema';
import { useAuthStore } from './authStore';
import { useUIStore } from './ui';
```

## Constants

```ts
const HTTP_API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WS_BASE  = HTTP_API.replace(/^http/, 'ws');  // https → wss, http → ws
```

WebSocket URL is derived from the HTTP API URL — correct for both `http://` (local) and `https://` (production with SSL).

## ID & URL Helpers

| Export | Signature | Description |
|---|---|---|
| `getRoomFromURL()` | `() => string \| null` | Reads `?room=` query param |
| `setRoomInURL()` | `() => void` | No-op — navigation handled by React Router |
| `buildShareURL(roomId)` | `(string) => string` | Builds `origin/app/roomId` share URL |
| `clearRoomFromURL()` | `() => void` | No-op — navigation handled by React Router |
| `generateRoomId()` | `() => string` | 7-char alphanumeric random ID |

```ts
generateRoomId(): return Math.random().toString(36).slice(2, 9);
```

## Exported Types

### `Collaborator`

```ts
export interface Collaborator {
  clientId: number;
  name:     string;
  color:    string;
  cursor:   { x: number; y: number } | null;
}
```

## State Shape

```ts
interface YjsState {
  roomId:           string | null;
  connected:        boolean;
  collaborators:    Collaborator[];
  doc:              Y.Doc | null;
  provider:         WebsocketProvider | null;
  isApplyingRemote: boolean;
}
```

| Field | Description |
|---|---|
| `roomId` | Current collaboration room ID (matches schema UUID) |
| `connected` | Whether the WebSocket is currently connected |
| `collaborators` | All remote peers (excluding self) with name, color, cursor |
| `doc` | The active `Y.Doc` CRDT document |
| `provider` | The `WebsocketProvider` instance |
| `isApplyingRemote` | Flag to prevent re-broadcasting incoming remote changes |

## `joinRoom(roomId)` — Core Logic

**Lines:** 110–241

### 1. Cleanup Previous Session

```ts
if (existing.provider) {
  existing.provider._schemaUnsub?.();   // Unsubscribe Zustand → Yjs
  existing.provider.disconnect();
  existing.provider.destroy();
}
if (existing.doc) existing.doc.destroy();
```

### 2. Create Doc + Provider

```ts
const doc = new Y.Doc();
const provider = new WebsocketProvider(WS_BASE, roomId, doc, { connect: true });
```

### 3. Awareness — Advertise Self

```ts
provider.awareness.setLocalStateField('user', {
  name:   localUser.name,
  color:  localUser.color,
  cursor: null,
});
```

### 4. Awareness — Listen for Peers

```ts
provider.awareness.on('change', () => {
  const states = provider.awareness.getStates();
  const collabs = [...states.entries()]
    .filter(([id]) => id !== doc.clientID)   // exclude self
    .map(([id, state]) => ({ clientId: id, name, color, cursor }));
  set({ collaborators: collabs });
});
```

### 5. Yjs → Zustand (Inbound)

```ts
const ySchema = doc.getMap<string>('schema');
ySchema.observe((event) => {
  if (event.transaction.local) return;  // Skip self-originated transactions
  if (get().isApplyingRemote) return;   // Skip if already applying

  get().setApplyingRemote(true);
  try {
    const tables = JSON.parse(ySchema.get('tables'));
    const rels   = JSON.parse(ySchema.get('relationships') || '[]');
    useSchemaStore.getState().importTables(tables, rels, notes, groups, allowGuestEdits);
  } finally {
    get().setApplyingRemote(false);
  }
});
```

### 6. Zustand → Yjs (Outbound)

```ts
const unsub = useSchemaStore.subscribe((state) => {
  if (get().isApplyingRemote) return;      // Don't echo incoming changes back out
  if (useUIStore.getState().readOnly) return; // ZERO-TRUST: block guest broadcasts

  // Only broadcast if something actually changed (JSON comparison)
  if (tablesJson === lastTablesJson && ...) return;

  doc.transact(() => {
    ySchemaMap.set('tables',        tablesJson);
    ySchemaMap.set('relationships', relsJson);
    ySchemaMap.set('notes',         notesJson);
    ySchemaMap.set('groups',        groupsJson);
    ySchemaMap.set('allowGuestEdits', allowGuestEditsJson);
  });
});
```

**Change detection via JSON string comparison** — avoids broadcasting on every Zustand update by comparing serialized strings before writing to the Yjs document.

### 7. Initial Schema Seed

```ts
if (tables.length > 0) {
  doc.transact(() => {
    ySchema.set('tables', JSON.stringify(tables));
    // ...
  });
}
```

When joining, if the local user already has a schema loaded, they seed the Yjs doc immediately — so late-joining collaborators receive the current state.

## Security — Zero-Trust Guest Broadcast Block

**Line 194:**
```ts
// CRITICAL ZERO-TRUST PATCH
if (useUIStore.getState().readOnly) return;
```

Even if a guest bypasses the UI (e.g. via browser DevTools), their local schema mutations will not propagate to the Yjs document because this check runs **in the raw Zustand subscriber** — not in a UI component. Read-only guests physically cannot broadcast structural changes.

## `leaveRoom()`

```ts
leaveRoom: (clearUrl = true) => {
  provider._schemaUnsub?.();
  provider.disconnect();
  provider.destroy();
  doc.destroy();
  set({ roomId: null, connected: false, collaborators: [], doc: null, provider: null });
}
```

Full cleanup: unsubscribes Zustand listener, closes WebSocket, destroys Yjs doc, resets state.

## `broadcastCursor(x, y)` / `clearCursor()`

Updates the local awareness state's `cursor` field — peers see cursor positions in real time. Read-only guests don't broadcast cursor positions (per comment: "Prevent View-Only guests from distracting the Host with their cursor").

## `getLocalUser()` — User Identity Resolution

```ts
function getLocalUser(): { name: string; color: string }
```

**Name resolution priority:**
1. Auth user's `full_name` from OAuth metadata
2. Auth user's email prefix
3. Stored name from `localStorage['sf-user-name']`
4. Randomly generated `Guest XXXX` (saved to localStorage for persistence)

**Color:** Randomly assigned from `COLLAB_COLORS` array on first use; stored in `localStorage['sf-user-color']`.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **JSON serialization as CRDT value** | The entire schema is stored as a single JSON string per field in the Yjs map — not as fine-grained Yjs types. This means concurrent edits from two users are resolved by **last-write-wins**, not field-level CRDT merges |
| **`@ts-ignore` on `y-websocket` import** | The package lacks TypeScript types — suppressed with `@ts-ignore` |
| **`generateRoomId` entropy** | `Math.random().toString(36).slice(2, 9)` produces ~7 chars of base-36. Entropy ≈ `36^7 ≈ 78 billion` possibilities. Low-security but sufficient for ephemeral room IDs |
| **`_schemaUnsub` stored on provider** | The Zustand unsubscribe function is stored as `provider._schemaUnsub` — an unconventional side-channel. If the provider is replaced without calling `leaveRoom`, the unsub is lost |
| **Connection status polling** | `connected` state tracks WebSocket connection via `provider.on('status', ...)` — not reconnection logic |
| **Collaborative edits bypass zundo** | `importTables()` replaces state without a new undo snapshot (zundo does track it, but rapid remote changes create many undo steps) |

---

## Store Architecture Diagram

```
                         ┌─────────────────┐
                         │   nanoid.ts     │
                         │  (ID generator) │
                         └────────┬────────┘
                                  │ used by
              ┌───────────────────┼──────────────────┐
              ▼                   ▼                   ▼
    ┌──────────────────┐  ┌──────────────┐  ┌────────────────┐
    │   authStore.ts   │  │  schema.ts   │  │   history.ts   │
    │  (session/user)  │  │ (canvas data)│  │  (snapshots)   │
    └──────────────────┘  └──────┬───────┘  └────────────────┘
              │                  │ subscribe       ▲
              │ used by          │ importTables    │ reads from
              ▼                  ▼                 │
    ┌──────────────────┐  ┌──────────────┐         │
    │   yjsStore.ts    │─▶│   ui.ts      │         │
    │ (collab / Yjs)   │  │ (UI state)   │─────────┘
    └──────────────────┘  └──────────────┘
                reads readOnly from ui.ts
```

## Quick Comparison

| | `schema.ts` | `ui.ts` | `history.ts` | `authStore.ts` | `yjsStore.ts` |
|---|---|---|---|---|---|
| **Persisted to DB** | ✅ (via `useCloudPersistence`) | ❌ (theme/density → localStorage) | ❌ | ❌ (Supabase auth) | ❌ |
| **Undo/Redo** | ✅ (zundo) | ❌ | ❌ | ❌ | ❌ |
| **Synced via Yjs** | ✅ (subscriber) | ❌ | ❌ | ❌ | N/A |
| **Read-only guard** | ✅ (all mutators) | ❌ | ❌ | ❌ | ✅ (broadcast block) |
| **localStorage** | ❌ | ✅ (theme + density) | ❌ | ❌ | ✅ (user name + color) |

---

*Generated documentation for Modellr — `src/store/`*
