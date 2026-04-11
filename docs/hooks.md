# Custom Hooks — Documentation

> **Location:** `src/hooks/`  
> **Type:** React Custom Hooks — TypeScript  
> **Purpose:** Five custom hooks that encapsulate complex, reusable behavior — undo/redo history, share link encoding/decoding, global keyboard shortcuts, Supabase cloud persistence, and AI-powered schema intelligence.

---

## Overview

| Hook | File | Purpose |
|---|---|---|
| `useUndoRedo` | `useUndoRedo.ts` | Exposes zundo temporal state (undo/redo/clear) from the schema store |
| `useShareLink` | `useShareLink.ts` | Encodes the schema to a URL hash for stateless sharing; decodes on load |
| `useKeyboardShortcuts` | `useKeyboardShortcuts.ts` | Registers global `keydown` handlers for editor actions |
| `useCloudPersistence` | `useCloudPersistence.ts` | Loads/saves schema to Supabase with debounced auto-save |
| `useAI` (3 exports) | `useAI.ts` | Streaming AI field suggestions, field descriptions, and schema generation |

---

---

# `useUndoRedo` — Hook Documentation

> **Location:** `src/hooks/useUndoRedo.ts`

## File Overview

Provides a React-friendly interface to the **zundo temporal store** attached to `useSchemaStore`. zundo v2 stores undo/redo history on a `.temporal` property of the Zustand store — but this is a vanilla Zustand store, not a React store. `useUndoRedo` bridges this gap using `useSyncExternalStore` to correctly subscribe to the non-React store.

## Dependencies & Imports

```ts
import { useSyncExternalStore, useCallback } from 'react';
import { useSchemaStore } from '../store/schema';
```

| Import | Role |
|---|---|
| `useSyncExternalStore` | React 18 hook for subscribing to external (non-React) stores with proper tear handling |
| `useCallback` | Memoizes the `undo`, `redo`, `clear` function references |
| `useSchemaStore` | The main Zustand schema store — zundo attaches `.temporal` to it |

## Type Definitions

### `TemporalState`

```ts
type TemporalState = {
  pastStates:   unknown[];
  futureStates: unknown[];
  undo:  (steps?: number) => void;
  redo:  (steps?: number) => void;
  clear: ()               => void;
};
```

Represents the zundo temporal store's state shape. `pastStates` and `futureStates` are arrays of full schema snapshots.

## Internal Helper — `getTemporalStore()`

```ts
function getTemporalStore() {
  return (useSchemaStore as any).temporal as {
    getState:  () => TemporalState;
    subscribe: (listener: () => void) => () => void;
  };
}
```

Accesses `useSchemaStore.temporal` — the vanilla Zustand store that zundo creates. Cast to `any` is necessary since the TypeScript type of `useSchemaStore` doesn't expose `.temporal`. Returns a standard `{ getState, subscribe }` vanilla store interface.

## Exported Hook — `useUndoRedo()`

**Signature:**
```ts
export function useUndoRedo(): {
  undo:        () => void;
  redo:        () => void;
  clear:       () => void;
  canUndo:     boolean;
  canRedo:     boolean;
  pastCount:   number;
  futureCount: number;
}
```

### Return Values

| Value | Type | Description |
|---|---|---|
| `undo` | `() => void` | Reverts the last schema change |
| `redo` | `() => void` | Re-applies the last undone change |
| `clear` | `() => void` | Clears all undo/redo history |
| `canUndo` | `boolean` | `true` if there are past states to revert to |
| `canRedo` | `boolean` | `true` if there are future states to re-apply |
| `pastCount` | `number` | Number of undo steps available |
| `futureCount` | `number` | Number of redo steps available |

### `useSyncExternalStore` for Reactive Counts

```ts
const pastCount = useSyncExternalStore(
  temporal.subscribe,
  () => temporal.getState().pastStates.length
);
```

