# `Settings.tsx` — Page Documentation

> **Location:** `src/pages/Settings.tsx`  
> **Type:** React Page Component — TypeScript/TSX  
> **Route:** `/app/settings` (authenticated, reached via TopBar Settings button)  
> **Purpose:** A two-tab settings page for authenticated users. **Profile tab:** display name editing + read-only email + account deletion (locked). **Developer API tab:** MCP API key lifecycle management (generate, list, revoke) with MCP client setup instructions. No public nav or footer — rendered inside the authenticated `AppLayout`.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [State](#3-state)
4. [Effect: Sync `displayName` from Session](#4-effect-sync-displayname-from-session)
5. [Effect: Fetch API Keys on Tab Switch](#5-effect-fetch-api-keys-on-tab-switch)
6. [Tab: Profile](#6-tab-profile)
7. [Tab: Developer API](#7-tab-developer-api)
8. [Sidebar Navigation](#8-sidebar-navigation)
9. [JSX Structure](#9-jsx-structure)
10. [Notable Patterns & Caveats](#10-notable-patterns--caveats)

---

## 1. File Overview

`Settings` is a **two-pane settings shell** — a narrow left sidebar with tab navigation and a right content pane that switches between "Profile" and "Developer API" views. It has no `PublicNav` or `Footer` — it's designed to render inside `AppLayout` which provides the outer chrome.

The page manages two distinct feature areas:

| Tab | Feature | Backend |
|---|---|---|
| Profile | Display name update | `supabase.auth.updateUser()` |
| Developer API | API key CRUD, MCP setup | `server/routes/apikeys.js` (REST) |

---

## 2. Dependencies & Imports

```tsx
import { useAuthStore } from '../store/authStore';
import { supabase }     from '../lib/supabase';
import { useUIStore }   from '../store/ui';
```

| Import | Role |
|---|---|
| `useAuthStore` | `session` — user ID, email, user metadata, access token |
| `supabase` | `supabase.auth.updateUser()` for profile mutation |
| `useUIStore` | `showToast`, `showDialog` — feedback and confirmation dialogs |

API key operations go through the Express server (`VITE_API_URL`), not Supabase directly.

---

## 3. State

| State | Type | Initial | Description |
|---|---|---|---|
| `activeTab` | `'profile' \| 'api'` | `'profile'` | Controls which content pane is shown |
| `displayName` | `string` | `''` | Buffered profile name (sync'd from session on mount) |
| `isSaving` | `boolean` | `false` | Profile save in-flight flag |
| `apiKeys` | `any[]` | `[]` | List of existing API keys (from server) |
| `loadingKeys` | `boolean` | `false` | Key list fetch in-flight flag |
| `newlyGeneratedKey` | `string \| null` | `null` | The raw (plaintext) newly generated key — shown once only |
| `isCopied` | `boolean` | `false` | Copy-button feedback (true for 3s after copy) |
| `newKeyLabel` | `string` | `'My Secret Key'` | Controlled input for the new key's label |

---

## 4. Effect: Sync `displayName` from Session

```ts
useEffect(() => {
  if (session?.user?.user_metadata?.display_name) {
    setDisplayName(session.user.user_metadata.display_name);
  }
}, [session]);
```

Reads `display_name` from Supabase `user_metadata` on mount and when session updates. Only sets `displayName` if `display_name` is truthy — new accounts with no display name start with an empty input rather than the email address.

---

## 5. Effect: Fetch API Keys on Tab Switch

```ts
useEffect(() => {
  if (activeTab === 'api' && session?.access_token) {
    fetchApiKeys();
  }
}, [activeTab, session?.access_token]);
```

**Lazy-loads API keys** — only fetches when the API tab is first activated (or the access token changes). Keys are not pre-fetched on mount. If the user never visits the API tab, no fetch occurs.

---

## 6. Tab: Profile

### Display Name Editing

```tsx
<input type="text" value={displayName}
       onChange={e => setDisplayName(e.target.value)}
       placeholder="Enter your name" />
```

Controlled input. Saved via `handleSaveProfile()`:

```ts
const handleSaveProfile = async () => {
  setIsSaving(true);
  const { error } = await supabase.auth.updateUser({
    data: { display_name: displayName }
  });
  setIsSaving(false);
  if (error) setToast('Failed to update profile: ' + error.message, 'error');
  else       setToast('Profile updated successfully!', 'success');
};
```

Calls `supabase.auth.updateUser({ data: { display_name } })` — writes to Supabase Auth `user_metadata`. The Save button is `disabled={isSaving}` with `opacity: 0.7` and `cursor: not-allowed` during save.

**Cancel button:**
```tsx
<button onClick={() => setDisplayName(session?.user?.user_metadata?.display_name || '')}>
  Cancel
</button>
```
Resets `displayName` to the last saved value from session. Does not call `setEditingName(false)` — the input remains visible; this just reverts the buffered value.

### Email Field (Read-only)

```tsx
<input type="email" defaultValue={session?.user?.email || ''} readOnly />
```

`readOnly` + `opacity: 0.7` — visually communicates non-editability. Uses `defaultValue` (uncontrolled) rather than `value` — the value is static and never changes.

### Danger Zone — Delete Account

```tsx
<button onClick={() => setToast('Account deletion is locked during Beta.', 'info')}>
  Delete account
</button>
```

**Intentionally disabled** — clicking shows an `'info'` toast: `"Account deletion is locked during Beta."` No `supabase.auth.admin.deleteUser()` or similar call exists. The button is visually present (red text, "Danger zone" label) but performs no destructive action.

---

## 7. Tab: Developer API

### Purpose

Manages API keys used to authenticate MCP (Model Context Protocol) clients such as Cursor and Windsurf, allowing IDEs to read and update schemas from their chat interfaces.

### `fetchApiKeys()`

```ts
const fetchApiKeys = async () => {
  setLoadingKeys(true);
  try {
    const res = await fetch(`${baseUrl}/api/keys`, {
      headers: { 'Authorization': `Bearer ${session?.access_token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setApiKeys(data);
  } catch (err: any) {
    console.error(err);     // Silent failure — no toast shown
  } finally {
    setLoadingKeys(false);
  }
};
```

**Silent error** — fetch failures are logged to console but **no toast or UI error** is shown. The user sees `"No API keys generated yet."` even if the fetch failed.

### `handleGenerateKey()`

```ts
const handleGenerateKey = async () => {
  if (!newKeyLabel.trim()) {
    setToast('Please provide a name for your key.', 'error');
    return;
  }
  const res = await fetch(`${baseUrl}/api/keys/generate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${session?.access_token}`,
               'Content-Type': 'application/json' },
    body: JSON.stringify({ label: newKeyLabel })
  });
  const data = await res.json();
  // ...
  setNewlyGeneratedKey(data.rawKey);   // Show raw key once
  setApiKeys([data.newKey, ...apiKeys]);  // Prepend to list
  setNewKeyLabel('My Secret Key');     // Reset label input
};
```

**`rawKey` shown once** — the server returns the plaintext key only at generation time (it's bcrypt-hashed in the DB). After the user navigates away or generates another key, `newlyGeneratedKey` is no longer accessible. The UI warns: *"You won't be able to see it again!"*

**Key list item vs raw key:** `data.rawKey` is the full plaintext (shown in the reveal box). `data.newKey` is the sanitized row (with `key_prefix` only — the first 8 chars) added to the key list.

### Newly Generated Key Reveal Box

```tsx
{newlyGeneratedKey && (
  <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', ... }}>
    <div>"Store this key securely!"</div>
    <div>"You won't be able to see it again!"</div>
    <div>  {/* Monospace display */}
      {newlyGeneratedKey}
      <button onClick={handleCopyKey}>
        {isCopied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  </div>
)}
```

Green-tinted reveal panel. Copy button:
- Calls `navigator.clipboard.writeText(newlyGeneratedKey)`
- Sets `isCopied = true` for 3 seconds then resets
- Button text toggles `'Copy'` → `'Copied!'` with green background

### `handleDeleteKey(id)` — Revoke

```ts
const handleDeleteKey = (id: string) => {
  showDialog({
    title: 'Delete API Key',
    message: 'Are you sure? Any MCP server using this key will immediately lose access.',
    type: 'confirm',
    onConfirm: async () => {
      const res = await fetch(`${baseUrl}/api/keys/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) { /* toast error */ }
      setApiKeys(prev => prev.filter(k => k.id !== id));
    }
  });
};
```

Confirmation via `showDialog()` — consequence is clearly stated: MCP servers using the key lose access immediately. Uses functional update (`prev => ...`) — does not suffer from the stale closure issue present in `Dashboard.tsx`'s `handleDelete`.

### Key List Item Display

```tsx
<div>{key.label}</div>
<div style={{ fontFamily: 'monospace' }}>{key.key_prefix}•••••••••••••••••</div>
<button onClick={() => handleDeleteKey(key.id)}>Revoke</button>
```

Only the `key_prefix` (first 8 chars of the raw key) is displayed — the rest is masked with bullets. The full key is never shown after generation.

### MCP Setup Instructions

A static code block with a template `mcp.json` config:

```json
"mcpServers": {
  "Modellr": {
    "command": "node",
    "args": ["C:/Web Development/Modellr/mcp-server/index.js"],
    "env": { "SCHEMA_FORGE_TOKEN": "YOUR_RAW_KEY_HERE" }
  }
}
```

> ⚠️ **Hardcoded local path:** The `args` path `"C:/Web Development/Modellr/mcp-server/index.js"` is the **developer's local machine path** — not a published npm package path or a relative path. Any user copy-pasting this will get a path that doesn't exist on their system. Should reference a published npm package (e.g. `npx @Modellr/mcp`) or an environment-relative path.

---

## 8. Sidebar Navigation

```tsx
const navItemStyle = (tabName: 'profile' | 'api') => ({
  padding: '8px 16px',
  borderRadius: '8px',
  background:  activeTab === tabName ? 'var(--surface-base)' : 'transparent',
  color:       activeTab === tabName ? 'var(--text-primary)' : 'var(--text-secondary)',
  fontWeight:  activeTab === tabName ? 600 : 400,
  cursor: 'pointer',
  border: activeTab === tabName ? '1px solid var(--border-subtle)' : '1px solid transparent',
});
```

Dynamic style function — returns inline style object for a given tab. Active tab has filled background + border + bold text.

**Four sidebar items:**

| Item | Type | Tab |
|---|---|---|
| Profile | Active tab | `'profile'` |
| Billing | Disabled (cursor: not-allowed) | — |
| Developer API | Active tab | `'api'` |
| Notifications | Disabled (cursor: not-allowed) | — |

"Billing" and "Notifications" are `cursor: not-allowed` display-only items — no `onClick` handler, no tooltip, no "Coming Soon" popover. The text `"(Coming Soon)"` is part of the label.

Sidebar items use `<div onClick>` — no `role="tab"` or `aria-selected` for ARIA tab semantics.

---

## 9. JSX Structure

```
<div> (flex, full width/height)
  │
  └── <main> (maxWidth:1000px, flex row, gap:48px)
        │
        ├── <aside> (width:240px)
        │     ├── [Profile]              → setActiveTab('profile')
        │     ├── Billing (Coming Soon)  → disabled, no action
        │     ├── [Developer API]        → setActiveTab('api')
        │     └── Notifications (Soon)   → disabled, no action
        │
        └── <section> (flex:1, content pane)
              │
              ├── {activeTab === 'api' && (
              │     ├── <h1>Developer API & MCP Access</h1>
              │     ├── MCP Config card (purple border)
              │     │     ├── Header: "MCP Server Configuration" [Phase 5 badge]
              │     │     ├── [Key label input] [+ Generate New Key]
              │     │     ├── Description paragraph
              │     │     ├── {newlyGeneratedKey → green reveal banner + copy}
              │     │     ├── Key list (loading / empty / items)
              │     │     │     └── {apiKeys.map → label, prefix•••, [Revoke]}
              │     │     └── MCP Setup Instructions (static code block)
              │   )}
              │
              └── {activeTab === 'profile' && (
                    ├── <h1>Profile Settings</h1>
                    ├── [Display Name input]   — editable, controlled
                    ├── [Email input]          — readOnly, uncontrolled (defaultValue)
                    ├── [Save changes] [Cancel]
                    └── Danger zone
                          └── [Delete account] → locked toast (Beta)
                  )}
```

---

## 10. Notable Patterns & Caveats

| | Detail |
|---|---|
| **MCP config has hardcoded local path** | `"C:/Web Development/Modellr/mcp-server/index.js"` is a dev machine path — unusable for real users |
| **`fetchApiKeys` silently fails** | Network/server errors log to console only — no UI error shown; API tab renders as if empty on failure |
| **"Delete account" is locked** | Shows `'info'` toast: `"Account deletion is locked during Beta."` — no Supabase user deletion implemented |
| **"Billing" and "Notifications" are placeholder tabs** | No tab content, no navigation, just disabled labels with "(Coming Soon)" — no popover or tooltip |
| **`newlyGeneratedKey` not cleared on tab switch** | Switching to Profile and back restores the reveal banner — but `fetchApiKeys` re-runs, which re-fetches the list (the raw key is not re-fetched, just still in state) |
| **No `<form>` for profile save** | Same as `Login.tsx` — bare inputs with no `<form>` wrapper, so `Enter` doesn't trigger save |
| **Email field uses `defaultValue`** | Uncontrolled — email cannot be changed. If session email changes externally, the field won't update without unmounting. Harmless for a read-only field |
| **All API calls include raw JWT** | `session?.access_token` sent as Bearer token — standard pattern. Token expiry not handled (if token expires mid-session, API calls return 401 silently) |
| **`navItemStyle()` is a function, not `useMemo`** | Called on every render for each tab item — creates new objects each time. Negligible perf cost for 4 items |
| **`rgb(162,107,252)` used for generate button + MCP card border** | Same hardcoded brand purple as everywhere else |
| **"Phase 5" badge on MCP section** | Stale roadmap label — MCP gateway is implemented in `server/routes/mcpGateway.js` |

---

## API Key Data Model (from server response)

| Field | At generation (`rawKey` response) | In key list (`newKey` / `apiKeys` items) |
|---|---|---|
| `rawKey` | Full plaintext key (shown once) | Never returned |
| `id` | In `newKey.id` | `key.id` |
| `label` | In `newKey.label` | `key.label` |
| `key_prefix` | In `newKey.key_prefix` | `key.key_prefix` |

The `key_prefix` is used for visual identification (shown as `{prefix}•••••••••`) — lets users recognize which key is which even though the full key is hidden.

---

## Auth Flow for API Key Operations

```
All API key operations:
  ├── Authorization header: Bearer {session.access_token}
  ├── Server validates JWT via Supabase admin API
  └── Server scopes operations to session.user.id (RLS equivalent at app level)

GET    /api/keys            → fetchApiKeys()   → setApiKeys(data)
POST   /api/keys/generate   → handleGenerateKey()
                                → setNewlyGeneratedKey(data.rawKey)  ← ONE TIME only
                                → setApiKeys([data.newKey, ...apiKeys])
DELETE /api/keys/:id        → handleDeleteKey()
                                → setApiKeys(prev => prev.filter(...))
```

---

*Generated documentation for Modellr — `src/pages/Settings.tsx`*
