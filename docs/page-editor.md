# `Editor.tsx` — Page Documentation

> **Location:** `src/pages/Editor.tsx`  
> **Type:** React Page Component (default export) — TypeScript/TSX  
> **Routes:** `/app/:id` (authenticated editor), `/sandbox` (anonymous), `/share/:hash` (stateless read-only)  
> **Purpose:** The root orchestration layer for the full schema editor. Assembles every editor component into a single shell, manages the host/guest access model, boots the Yjs real-time collaboration session, registers all `sf:*` custom event listeners, handles sandbox persistence to `localStorage`, and controls all overlay visibility (import, diff, search, AI, live-import dialogs).

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Components Assembled](#2-dependencies--components-assembled)
3. [Props](#3-props)
4. [Internal Component — `SandboxLimiter`](#4-internal-component--sandboxlimiter)
5. [State](#5-state)
6. [Effect: Host/Guest Access Model](#6-effect-hostguest-access-model)
7. [Effect: `sf:*` Custom Event Bus Listeners](#7-effect-sf-custom-event-bus-listeners)
8. [Effect: Yjs Room + Cursor Broadcasting](#8-effect-yjs-room--cursor-broadcasting)
9. [Effect: Sandbox LocalStorage Sync](#9-effect-sandbox-localstorage-sync)
10. [Mode-Driven Layout](#10-mode-driven-layout)
11. [Overlay Rendering](#11-overlay-rendering)
12. [JSX Structure](#12-jsx-structure)
13. [Notable Patterns & Caveats](#13-notable-patterns--caveats)

---

## 1. File Overview

`Editor` is the **application's most complex page** — a composition layer that boots and wires together every major subsystem:

| Subsystem | Mechanism |
|---|---|
| **Keyboard shortcuts** | `useKeyboardShortcuts()` |
| **Cloud auto-save** | `useCloudPersistence(isSandbox)` |
| **Real-time collaboration** | `useYjsStore.joinRoom(id)` / `leaveRoom()` |
| **Cursor broadcasting** | `pointermove` listener → `broadcastCursor()` |
| **Share link decode** | `useShareLink()` (decodes hash on mount) |
| **Host/guest access** | `schemaOwnerId` vs `session.user.id` comparison |
| **Sandbox persistence** | `localStorage.sandbox_schema` read/write via store subscription |
| **Overlay control** | Six boolean states + six `sf:*` event listeners |

Three rendering modes are supported via `useUIStore.mode`: `'canvas'` (canvas only), `'split'` (canvas + code side by side), `'code'` (code panel only).

---

## 2. Dependencies & Components Assembled

```tsx
// Hooks
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useCloudPersistence }  from '../hooks/useCloudPersistence';
import { useShareLink }         from '../hooks/useShareLink';

// Layout + main components
import { TopBar }          from '../components/topbar/TopBar';
import { Sidebar }         from '../components/sidebar/Sidebar';
import { SchemaCanvas }    from '../components/canvas/SchemaCanvas';
import { CodePanel }       from '../components/editor/CodePanel';
import { RightPanel }      from '../components/panel/RightPanel';
import { StatusBar }       from '../components/statusbar/StatusBar';
import { MultiplayerCursors } from '../components/canvas/MultiplayerCursors';

// Always-mounted overlays
import { CommandPalette }  from '../components/palette/CommandPalette';
import { Toast }           from '../components/shared/Toast';
import { AIBottomDrawer }  from '../components/ai/AIBottomDrawer';

// Conditionally mounted overlays
import { ImportDialog }    from '../components/importer/ImportDialog';
import { DiffViewer }      from '../components/diff/DiffViewer';
import { SearchOverlay }   from '../components/search/SearchOverlay';
import { LiveImportDialog } from '../components/importer/LiveImportDialog';

// Stores
import { useUIStore }    from '../store/ui';
import { useYjsStore }   from '../store/yjsStore';
import { useSchemaStore } from '../store/schema';
import { useAuthStore }  from '../store/authStore';
```

---

## 3. Props

```tsx
export default function Editor({
  isSandbox    = false,
  isSharedView = false,
}: {
  isSandbox?:    boolean;
  isSharedView?: boolean;
})
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `isSandbox` | `boolean` | `false` | Anonymous public demo — no auth, localStorage persistence, table limit of 5 |
| `isSharedView` | `boolean` | `false` | Stateless read-only view from a share link hash — no Yjs, no DB |

**Three operating modes of the `Editor` page:**

| Configuration | `isSandbox` | `isSharedView` | Yjs | DB Persist | Auth |
|---|---|---|---|---|---|
| Normal authenticated editor | `false` | `false` | ✅ | ✅ | Required |
| Anonymous sandbox | `true` | `false` | ❌ | ❌ (localStorage) | Not required |
| Stateless share link | `false` | `true` | ❌ | ❌ | Not required |

---

## 4. Internal Component — `SandboxLimiter`

```tsx
function SandboxLimiter() {
  const { session }  = useAuthStore();
  const tables       = useSchemaStore(s => s.tables);
  const removeTable  = useSchemaStore(s => s.removeTable);
  const setToast     = useUIStore(s => s.showToast);

  useEffect(() => {
    if (session) return;           // Authenticated users: no limit
    if (tables.length > 5) {
      const newest = tables[tables.length - 1];
      removeTable(newest.id);
      setToast("Sandbox Limit Reached: Guests can only create up to 5 tables. Please Sign Up...", 'error');
    }
  }, [tables.length, tables, removeTable, session, setToast]);

  return null;
}
```

A **render-null enforcement component** mounted only on the sandbox route (`{isSandbox && !isSharedView && <SandboxLimiter />}`).

**Enforcement mechanism:** When `tables.length > 5`, immediately removes the most recently added table (`tables[tables.length - 1]`) and shows a toast. This fires on every render where the limit is exceeded — including recoveries.

**Session bypass:** If the user signs in while on the sandbox (possible via the nav bar), `session` becomes truthy and the limit is disabled.

> **Index assumption:** `tables[tables.length - 1]` is assumed to be the newest table. The `tables` array in the schema store is ordered by insertion — this holds as long as `addTable` pushes to the end of the array. If order ever changes, the wrong table could be deleted.

> **Flicker risk:** The newest table is rendered briefly before `SandboxLimiter`'s effect fires and removes it. Users may see it appear and immediately disappear on the canvas.

---

## 5. State

| State | Type | Initial | Description |
|---|---|---|---|
| `isHost` | `boolean` | `false` | Whether the current user owns this schema |
| `importOpen` | `boolean` | `false` | `ImportDialog` visibility |
| `diffOpen` | `boolean` | `false` | `DiffViewer` visibility |
| `searchOpen` | `boolean` | `false` | `SearchOverlay` visibility |
| `aiGenOpen` | `boolean` | `false` | `AIBottomDrawer` open state |
| `liveImportOpen` | `boolean` | `false` | `LiveImportDialog` visibility |

All six overlay booleans start closed. Each has a corresponding `sf:*` event listener that opens it.

---

## 6. Effect: Host/Guest Access Model

```ts
useEffect(() => {
  if (isSandbox || isSharedView) return;   // Bypass for sandbox / shared views
  if (!schemaOwnerId) return;              // Wait until persistence loaded owner ID

  const hostStatus = !!session?.user?.id
    && !!schemaOwnerId
    && session.user.id === schemaOwnerId;
  setIsHost(hostStatus);

  if (!hostStatus && !allowGuestEdits) {
    setReadOnly(true);
    useYjsStore.getState().clearCursor();  // Remove cursor from multiplayer room
  } else {
    setReadOnly(false);
  }
}, [schemaOwnerId, session, allowGuestEdits, isSandbox, setReadOnly]);
```

**Host determination:** Triple-truthy check — both `session.user.id` and `schemaOwnerId` must be defined and equal. Short-circuits cleanly if either is absent.

**Access matrix:**

| User | `allowGuestEdits` | `isHost` | `readOnly` |
|---|---|---|---|
| Schema owner | any | `true` | `false` |
| Guest | `true` | `false` | `false` |
| Guest | `false` | `false` | `true` |
| Anonymous (sandbox) | N/A — bypassed | `false` | `false` |
| Share link | N/A — bypassed | `false` | Depends on `useShareLink` setting |

**`schemaOwnerId`** comes from `useCloudPersistence(isSandbox)` — returned after the schema row is loaded from Supabase. There's a window where `schemaOwnerId` is `null` and `!hostStatus && !allowGuestEdits` could briefly set `readOnly: true` before the real value loads.

**Cleanup effect:**
```ts
useEffect(() => {
  return () => setReadOnly(false);
}, [setReadOnly]);
```
Resets `readOnly` to `false` when the editor unmounts — prevents stale read-only state from leaking into the next page.

---

## 7. Effect: `sf:*` Custom Event Bus Listeners

Six `useEffect` blocks register `window` listeners for `sf:*` custom events fired by `CommandPalette`, `TopBar`, and other components:

```ts
// Pattern repeated 6 times:
useEffect(() => {
  const handler = () => setXxxOpen(true);
  window.addEventListener('sf:open-xxx', handler);
  return () => window.removeEventListener('sf:open-xxx', handler);
}, []);
```

| Event | Handler | Effect |
|---|---|---|
| `sf:open-import` | `setImportOpen(true)` | Opens `ImportDialog` |
| `sf:open-diff` | `setDiffOpen(true)` | Opens `DiffViewer` |
| `sf:share` | `copyShareLink()` | Encodes schema → URL hash → clipboard |
| `sf:open-search` | `setSearchOpen(true)` | Opens `SearchOverlay` |
| `sf:open-ai-generate` | `setAiGenOpen(true)` | Opens `AIBottomDrawer` |
| `sf:open-live-import` | `setLiveImportOpen(true)` | Opens `LiveImportDialog` |

> **Note on `sf:open-ai-generate`:** The event is also listened to by `AIBottomDrawer` directly (see its documentation). The `Editor` only sets `aiGenOpen = true`, which makes `AIBottomDrawer` visible (it's always mounted, controlled by `isOpen` prop). The event detail (`initialPrompt`) is handled by `AIBottomDrawer`'s own listener — `Editor` does not pass the detail through.

> **`sf:share` dep array:** `[copyShareLink]` — `copyShareLink` is a function from `useShareLink`, assumed stable. If it changes (new hook instance), the listener is re-registered.

---

## 8. Effect: Yjs Room + Cursor Broadcasting

```ts
useEffect(() => {
  let joined = false;
  if (id && !isSandbox && !isSharedView) {
    useYjsStore.getState().joinRoom(id);   // Join room = schemaId
    joined = true;
  }

  // Manual 30fps cursor throttle
  let lastCursorBroadcast = 0;
  const handlePointerMoveThrottled = (e: PointerEvent) => {
    const now = Date.now();
    if (now - lastCursorBroadcast < 33) return;  // 1000ms / 30fps ≈ 33ms
    lastCursorBroadcast = now;
    if (!useYjsStore.getState().connected) return;
    useYjsStore.getState().broadcastCursor(e.clientX, e.clientY);
  };

  window.addEventListener('pointermove', handlePointerMoveThrottled);

  return () => {
    window.removeEventListener('pointermove', handlePointerMoveThrottled);
    if (joined) useYjsStore.getState().leaveRoom(false);
  };
}, [id, isSandbox]);
```

### Yjs Room Join

`joinRoom(id)` — connects the `y-websocket` client using the schema's UUID as the room ID. Only runs in authenticated, non-sandbox, non-sharedview mode.

**`leaveRoom(false)`** — the `false` argument likely means "don't persist before leaving" (clean disconnect). Runs on component unmount.

### Cursor Broadcasting

- `pointermove` on `window` — captures all pointer events across the entire page
- Throttled to `~30fps` (33ms minimum interval) using a closure variable `lastCursorBroadcast`
- Broadcasts raw `clientX, clientY` (viewport coordinates) to Yjs awareness
- Skipped if `!connected` — no-ops when WebSocket is offline
- `MultiplayerCursors` renders other users' cursors based on this awareness data

> **`isSharedView` missing from deps:** The effect dep array is `[id, isSandbox]` but not `isSharedView` — if `isSharedView` changes after mount (shouldn't happen in practice), the Yjs join logic wouldn't re-evaluate. Safe in the current routing model but worth noting.

---

## 9. Effect: Sandbox LocalStorage Sync

```ts
useEffect(() => {
  if (!isSandbox || isSharedView) return;

  // Load saved sandbox on first open
  const saved = localStorage.getItem('sandbox_schema');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.tables && parsed.relationships) {
        useSchemaStore.getState().importTables(parsed.tables, parsed.relationships);
      }
    } catch (e) { console.error('Failed to parse sandbox schema'); }
  } else {
    // First visit: load e-commerce template via dynamic import
    import('../utils/templates').then(({ TEMPLATES }) => {
      const ecommerce = TEMPLATES.ecommerce;
      if (ecommerce) {
        useSchemaStore.getState().importTables(ecommerce.tables, ecommerce.relationships);
      }
    });
  }

  // Subscribe to schema changes → write to localStorage (guests only)
  const unsub = useSchemaStore.subscribe((state) => {
    if (session) return;    // Authenticated users: don't persist to localStorage
    localStorage.setItem('sandbox_schema', JSON.stringify({
      tables:        state.tables,
      relationships: state.relationships,
    }));
  });
  return () => unsub();
}, [isSandbox, session]);
```

### Load on Open

- **Existing sandbox** (`localStorage.sandbox_schema` exists) → `importTables()` restores it
- **First visit** (no saved data) → dynamically imports `templates.ts` and loads the `ecommerce` template
  - Dynamic `import()` — code-split, loaded asynchronously. The canvas is briefly empty before the template loads

### Persist on Change

`useSchemaStore.subscribe(state => ...)` — a Zustand vanilla subscription (not a React hook). Writes `{ tables, relationships }` to `localStorage.sandbox_schema` on every schema state change.

**Auth guard:** `if (session) return` — authenticated users using the sandbox (possible via visiting `/sandbox` while logged in) don't write to `localStorage`. Their work is not claimed when they return to the dashboard.

**Notes/groups omitted:** Only `tables` and `relationships` are persisted — same gap as `useCloudPersistence`. Notes and groups on the sandbox canvas are not saved.

---

## 10. Mode-Driven Layout

```tsx
<main className={[
  'app-canvas-area',
  mode === 'split' ? 'app-canvas-area--split' : '',
  mode === 'code'  ? 'app-canvas-area--code'  : '',
].filter(Boolean).join(' ')}>

  {mode !== 'code' && (
    <div className="app-canvas-pane">
      <SchemaCanvas />
    </div>
  )}
  {mode !== 'canvas' && (
    <div className="app-code-pane">
      <CodePanel />
    </div>
  )}
</main>
```

**Mode → visible panes:**

| `mode` | Canvas pane | Code pane | CSS modifier |
|---|---|---|---|
| `'canvas'` | ✅ | ❌ | (none) |
| `'split'` | ✅ | ✅ | `app-canvas-area--split` |
| `'code'` | ❌ | ✅ | `app-canvas-area--code` |

`SchemaCanvas` and `CodePanel` mount/unmount based on mode. `SchemaCanvas` is a relatively heavy component (React Flow + Yjs effects) — mounting/unmounting it on mode switch may cause brief layout reflow and re-initialization. Using `display: none` CSS to hide rather than unmount would avoid this.

---

## 11. Overlay Rendering

| Overlay | Mount strategy | Open trigger | Close trigger |
|---|---|---|---|
| `CommandPalette` | Always mounted | `useUIStore.openPalette()` | `useUIStore.closePalette()` |
| `Toast` | Always mounted | `useUIStore.showToast()` | Auto-dismiss timer |
| `AIBottomDrawer` | Always mounted | `isOpen={aiGenOpen}` / `sf:open-ai-generate` | `onClose` callback |
| `ImportDialog` | Conditional (`importOpen`) | `sf:open-import` or `onImportClick` | `onClose` callback |
| `DiffViewer` | Conditional (`diffOpen`) | `sf:open-diff` or `onDiffClick` | `onClose` callback |
| `SearchOverlay` | Conditional (`searchOpen`) | `sf:open-search` | `onClose` callback |
| `LiveImportDialog` | Conditional (`liveImportOpen`) | `sf:open-live-import` | `onClose` callback |

**`AIBottomDrawer` is always mounted** — unlike the other overlays, it persists in the DOM (controlled by `isOpen` prop) so it can maintain its chat history state between open/close cycles.

---

## 12. JSX Structure

```
<div class="app-shell">

  {isSandbox && !isSharedView && <SandboxLimiter />}  (render-null enforcer)

  <TopBar isHost={isHost} onImportClick onDiffClick />

  <div class="app-body">
    <Sidebar isHost={isHost} />

    <main class="app-canvas-area [--split|--code]">
      {mode !== 'code'   && <div class="app-canvas-pane"><SchemaCanvas /></div>}
      {mode !== 'canvas' && <div class="app-code-pane"><CodePanel /></div>}
    </main>

    <RightPanel />
  </div>

  <MultiplayerCursors />   (fixed-position cursors layer, always mounted)
  <StatusBar />            (bottom footer bar)

  ── Overlays ──────────────────────────────────────────────────────────
  <CommandPalette />          (always mounted, store-controlled)
  <Toast />                   (always mounted, store-controlled)
  {importOpen    && <ImportDialog onClose />}
  {diffOpen      && <DiffViewer onClose />}
  {searchOpen    && <SearchOverlay onClose />}
  <AIBottomDrawer isOpen={aiGenOpen} onClose />   (always mounted)
  {liveImportOpen && <LiveImportDialog onClose />}

</div>
```

---

## 13. Notable Patterns & Caveats

| | Detail |
|---|---|
| **`SandboxLimiter` causes a flicker** | Table is rendered, then removed in the next effect cycle — users may briefly see the over-limit table appear before deletion |
| **`schemaOwnerId` load window briefly sets `readOnly: true`** | Between mount and when `useCloudPersistence` resolves the owner, guests see `readOnly: true` momentarily even if `allowGuestEdits` is `true` |
| **`isSharedView` missing from Yjs effect deps** | `[id, isSandbox]` — `isSharedView` not included. Benign in current routing but technically incomplete |
| **`SchemaCanvas` unmounts on mode switch** | Unmounts on `'code'` mode — React Flow re-initializes on switch back. `display: none` would be smoother |
| **`sf:open-ai-generate` handled in two places** | `Editor` sets `aiGenOpen = true`. `AIBottomDrawer` also has its own listener (to handle `initialPrompt` from detail). The two listeners are independent — no deduplication needed but could be confusing |
| **Sandbox notes/groups not persisted** | Only `tables` + `relationships` written to `localStorage.sandbox_schema` |
| **Auth guard in sandbox subscription** | `if (session) return` — logged-in users on `/sandbox` don't save work (by design), but this is non-obvious and their sandbox work is silently lost if they don't claim it |
| **Dynamic import of templates on first sandbox visit** | Shows briefly empty canvas before the e-commerce template populates asynchronously |
| **`useShareLink()` decodes hash on every mount** | `Editor` calls `useShareLink()` unconditionally — even in sandbox/authenticated modes. The hook internally checks for a hash before decoding |
| **`leaveRoom(false)` on unmount** | The `false` arg on unmount means schema state is not saved to Yjs before leaving. This is correct since cloud persistence (`useCloudPersistence`) handles DB saves independently |

---

## `sf:*` Event Bus — Complete Registry (from Editor's perspective)

| Event | Dispatcher | Receiver in Editor | Ultimate Effect |
|---|---|---|---|
| `sf:open-import` | `CommandPalette`, `TopBar` | `setImportOpen(true)` | Mounts `ImportDialog` |
| `sf:open-diff` | `CommandPalette`, `TopBar` | `setDiffOpen(true)` | Mounts `DiffViewer` |
| `sf:share` | `CommandPalette` | `copyShareLink()` | LZ-encode → clipboard |
| `sf:open-search` | `CommandPalette`, keyboard `Ctrl+F` | `setSearchOpen(true)` | Mounts `SearchOverlay` |
| `sf:open-ai-generate` | `CommandPalette`, `TopBar`, `CodePanel` | `setAiGenOpen(true)` | `AIBottomDrawer` visible |
| `sf:open-live-import` | `CommandPalette`, `TopBar` | `setLiveImportOpen(true)` | Mounts `LiveImportDialog` |
| `sf:auto-layout` | `CommandPalette`, keyboard `G` | Handled by `SchemaCanvas` | ELK re-layout |
| `sf:fit-view` | `CommandPalette`, keyboard `0` | Handled by `SchemaCanvas` | Fit all nodes |
| `sf:focus-table` | `SearchOverlay` | Handled by `SchemaCanvas` | Pan + zoom to node |
| `sf:focus-filter` | keyboard `Ctrl+F` | Handled by `Sidebar` | Focus filter input |

---

*Generated documentation for SchemaForge — `src/pages/Editor.tsx`*