- **`subscribe`** — tells React when to re-check the value (when zundo's store changes).
- **Snapshot fn** — returns the current count (used for rendering + `canUndo`/`canRedo` derivation).
- React re-renders the consuming component whenever the temporal store changes (push-based reactivity).

### `useCallback` on Actions

```ts
const undo  = useCallback(() => temporal.getState().undo(),  [temporal]);
const redo  = useCallback(() => temporal.getState().redo(),  [temporal]);
const clear = useCallback(() => temporal.getState().clear(), [temporal]);
```

Functions are stable references — safe to pass as dependency to `useKeyboardShortcuts` or `useEffect`.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **`as any` cast required** | zundo doesn't ship TypeScript types for `.temporal` on Zustand stores |
| **`useSyncExternalStore` vs `useState`** | Using `useState` with `subscribe` would cause stale closure bugs in concurrent mode — `useSyncExternalStore` is the correct React 18 pattern |
| **Steps param not exposed** | `undo(steps)` allows multi-step undo in zundo — the hook wraps with no-arg calls only |
| **`clear()` use case** | Typically called when a new schema is loaded to prevent accidental undo back into the previous schema |

---

---

# `useShareLink` — Hook Documentation

> **Location:** `src/hooks/useShareLink.ts`

## File Overview

Implements **stateless schema sharing** — the entire schema is encoded into a URL hash using LZ-string compression, allowing users to share a link without any backend or database involvement. The recipient's browser decodes and loads the schema from the URL itself.

**Encoding format:**
```
https://schemaforge.dev/app/shared#/schema/<LZString_compressed_base64url>
```

The hook handles **both directions**:
1. **Decode on mount** — if the current URL contains a `#/schema/...` hash, decode and load the schema.
2. **Encode on demand** — `copyShareLink()` compresses the current schema and copies the URL to clipboard.

## Dependencies & Imports

```ts
import { useEffect, useCallback } from 'react';
import LZString from 'lz-string';
import { useSchemaStore } from '../store/schema';
import { useUIStore } from '../store/ui';
```

| Import | Role |
|---|---|
| `LZString` | LZ_string compression library — reduces schema JSON size by ~60-70% |
| `useSchemaStore` | Source of `tables`, `relationships`, `notes`, `groups`, `projectName` |
| `useUIStore` | Provides `showToast` for user feedback and `setReadOnly` for view-only mode |

## Constants

```ts
const PREFIX = '#/schema/';
```

The fixed hash prefix that identifies a share link. Any hash not starting with this is ignored.

## Encoding & Decoding

```ts
function encode(data: unknown): string {
  const json = JSON.stringify(data);
  return LZString.compressToEncodedURIComponent(json);
}

function decode(b64: string): unknown {
  const json = LZString.decompressFromEncodedURIComponent(b64);
  return json ? JSON.parse(json) : null;
}
```

- **`compressToEncodedURIComponent`** — compresses to a URL-safe Base64 string (no `+`, `/`, `=` that would break URLs).
- **`decompressFromEncodedURIComponent`** — reverse operation; returns `null` on invalid input.
- The payload is the full schema object `{ tables, relationships, notes, groups, projectName }`.

## Exported Hook — `useShareLink()`

**Signature:**
```ts
export function useShareLink(): { copyShareLink: () => Promise<void> }
```

### Decode on Mount (`useEffect`)

**Lines:** 31–59

```ts
useEffect(() => {
  const hash = window.location.hash;
  if (!hash.startsWith(PREFIX)) return;

  try {
    const b64 = hash.slice(PREFIX.length);
    const data = decode(b64);

    if (data && Array.isArray(data.tables)) {
      importTables(data.tables, data.relationships ?? [], data.notes, data.groups);
      if (data.projectName) setProjectName(data.projectName);
      history.replaceState(null, '', window.location.pathname + window.location.search);
      showToast('Schema loaded from stateless share link', 'success');
      useUIStore.getState().setReadOnly(true);  // Force read-only
    }
  } catch {
    // Malformed hash — silently ignored
  }
}, []);  // ← empty deps, runs once on mount
```

**Key behaviours:**
- Runs **once on mount** — empty dependency array with ESLint suppress comment.
- After loading, **clears the hash** via `history.replaceState` — prevents undo/redo from re-importing the shared schema on re-renders.
- **Forces read-only mode** — shared schemas are view-only (no saves).
- Silently ignores malformed/corrupt hash data.

### Generate Share Link (`copyShareLink`)

**Lines:** 62–73

```ts
const copyShareLink = useCallback(async () => {
  const payload = { tables, relationships, notes, groups, projectName };
  const b64 = encode(payload);
  const url = `${window.location.origin}/app/shared${PREFIX}${b64}`;
  await navigator.clipboard.writeText(url);
  showToast('Stateless Share link copied to clipboard!', 'success');
}, [tables, relationships, notes, groups, projectName, showToast]);
```

- Always targets `/app/shared` — not the current route — to avoid embedding a collaborative room ID.
- Uses the **Clipboard API** (`navigator.clipboard.writeText`).
- Re-memoized whenever any schema data changes.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Stateless sharing** | No backend needed — the entire schema lives in the URL. Works for read-only schema previewing |
| **URL size limits** | Very large schemas (many tables × many fields) may produce URLs exceeding browser limits (~2000 chars for IE, ~64KB for modern browsers). LZString mitigates this but doesn't eliminate the risk |
| **`setReadOnly` called directly on store** | `useUIStore.getState().setReadOnly(true)` — calls the vanilla store directly inside a `useEffect`, bypassing React rendering cycle. This is intentional but unconventional |
| **`showToast` cast to `any`** | `(showToast as any)?.()` — indicates `showToast` may not always be available on the UI store, or its type signature in the store doesn't match the usage |
| **Empty `useEffect` deps** | `eslint-disable-next-line react-hooks/exhaustive-deps` is needed because decode is intentionally run only once on mount |
| **Notes/groups in payload** | `notes` and `groups` are included in the share payload — they must exist as non-standard fields in the schema store (beyond the core `tables`/`relationships`) |

---

---

# `useKeyboardShortcuts` — Hook Documentation

> **Location:** `src/hooks/useKeyboardShortcuts.ts`

## File Overview

Registers a **global `keydown` event listener** on `window` for the duration of the component's lifetime, handling all editor keyboard shortcuts — from undo/redo and panel toggling to canvas actions and deletion of selected items. Designed to be called once in the Editor component.

## Dependencies & Imports

```ts
import { useEffect } from 'react';
import { useSchemaStore } from '../store/schema';
import { useUIStore } from '../store/ui';
import { useUndoRedo } from './useUndoRedo';
```

## Exported Hook — `useKeyboardShortcuts()`

**Signature:**
```ts
export function useKeyboardShortcuts(): void
```

Returns nothing — pure side-effect hook. Should be called once in the Editor root.

## Keyboard Shortcut Reference

### Always-Active (Even in Input Fields)

| Shortcut (Mac) | Shortcut (Win) | Action |
|---|---|---|
| `⌘K` | `Ctrl+K` | Toggle command palette |
| `⌘F` | `Ctrl+F` | Open schema search (via `sf:open-search` event) |
| `⌘Z` | `Ctrl+Z` | Undo |
| `⌘⇧Z` / `⌘Y` | `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `⌘B` | `Ctrl+B` | Toggle left sidebar |
| `⌘\` | `Ctrl+\` | Toggle right panel |

### Input-Blocked (Only Active When Not Typing)

| Shortcut | Action |
|---|---|
| `Escape` | Close palette / clear selection / stop editing field |
| `Delete` / `Backspace` | Delete selected table, field, or relationship; or fire `sf:bulk-delete` |
| `T` | Add new table at a grid position |
| `G` | Auto-layout canvas (fires `sf:auto-layout` event) |
| `0` | Fit-to-view (fires `sf:fit-view` event) |
| `/` | Focus filter input (fires `sf:focus-filter` event) |
| `1`–`5` | Set zoom preset (fires `sf:zoom-preset` event with detail) |

## Mac vs. Windows Modifier Detection

```ts
const isMac = navigator.platform.toUpperCase().includes('MAC');
const mod = isMac ? e.metaKey : e.ctrlKey;
```

Uses the deprecated but widely-supported `navigator.platform` to detect Mac and switch between `metaKey` (⌘) and `ctrlKey`.

## Input Field Guard

```ts
const tag = (e.target as HTMLElement).tagName;
const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
if (isInput) return;  // Skip canvas shortcuts when typing
```

Prevents canvas shortcuts from overriding normal text editing. Applied **after** the always-active shortcuts block, so `Ctrl+Z` in an input is still intercepted.

## Custom Event Bus Pattern

Several actions fire `CustomEvent`s on `window` instead of directly calling store methods:

```ts
window.dispatchEvent(new CustomEvent('sf:auto-layout'));
window.dispatchEvent(new CustomEvent('sf:fit-view'));
window.dispatchEvent(new CustomEvent('sf:open-search'));
window.dispatchEvent(new CustomEvent('sf:focus-filter'));
window.dispatchEvent(new CustomEvent('sf:bulk-delete'));
window.dispatchEvent(new CustomEvent('sf:zoom-preset', { detail: parseInt(e.key) }));
```

This decouples the keyboard hook from specific canvas/component implementations — the canvas components listen for these events independently.

## Delete Selection Logic

```ts
const sel = useUIStore.getState().selection;

if (!sel) {
  window.dispatchEvent(new CustomEvent('sf:bulk-delete'));
  return;
}

if (sel.type === 'table')        { removeTable(sel.tableId); clearSelection(); }
else if (sel.type === 'field')   { removeField(sel.tableId, sel.fieldId); clearSelection(); }
else if (sel.type === 'relationship') { removeRelationship?.(sel.relationshipId); clearSelection(); }
```

Reads selection from the UI store directly (`.getState()` not subscribing) — then dispatches the appropriate removal. If no selection, fires the bulk-select delete event for the canvas to handle.

## New Table Position Formula

```ts
{ x: 120 + (tables.length % 5) * 260, y: 120 + Math.floor(tables.length / 5) * 160 }
```

Places new tables in a 5-column grid. Each new table shifts 260px right and wraps to a new row every 5 tables.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **`as any` casts throughout** | `useSchemaStore() as any` and `useUIStore()` interactions use `any` — store types may not fully expose all used properties |
| **`navigator.platform` deprecated** | MDN marks this as deprecated; `navigator.userAgentData.platform` is the modern alternative |
| **Full dependency array** | The `useEffect` lists all used values as deps — any store reference change (if not stable) could cause the event listener to re-register on every render |
| **`removeRelationship?.()` optional chain** | The `?.` suggests `removeRelationship` may not always exist on the schema store — defensive optional call |
| **`Backspace` triggers delete** | Backspace without focus on an input will delete the selected canvas item — may surprise users who expect Backspace to navigate back |

---

---

# `useCloudPersistence` — Hook Documentation

> **Location:** `src/hooks/useCloudPersistence.ts`

## File Overview

Handles the **full cloud persistence lifecycle** for a schema — loading from Supabase on mount (or route change), and saving back to Supabase with a 2-second debounce on every schema store change. This is the primary mechanism that keeps the canvas data synchronized with the database.

## Dependencies & Imports

```ts
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSchemaStore } from '../store/schema';
import { supabase } from '../lib/supabase';
```

| Import | Role |
|---|---|
| `useParams` | Reads `:id` from the URL — the schema UUID |
| `useSchemaStore` | Reads current canvas state to save; calls `importTables` on load |
| `supabase` | Configured Supabase JS client for DB operations |

## Constants

```ts
const SAVE_DEBOUNCE_MS = 2000;
```

All schema changes are saved after 2 seconds of inactivity — prevents excessive DB writes during rapid editing.

## Exported Hook — `useCloudPersistence(isSandbox?)`

**Signature:**
```ts
export function useCloudPersistence(isSandbox: boolean = false): { schemaOwnerId: string | null }
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `isSandbox` | `boolean` | `false` | If `true`, disables both loading and saving — used for sandboxed/demo mode |

