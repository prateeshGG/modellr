# `ShareModal.tsx` — Component Documentation

> **Location:** `src/components/share/ShareModal.tsx`  
> **Type:** React Component — TypeScript/TSX  
> **Purpose:** A three-tab modal dialog for sharing the current schema. Provides three distinct sharing mechanisms: real-time collaborative link (Yjs WebSocket session), stateless self-contained URL (LZ-string encoded in hash), and iframe embed (behind a `is_public` flag in Supabase). Also surfaces the host/guest role, live WebSocket connection status, and the "Allow Guest Editors" toggle.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Props](#3-props)
4. [State](#4-state)
5. [On-Mount Data Fetch](#5-on-mount-data-fetch)
6. [Actions](#6-actions)
7. [Tab 1 — Real-time Collab](#7-tab-1--real-time-collab)
8. [Tab 2 — Stateless Link](#8-tab-2--stateless-link)
9. [Tab 3 — Publish & Embed](#9-tab-3--publish--embed)
10. [JSX Structure](#10-jsx-structure)
11. [Notable Patterns & Caveats](#11-notable-patterns--caveats)

---

## 1. File Overview

`ShareModal` is the **sharing hub** for an individual schema. It is opened from the editor toolbar/sidebar and performs a Supabase query on mount to fetch the current schema's visibility state (`is_public`) and determine whether the current user is the owner (`owner_id` comparison).

The three tabs represent fundamentally different sharing models:

| Tab | Sharing Model | Auth Required | Real-time |
|---|---|---|---|
| **Real-time Collab** | Live WebSocket session URL | No (guests join by URL) | ✅ Yes (Yjs) |
| **Stateless Link** | Schema encoded in URL hash | No (read-only snapshot) | ❌ No |
| **Publish & Embed** | `is_public` database flag + iframe | Owner only to toggle | ❌ No (read-only) |

---

## 2. Dependencies & Imports

```tsx
import { useParams }     from 'react-router-dom';
import { useUIStore }    from '../../store/ui';
import { useShareLink }  from '../../hooks/useShareLink';
import { useSchemaStore } from '../../store/schema';
import { useYjsStore }   from '../../store/yjsStore';
import { supabase }      from '../../lib/supabase';
```

| Import | Role |
|---|---|
| `useParams` | Extracts `id` (schema UUID) from the route `/app/:id` |
| `useUIStore` | `showToast` — feedback notifications |
| `useShareLink` | `copyShareLink()` — LZ-string encode + clipboard write |
| `useSchemaStore` | `allowGuestEdits`, `setAllowGuestEdits` — guest edit permission toggle |
| `useYjsStore` | `connected` — live WebSocket connection status |
| `supabase` | Fetches `is_public` + `owner_id`; updates `is_public` |

---

## 3. Props

```tsx
interface ShareModalProps {
  onClose: () => void;
}
```

Single prop — close callback. All other data comes from the URL params and Zustand stores.

---

## 4. State

| State | Type | Initial | Description |
|---|---|---|---|
| `activeTab` | `'collab' \| 'stateless' \| 'embed'` | `'collab'` | Currently visible tab |
| `isPublic` | `boolean` | `false` | Schema's `is_public` value from Supabase |
| `isHost` | `boolean` | `false` | `true` if the current user is the schema owner |
| `loading` | `boolean` | `true` | `true` until the Supabase fetch completes |

---

## 5. On-Mount Data Fetch

```ts
useEffect(() => {
  async function fetchState() {
    if (!id) return;

    const [schemaRes, authRes] = await Promise.all([
      supabase.from('schemas').select('is_public, owner_id').eq('id', id).single(),
      supabase.auth.getSession()
    ]);

    const { data } = schemaRes;
    const sessionUser = authRes.data.session?.user;

    if (data) {
      setIsPublic(Boolean(data.is_public));
      setIsHost(sessionUser?.id === data.owner_id);
    }
    setLoading(false);
  }
  fetchState();
}, [id]);
```

Runs two parallel Supabase requests on mount:

1. **Schema row query** — `schemas` table, selects only `is_public` and `owner_id` for the current schema ID
2. **Auth session query** — current authenticated user's ID

**`isHost` determination:**
```ts
setIsHost(sessionUser?.id === data.owner_id);
```

If `sessionUser` is `undefined` (unauthenticated), the comparison is `undefined === owner_id` → `false`. Guests are always non-hosts.

**No error handling** — if either request fails, `data` will be `null` and both `setIsPublic` / `setIsHost` are skipped. `setLoading(false)` always runs (no `try/finally` — falls through naturally). If both requests reject, the `loading` state stays `true` since `setLoading(false)` is inside the `if (data)` branch? 

> ⚠️ **Bug:** `setLoading(false)` is **outside** the `if (data)` block at the bottom of `fetchState`. This is correct — it always runs. However, if `schemaRes` itself throws (network error, not just a Supabase error), the entire `async` function bubbles the rejection unhandled — `setLoading(false)` never runs, and the toggle in the Embed tab remains permanently disabled.

---

## 6. Actions

### `togglePublic()`

```ts
const togglePublic = async () => {
  if (!id) return;
  const nextState = !isPublic;
  setIsPublic(nextState);       // Optimistic update

  const { error } = await supabase
    .from('schemas')
    .update({ is_public: nextState })
    .eq('id', id);

  if (error) {
    setIsPublic(!nextState);    // Rollback on error
    showToast('Failed to update privacy setting', 'error');
  } else {
    showToast(nextState ? 'Schema is now public' : 'Schema is now private', 'success');
  }
};
```

**Optimistic UI pattern** — immediately flips the toggle, then rolls back if the Supabase update fails.

> No `isHost` guard on `togglePublic` — any user who can see the Embed tab and toggle the switch could attempt to flip `is_public`. The Supabase RLS policy must enforce that only the owner can update `is_public`. The UI renders the toggle on the Embed tab for everyone (since `isPublic` and `isHost` checks are separate), but Supabase will reject the update for non-owners at the database level.

### `copyEmbed()`

```ts
const embedCode = `<iframe src="${window.location.origin}/embed/${id}" width="100%" height="600" style="border:1px solid #333; border-radius:12px; overflow:hidden;" allow="clipboard-write"></iframe>`;

const copyEmbed = async () => {
  await navigator.clipboard.writeText(embedCode);
  showToast('Embed code copied!');
};
```

The embed iframe points to `/embed/:id` — a separate page (`EmbedViewer.tsx`) that renders a read-only React Flow canvas of the public schema.

`showToast('Embed code copied!')` — called without a second `type` argument. The `showToast` signature in `useUIStore` likely defaults to `'info'` when no type is provided.

`copyEmbed` does not handle clipboard permission failure — if `navigator.clipboard.writeText` rejects (non-HTTPS, permission denied), the error is unhandled.

### Collab Link Copy

```ts
navigator.clipboard.writeText(window.location.href);
showToast('Collaborative link copied!', 'success');
onClose();
```

Uses `window.location.href` — the current full URL including the schema ID path. This is the Yjs room URL — anyone opening this link joins the same live session. Error handling not present.

### `copyShareLink()` — Stateless

```ts
copyShareLink();
onClose();
```

Delegates to `useShareLink.copyShareLink()` which LZ-string encodes the current schema state into the URL hash and writes it to the clipboard. Documented fully in `hooks.md`. The modal closes immediately after.

---

## 7. Tab 1 — Real-time Collab

**Content:**
- Description paragraph
- **Network Status** indicator — live from `useYjsStore().connected`
  - `● Live Syncing` (green `#10b981`) when connected
  - `○ Offline` (muted) when not connected
- **Collaborative URL** — read-only `<input>` displaying `window.location.href`
- **Copy Link** button — writes `window.location.href` to clipboard + closes modal
- **Access Role** box — shows `Host` (green) or `Guest` (muted)
- **Allow Guest Editors** toggle — only visible to hosts (`{isHost && ...}`)

### Allow Guest Editors Toggle

```tsx
{isHost && (
  <div>
    <div>Allow Guest Editors</div>
    <div>If disabled, guests will be locked to View-Only mode.</div>
    <label className="toggle-switch">
      <input type="checkbox"
             checked={allowGuestEdits}
             onChange={e => setAllowGuestEdits(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  </div>
)}
```

`allowGuestEdits` + `setAllowGuestEdits` come from `useSchemaStore`. The store persists this value and broadcasts it via Yjs — the `yjsStore` "Zero-Trust" patch reads this flag and blocks structural edits from guests when disabled. See `yjsStore.md` documentation.

---

## 8. Tab 2 — Stateless Link

**Content:**
- Description of the stateless/serverless sharing model
- Warning callout (amber left border) explaining:
  - Recipients see a read-only snapshot of the schema at time of link generation
  - Future changes are **not** reflected in the link
- **Generate & Copy Stateless Link** button (amber/warning styled)

**Key warning accurately described:** The stateless link is a snapshot — it does not stay in sync with future edits. This is the fundamental difference from the Collab tab.

```ts
onClick={() => { copyShareLink(); onClose(); }}
```

Calls `useShareLink.copyShareLink()` and closes. No loading state — `copyShareLink` runs synchronously (LZ-string compression is CPU-bound but fast for typical schemas).

---

## 9. Tab 3 — Publish & Embed

**Content:**
- Description: "Make this schema public to embed..."
- **Public Access** toggle — `is_public` flag in Supabase (disabled while `loading`)
- When `isPublic === true`, shows:
  - **Embed Code textarea** (read-only) — click to select all
  - **Copy iframe code** button

### Public Access Toggle

```tsx
<label className="toggle-switch">
  <input type="checkbox"
         checked={isPublic}
         onChange={togglePublic}
         disabled={loading} />
  <span className="toggle-slider" />
</label>
```

`disabled={loading}` — prevents toggling before the initial state is fetched. Once `loading` is `false`, any user can attempt to toggle (RLS enforced at DB level).

### Embed Code

```ts
const embedCode = `<iframe
  src="${window.location.origin}/embed/${id}"
  width="100%"
  height="600"
  style="border:1px solid #333; border-radius:12px; overflow:hidden;"
  allow="clipboard-write"
></iframe>`;
```

**Embed URL:** `{origin}/embed/{schemaId}` — e.g. `https://schemaforge.io/embed/abc-123`.

**`allow="clipboard-write"`** — grants the embedded canvas permission to copy text (e.g. for the copy SQL button in the embed view).

**Hardcoded dimensions:** `width="100%" height="600"` — basic defaults; users would likely edit the height for their use case.

**`readOnly` textarea with click-to-select:**
```tsx
<textarea readOnly value={embedCode} rows={4}
          onClick={e => e.currentTarget.select()} />
```

Clicking inside the textarea selects all text — useful for manual keyboard copy. A smart UX detail.

---

## 10. JSX Structure

```
<div class="share-modal-overlay">   (backdrop — click to close)
  <div class="share-modal">         (modal panel — stops propagation)

    Header
    ├── <h2>Share Schema</h2>
    └── [✕] close button

    Tab Bar
    ├── [Real-time Collab]   (activeTab === 'collab')
    ├── [Stateless Link]     (activeTab === 'stateless')
    └── [Publish & Embed]    (activeTab === 'embed')

    Body — conditional on activeTab:

    ── Collab Tab ──────────────────────────────
    ├── Description
    ├── Network Status     ● Live Syncing / ○ Offline
    ├── Input: window.location.href
    ├── [Copy Link] → clipboard + close
    └── Access Role box
          ├── "Host" or "Guest" badge
          └── (if isHost):
                Allow Guest Editors label + toggle-switch

    ── Stateless Tab ────────────────────────────
    ├── Description
    └── Warning callout (amber border-left)
          ├── "Serverless Sharing" heading
          ├── Read-only snapshot warning
          └── [Generate & Copy Stateless Link]

    ── Embed Tab ────────────────────────────────
    ├── Description
    ├── Public Access row:
    │     ├── "Public Access" + Enabled/Disabled status
    │     └── toggle-switch (disabled while loading)
    └── (if isPublic):
          ├── "Embed Code (iframe)" label
          ├── <textarea readOnly> (click → select all)
          └── [Copy iframe code]

  </div>
</div>
```

---

## 11. Notable Patterns & Caveats

| | Detail |
|---|---|
| **Optimistic `togglePublic`** | Flips `isPublic` immediately then rolls back on error — standard optimistic UI. Correctly reverses on failure |
| **No `isHost` guard on `togglePublic`** | The toggle is available to all users on the Embed tab. Non-owners will get a Supabase RLS rejection, but the UI doesn't proactively block or hide it for guests |
| **`copyEmbed` / collab copy don't handle clipboard errors** | `navigator.clipboard.writeText` can reject on non-HTTPS or permission denial — both call sites have no `.catch()` |
| **Network error leaves `loading: true`** | If the initial `fetchState()` throws (network failure), `setLoading(false)` never runs (it's not in a `try/finally`) — the Public Access toggle stays permanently disabled |
| **`showToast` called without type on `copyEmbed`** | `showToast('Embed code copied!')` — missing second argument. Likely defaults to 'info' but worth standardizing |
| **`embedCode` is a module-level-like computed string** | Defined at the top of the component body on every render — same string every render if `id` / `origin` don't change. Could be `useMemo` but it's cheap |
| **Embed tab accessible to guests** | Non-public schemas can still be opened to the Embed tab by guests — Supabase protects the actual toggle but the textarea can show `embedCode` for a schema the guest doesn't own |
| **`is_public` toggle affects Community Templates** | The Community Templates page and `PublicTemplates.tsx` query `is_public === true` schemas. Toggling this flag effectively publishes the schema to the public gallery |
| **Stateless link with large schemas** | `copyShareLink` LZ-string-encodes the full schema into the URL hash — very large schemas (many tables/fields) may produce URLs exceeding browser limits (~2,083 chars for some browsers, ~8,192 for modern ones) |
| **`allowGuestEdits` is schema-store state** | It's persisted and broadcast via Yjs, not stored in Supabase — this means guest edit permission is reset if the host refreshes without a prior Yjs sync |

---

## Sharing Modes — Technical Comparison

```
┌──────────────────┬──────────────────────────────────────────────────────┐
│ Mode             │ Mechanism                                             │
├──────────────────┼──────────────────────────────────────────────────────┤
│ Real-time Collab │ window.location.href (e.g. /app/abc-123)             │
│                  │ → Yjs WebSocket (y-websocket) room = schemaId        │
│                  │ → Live CRDT sync; guests join the Yjs room           │
│                  │ → readOnly controlled by allowGuestEdits + yjsStore  │
├──────────────────┼──────────────────────────────────────────────────────┤
│ Stateless Link   │ window.location.origin/#<lz-base64-encoded-schema>   │
│                  │ → useShareLink.copyShareLink()                        │
│                  │ → Schema state embedded in URL hash (no DB)          │
│                  │ → Recipients load schema from hash; readOnly forced   │
├──────────────────┼──────────────────────────────────────────────────────┤
│ Publish & Embed  │ Supabase: schemas.is_public = true                   │
│                  │ → /embed/:id page (EmbedViewer.tsx)                  │
│                  │ → Fetches schema from DB; read-only iframe canvas     │
│                  │ → Also surfaces schema in Community Templates page    │
└──────────────────┴──────────────────────────────────────────────────────┘
```

---

*Generated documentation for SchemaForge — `src/components/share/ShareModal.tsx`*