**Returns:**

| Value | Type | Description |
|---|---|---|
| `schemaOwnerId` | `string \| null` | The Supabase `owner_id` of the loaded schema — used by the editor to detect view-only mode |

## Effect 1 — Load Schema on Mount / Route Change

**Lines:** 16–53

```ts
useEffect(() => {
  if (!id || isSandbox) return;
  if (loadedId.current === id) return;   // Prevent double-loading same schema
  loadedId.current = id;

  // Reset to blank slate
  store.importTables([], []);
  store.setProjectName('Untitled schema');

  async function loadFromCloud() {
    const { data } = await supabase
      .from('schemas')
      .select('canvas_state, name, owner_id')
      .eq('id', id)
      .single();

    if (data) {
      setSchemaOwnerId(data.owner_id);
      if (data.name) store.setProjectName(data.name);
      if (data.canvas_state?.tables) {
        store.setAllowGuestEdits(data.canvas_state.allowGuestEdits === true);
        store.importTables(data.canvas_state.tables, data.canvas_state.relationships || []);
      }
    }
  }
  loadFromCloud();
}, [id, isSandbox]);
```

**Key behaviours:**
- Resets the canvas to empty before loading to prevent stale data from the previous schema bleeding in.
- Uses `loadedId` ref to detect **route changes** — if `/app/:id` changes, the effect re-runs and loads the new schema.
- Reads `allowGuestEdits` from `canvas_state` to configure collaborative permissions.
- Fires-and-forgets — no loading state exposed to the caller.

## Effect 2 — Debounced Auto-Save

**Lines:** 56–87

```ts
useEffect(() => {
  if (!id || isSandbox) return;
  let timer: ReturnType<typeof setTimeout>;

  const unsub = useSchemaStore.subscribe((state) => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const payload = {
        tables: state.tables,
        relationships: state.relationships,
        allowGuestEdits: state.allowGuestEdits,
      };
      await supabase
        .from('schemas')
        .update({ canvas_state: payload, name: state.projectName, updated_at: new Date().toISOString() })
        .eq('id', id);

      state.setLastSaved(Date.now());
    }, SAVE_DEBOUNCE_MS);
  });

  return () => { clearTimeout(timer); unsub(); };
}, [id, isSandbox]);
```

**Key behaviours:**
- Uses `useSchemaStore.subscribe()` (vanilla Zustand) — not `useSchemaStore()` — to avoid React re-renders on every save tick.
- **Debounced with `setTimeout`**: timer is reset on every store change; only fires after 2s of quiet.
- **Fire-and-forget `await`**: the save is async but errors are silently swallowed — no retry or error reporting.
- Cleanup properly cancels the pending timer and unsubscribes from the store on unmount or `id` change.
- Saves `updated_at` as the client's current timestamp (not server-side `now()`) — could drift in multi-user scenarios.

## `loadedId` Ref — Route Change Detection

```ts
const loadedId = useRef<string | undefined>(undefined);
```

Persists the last-loaded schema ID across renders. Since `useEffect` with `[id]` as dep fires on every route transition, this ref prevents re-loading the same schema if the component re-renders without the route changing (e.g. parent re-render).

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **No loading state returned** | The hook doesn't expose `isLoading` — the UI has no official signal that the schema is being fetched |
| **Silent save failures** | `await supabase.update(...)` errors are not caught — a failed save shows no error to the user |
| **Client-side `updated_at`** | Timestamp is set by the client, not the DB server — can be inaccurate if clocks are out of sync |
| **`isSandbox` disables both load AND save** | A sandbox schema is neither loaded from Supabase nor saved back — fully ephemeral |
| **`notes`/groups not saved** | The save payload only includes `tables`, `relationships`, and `allowGuestEdits` — any `notes` or `groups` state is not persisted |
| **No conflict resolution** | Multiple open sessions for the same schema will overwrite each other — last write wins |
| **Supabase RLS not enforced here** | The client uses the user's Supabase session — RLS protects unauthorized access, but collaborators with access can all write |

---

---

# `useAI` — Hook & Functions Documentation

> **Location:** `src/hooks/useAI.ts`

## File Overview

Provides three AI-powered capabilities by proxying calls through the SchemaForge backend (`/api/openai/*`). The backend holds the OpenAI API key securely — this file never accesses it directly.

**Three exports:**
1. **`useSuggestFields`** — React hook; streams AI analysis of a specific table with actionable suggestions
2. **`useDescribeField`** — React hook; returns a one-shot async function that generates a single sentence field description
3. **`generateSchemaFromPrompt`** — Plain async function; generates a complete schema from a natural language description

All AI calls go through `VITE_API_URL` (the backend EC2 endpoint) or fall back to relative paths for local dev (where Vite proxies `/api/*`).

## Dependencies & Imports

```ts
import { useState, useCallback, useRef } from 'react';
import type { Table, Relationship } from '../types/schema';
```

No external AI SDK — all calls use native `fetch`.

## Backend Base URL

```ts
function getBackendBase(): string {
  return (import.meta as any).env?.VITE_API_URL ?? '';
}
```

- In **production**: `VITE_API_URL` = the EC2 backend URL (e.g. `https://13-61-7-14.sslip.io`)
- In **local dev**: falls back to `''` — relative path `/api/openai/...` proxied by Vite

## Exported Types

### `AIStatus`

```ts
export type AIStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error';
```

| State | Meaning |
|---|---|
| `idle` | Not running — initial state or after abort |
| `loading` | Fetch initiated, waiting for first byte |
| `streaming` | Actively receiving SSE stream chunks |
| `done` | Stream complete successfully |
| `error` | Non-abort error occurred |

### `AIResult`

```ts
export interface AIResult {
  text:    string;
  status:  AIStatus;
  error?:  string;
  abort:   () => void;
}
```

## Internal Helper — `tableToText(table)`

```ts
function tableToText(table: Table): string {
  return `Table "${table.name}" (${table.fields
    .map(f => `${f.name} ${f.type}${f.isPK ? ' PK' : ''}${f.isFK ? ' FK' : ''}${!f.nullable ? ' NOT NULL' : ''}${f.unique ? ' UNIQUE' : ''}`)
    .join(', ')})`;
}
```

Serializes a table to a compact one-line text for inclusion in AI prompts. Example:
```
Table "orders" (id bigserial PK NOT NULL, user_id bigint FK NOT NULL, status varchar NOT NULL)
```

## Internal Helper — `streamCompletion()`

```ts
async function streamCompletion(
  messages: { role: string; content: string }[],
  onChunk:  (chunk: string) => void,
  signal:   AbortSignal
): Promise<void>
```

Handles the **SSE stream reading loop**:
1. POSTs to `/api/openai/stream`.
2. Reads the `ReadableStream` body in chunks via `getReader()`.
3. Splits each chunk into `data: ...` lines (OpenAI SSE format).
4. Parses each JSON line and extracts `choices[0].delta.content`.
5. Calls `onChunk(text)` for each non-empty content delta.
6. Stops on `data: [DONE]`.

Respects the `AbortSignal` — if aborted, the fetch is cancelled and the loop exits.

---

## Export 1 — `useSuggestFields(table, allTables, relationships)`

**Lines:** 74–144

**Signature:**
```ts
export function useSuggestFields(
  table:         Table,
  allTables:     Table[],
  relationships: Relationship[]
): AIResult & { run: () => Promise<void>; startIfNotStarted: () => void }
```

### Purpose

Streams a detailed AI analysis of a specific table, giving actionable recommendations across four categories using emoji headers in the response:

- 📋 **Missing Fields** — columns this table likely needs
- 🔑 **Suggested Indexes** — fields worth indexing
- ⚡ **Normalization Tips** — structural improvements
- 💡 **Best Practices** — data integrity suggestions

### Prompt Structure

**System prompt:** Senior database architect persona, concise emoji-formatted sections.

**User message:**
```
Full schema context:
Table "users" (id bigserial PK NOT NULL, email text NOT NULL UNIQUE)
Table "orders" (id bigserial PK NOT NULL, user_id bigint FK NOT NULL)

Relationships:
users → orders (one-to-many)

Focus on this table:
Table "orders" (...)

Provide specific, actionable suggestions for improving this table.
```

### Abort / Re-run Pattern

```ts
const run = useCallback(async () => {
  abortRef.current?.abort();           // Cancel any in-flight request
  const ctrl = new AbortController();
  abortRef.current = ctrl;
  // ...
}, [table, allTables, relationships]);
```

Each `run()` call aborts the previous one before starting. The `AbortController` ref persists across renders.

### `startIfNotStarted` — Run-Once Guard

```ts
const hasRun = useRef(false);
const startIfNotStarted = useCallback(() => {
  if (!hasRun.current) { hasRun.current = true; run(); }
}, [run]);
```

Allows the caller to trigger an auto-run on first mount without duplicating runs on re-renders (e.g. when used in a panel that mounts multiple times).

### Model Config

| Setting | Value |
|---|---|
| Model | `gpt-4o-mini` (via backend) |
| `max_tokens` | `800` |
| `temperature` | `0.4` |

---

## Export 2 — `useDescribeField(fieldName, fieldType, tableName)`

**Lines:** 147–197

**Signature:**
```ts
export function useDescribeField(
  fieldName: string,
  fieldType: string,
  tableName: string
): { describe: () => Promise<string> }
```

### Purpose

Returns a single async function `describe()` that calls the streaming endpoint to generate a **one-sentence description** of a field, then collects all chunks and returns the full text as a string.

### Prompt

```
System: Write one concise sentence (max 20 words) describing what a database column is used for.
User:   Table: orders
        Field: user_id (bigint)
        Write a one-sentence description.
```

### Model Config

| Setting | Value |
|---|---|
| `max_tokens` | `60` |
| `temperature` | `0.3` |

### Streaming-to-string Pattern

Although the endpoint returns an SSE stream, `useDescribeField` **collects all chunks** into a single `result` string before returning — treating streaming as a one-shot request. Returns `'No description available.'` on error or empty response.

---

## Export 3 — `generateSchemaFromPrompt(prompt, signal?)`

**Lines:** 200–227

**Signature:**
```ts
export async function generateSchemaFromPrompt(
  prompt: string,
  signal?: AbortSignal
): Promise<{
  tables: { name: string; fields: {...}[] }[];
  relationships: { from: string; fromField: string; to: string; toField: string; cardinality: string }[];
}>
```

### Purpose

A **plain async function** (not a hook) that calls `/api/openai/generate` with a natural language description and returns a structured schema object. Used by the "Generate from Description" feature.

### Markdown Code Block Stripping

```ts
if (raw.includes('```json')) {
  raw = raw.split('```json')[1].split('```')[0].trim();
} else if (raw.includes('```')) {
  raw = raw.split('```')[1].split('```')[0].trim();
}
```

The AI may wrap the JSON in ` ```json ``` ` markdown blocks even when instructed not to. This strips the fences before parsing.

### Return Shape

```json
{
  "tables": [
    {
      "name": "users",
      "fields": [
        { "name": "id", "type": "bigserial", "isPK": true, "nullable": false }
      ]
    }
  ],
  "relationships": [
    { "from": "orders", "fromField": "user_id", "to": "users", "toField": "id", "cardinality": "one-to-many" }
  ]
}
```

Note: The return shape uses `from`/`fromField`/`to`/`toField` (DBML-like) — **different** from the internal `sourceTableId`/`targetTableId` shape. The caller normalizes this into the canvas format.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **No API key in client** | All calls go through the backend — API key never exposed to the browser |
| **`res.body!` non-null assertion** | `getReader()` is called with `!` — assumes the response always has a body. Could throw in edge cases (e.g. HEAD response) |
| **`useSuggestFields` return shape uses spread** | `...(({ run, startIfNotStarted } as any))` — a non-idiomatic way to add extra properties to the `AIResult` return. The `as any` cast bypasses the `AIResult` type |
| **`useDescribeField` is not a true hook** | Despite being named `use*`, it takes no reactive deps and returns a plain object — it could be a plain function. The `use` prefix is misleading |
| **`generateSchemaFromPrompt` catches `data.choices[0]`** | `data.choices?.[0]?.message?.content ?? '{}'` — if the response isn't the expected OpenAI format, it falls back to `{}`, which would produce an empty schema |
| **Abort on `useDescribeField` not supported** | `useDescribeField.describe()` has no abort capability — long AI calls cannot be cancelled |

---

## Hooks Comparison Summary

| Property | `useUndoRedo` | `useShareLink` | `useKeyboardShortcuts` | `useCloudPersistence` | `useAI` hooks |
|---|---|---|---|---|---|
| **Returns** | State + actions | `copyShareLink` fn | nothing | `schemaOwnerId` | `AIResult` / async fn |
| **Has side effects** | No | Writes to clipboard / history | Adds global event listener | DB read + write | Fetch to AI backend |
| **Async** | No | Yes (clipboard) | No | Yes (Supabase) | Yes (streaming) |
| **Store interactions** | Schema (temporal) | Schema + UI | Schema + UI | Schema + Supabase | None directly |
| **Abort/cleanup support** | N/A | N/A | `removeEventListener` | `clearTimeout + unsub` | `AbortController` |

---

*Generated documentation for SchemaForge — `src/hooks/`*
