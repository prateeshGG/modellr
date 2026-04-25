# `Dashboard.tsx` — Page Documentation

> **Location:** `src/pages/Dashboard.tsx`  
> **Type:** React Page Component — TypeScript/TSX  
> **Route:** `/app` (index route under `AppLayout`)  
> **Purpose:** The authenticated user's project management home. Loads all schemas from Supabase, displays them as project cards, manages CRUD operations (create, duplicate, export, delete), enforces the free-tier 3-schema limit, shows a pro upgrade upsell at the limit, and presents a sandbox-claim modal for users arriving from an anonymous canvas session.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Constants](#3-constants)
4. [State](#4-state)
5. [Effect 1 — Load Schemas](#5-effect-1--load-schemas)
6. [Effect 2 — Check for Sandbox Data](#6-effect-2--check-for-sandbox-data)
7. [Handler: `handleCreateNew(templateId?)`](#7-handler-handlecreatenewtemplateid)
8. [Handler: `handleDuplicate(e, schema)`](#8-handler-handleduplicatee-schema)
9. [Handler: `handleExport(e, schema)`](#9-handler-handleexporte-schema)
10. [Handler: `handleDelete(e, id)`](#10-handler-handledeletee-id)
11. [Handler: `handleClaimSandbox()`](#11-handler-handleclaimsandbox)
12. [Derived Values](#12-derived-values)
13. [JSX Structure](#13-jsx-structure)
14. [Notable Patterns & Caveats](#14-notable-patterns--caveats)

---

## 1. File Overview

`Dashboard` is the **project hub** for authenticated users. It is the first page after login and the home base for managing multiple schemas. It orchestrates:

- **Schema fetching** from Supabase on mount
- **Three CRUD operations** (create, duplicate, delete) that write to Supabase
- **One client-side export** (JSON download, no server)
- **Free tier enforcement** (cap at `FREE_TIER_LIMIT = 3` schemas)
- **Sandbox claim flow** — detects anonymous work from `localStorage` and offers to promote it to a saved cloud schema
- **Template quick-pick** — four hardcoded starter template tiles that create pre-seeded schemas

---

## 2. Dependencies & Imports

```tsx
import { supabase }    from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useUIStore }   from '../store/ui';
import { getTemplate }  from '../utils/templates';
import { DashboardHeader, DashboardStats, ProjectCard } from '../components/dashboard/...';
```

| Import | Role |
|---|---|
| `supabase` | All schema CRUD (`schemas` table) |
| `useAuthStore` | `session` — current user ID |
| `useUIStore` | `showDialog` — confirmation dialogs |
| `getTemplate` | Looks up template data by ID for pre-seeded schema creation |
| `DashboardHeader` | Search, "New Project" button, title |
| `DashboardStats` | Usage stats bar (schemas used / limit) |
| `ProjectCard` | Individual schema card with actions |

---

## 3. Constants

```ts
const FREE_TIER_LIMIT = 3;
```

**Hard-coded free tier cap** — users can create at most 3 schemas without upgrading. Enforced client-side in `handleCreateNew` and `handleDuplicate`. No server-side enforcement is visible — a user who bypasses the frontend (e.g. with a direct API call) could create more than 3 schemas.

---

## 4. State

| State | Type | Initial | Description |
|---|---|---|---|
| `schemas` | `any[]` | `[]` | All schemas owned by the current user |
| `searchQuery` | `string` | `''` | Current dashboard search filter |
| `showClaimModal` | `boolean` | `false` | Whether the sandbox-claim modal is visible |
| `sandboxData` | `any` | `null` | Parsed `localStorage.sandbox_schema` content |

All schema items typed as `any[]` — no TypeScript type for the Supabase schema row shape used in `Dashboard`.

---

## 5. Effect 1 — Load Schemas

```ts
useEffect(() => {
  async function loadSchemas() {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('schemas')
      .select('*')
      .order('updated_at', { ascending: false });
    if (data) setSchemas(data);
  }
  loadSchemas();
}, [session]);
```

**Triggers:** On mount and whenever `session` changes (e.g. after sign-in).

**Query:** `SELECT * FROM schemas ORDER BY updated_at DESC` — fetches the user's own schemas. Supabase RLS (`owner_id = auth.uid()`) filters to the current user's rows automatically — no `WHERE owner_id = ...` clause needed.

**Loading state:** `isLoading` starts as true and sets to false once the query returns. The UI displays skeleton loading states before the data appears.

**Error handling:** The destructured `error` from the Supabase response is ignored — `if (data) setSchemas(data)`. Network failures or RLS-denied queries silently no-op.

---

## 6. Effect 2 — Check for Sandbox Data

```ts
useEffect(() => {
  const dismissedThisSession = sessionStorage.getItem('dismissed_sandbox_claim');
  if (dismissedThisSession) return;

  const local = localStorage.getItem('sandbox_schema');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (parsed.tables && parsed.tables.length > 0) {
        setSandboxData(parsed);
        setShowClaimModal(true);
      }
    } catch {}
  }
}, []);
```

**Triggers:** Once on mount only (empty deps).

**Purpose:** Detects whether the user had an anonymous canvas session before signing in. The anonymous editor saves to `localStorage.sandbox_schema`. On the dashboard, this is checked and a modal prompts the user to claim it.

**Two-level dismissal guard:**
- `sessionStorage.dismissed_sandbox_claim` — skipped if the user dismissed during this browser session (tab closed → resets)
- The modal isn't shown if `parsed.tables.length === 0` — empty sandboxes are not worth claiming

**`try/catch {}` swallows** corrupt `localStorage` JSON silently.

---

## 7. Handler: `handleCreateNew(templateId?)`

```ts
const handleCreateNew = async (templateId?: string) => {
  if (!session?.user?.id) return;
  if (schemas.length >= FREE_TIER_LIMIT) return;   // Hard stop at 3

  let initialState = null;
  let name = 'Untitled Project';

  if (templateId) {
    const tpl = getTemplate(templateId);
    if (tpl) {
      name = tpl.label + ' Template';
      initialState = { tables: tpl.tables, relationships: tpl.relationships, viewport: { x: 0, y: 0, zoom: 1 } };
    }
  }

  const { data } = await supabase
    .from('schemas')
    .insert([{ owner_id: session.user.id, name, canvas_state: initialState }])
    .select().single();

  if (data) navigate(`/app/${data.id}`);
};
```

**Two paths:**
1. **Blank schema** (`templateId` undefined) → `canvas_state: null`, name `'Untitled Project'`
2. **Template schema** (`templateId` provided) → `canvas_state: { tables, relationships, viewport }`, name `'{Template Label} Template'`

**Post-insert navigation:** `navigate('/app/{newId}')` — uses React Router (not `window.location.href`) since this is within the SPA context.

**Race condition:** No optimistic update — UI doesn't add the new card until navigation happens. The user is immediately redirected to the editor; the dashboard doesn't need to show the new card.

**Free-tier check:** `schemas.length >= FREE_TIER_LIMIT` checked against local state — if schemas were created in another tab, the check could be stale.

---

## 8. Handler: `handleDuplicate(e, schema)`

```ts
const handleDuplicate = async (e: React.MouseEvent, schema: any) => {
  e.stopPropagation();   // Prevent card click → navigate
  if (!session?.user?.id || schemas.length >= FREE_TIER_LIMIT) return;

  const { data } = await supabase
    .from('schemas')
    .insert([{ owner_id: session.user.id, name: schema.name + ' (Copy)', canvas_state: schema.canvas_state }])
    .select().single();

  if (data) setSchemas([data, ...schemas]);  // Prepend — newest first
};
```

**Optimistic prepend:** Unlike create (which navigates away), duplicate stays on the dashboard and prepends the new schema to the local `schemas` list. This is **not a rollback-safe optimistic update** — if the insert fails, the state is not updated (correct), but `error` from the Supabase response is completely ignored.

**Schema data copied verbatim:** `canvas_state: schema.canvas_state` — the entire canvas state (tables, relationships, positions, notes, viewport) is duplicated as-is. The copy gets `' (Copy)'` appended to the name.

---

## 9. Handler: `handleExport(e, schema)`

```ts
const handleExport = (e: React.MouseEvent, schema: any) => {
  e.stopPropagation();
  const dataStr = typeof schema.canvas_state === 'string'
    ? schema.canvas_state
    : JSON.stringify(schema.canvas_state, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${schema.name.replace(/\s+/g, '_').toLowerCase()}_schema.json`;
  link.click();
  URL.revokeObjectURL(url);
};
```

**Client-side JSON download** — no server round-trip. Creates a `Blob` from the `canvas_state` JSON and triggers a `<a download>` click.

**Filename:** `{schema_name_snake_case}_schema.json` — spaces replaced with underscores, lowercased.

**`typeof schema.canvas_state === 'string'` guard:** Supabase `jsonb` columns can be returned as either a parsed object or as a raw string depending on the client. The guard handles both.

**`URL.revokeObjectURL(url)`** called synchronously after `link.click()` — this is technically a race condition on some browsers, where revoking before the download starts could prevent it. In practice browsers handle this correctly, but the safer pattern is a short `setTimeout(() => URL.revokeObjectURL(url), 100)`.

---

## 10. Handler: `handleDelete(e, id)`

```ts
const handleDelete = (e: React.MouseEvent, id: string) => {
  e.stopPropagation();
  showDialog({
    title:   'Delete Schema',
    message: 'Are you sure you want to permanently delete this schema? This action cannot be undone.',
    type:    'confirm',
    onConfirm: async () => {
      await supabase.from('schemas').delete().eq('id', id);
      setSchemas(schemas.filter(s => s.id !== id));
    }
  });
};
```

**The only destructive operation with a confirmation dialog** — uses `useUIStore.showDialog()` → `DialogModal` renders a red "Confirm" button. Other operations (`handleCreateNew`, `handleDuplicate`) run immediately.

**Optimistic local update on confirm:** Schema removed from local `schemas` state immediately after the await — no error handling if the Supabase delete fails.


---

## 11. Handler: `handleClaimSandbox()`

```ts
const handleClaimSandbox = async () => {
  if (!session?.user?.id || !sandboxData) return;
  const { data } = await supabase
    .from('schemas')
    .insert([{ owner_id: session.user.id, name: 'Saved Sandbox', canvas_state: sandboxData }])
    .select().single();
  if (data) {
    localStorage.removeItem('sandbox_schema');  // Clear sandbox after claiming
    navigate(`/app/${data.id}`);                // Open the claimed schema
  }
};
```

**Promotes sandbox to cloud:** Inserts the `localStorage.sandbox_schema` object as a new Supabase schema row named `'Saved Sandbox'`. On success, clears `localStorage` and navigates to the new schema.

**No FREE_TIER_LIMIT check** — `handleClaimSandbox` does not check `schemas.length >= FREE_TIER_LIMIT`. A user at the 3-schema limit can still claim their sandbox, pushing them to 4 schemas.

**Discard flow** (the other button):
```ts
onClick={() => {
  localStorage.removeItem('sandbox_schema');
  sessionStorage.setItem('dismissed_sandbox_claim', 'true');
  setShowClaimModal(false);
}}
```
Removes the sandbox data **and** sets a `sessionStorage` flag — re-opening the dashboard tab won't re-show the modal even if somehow the `localStorage` check runs again.

---

## 12. Derived Values

```ts
const filteredSchemas = schemas.filter(s =>
  s.name.toLowerCase().includes(searchQuery.toLowerCase())
);

const limitReached = schemas.length >= FREE_TIER_LIMIT;
```

Both recomputed on every render — no `useMemo`. Fast for up to 3 schemas (free tier).

`filteredSchemas` is what the project grid renders. `schemas` (unfiltered) is passed to `DashboardStats` and used for limit checks.

---

## 13. JSX Structure

```
<>
  <main class="dashboard-main">

    <DashboardHeader
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      onCreateNew={() => handleCreateNew()}
      limitReached={limitReached}
    />

    <DashboardStats schemas={schemas} limit={FREE_TIER_LIMIT} />

    [Pro Upgrade Banner — shown when limitReached]
    border: 1px solid rgb(162,107,252)   (brand purple)
    ├── "Unlock unlimited projects" heading
    ├── Free tier limit message
    └── [Upgrade — $12/mo] → navigate('/pricing')

    <section class="projects-section">
      header: "Your Projects"  |  "{N} projects found"

      <div class="projects-grid">
        {filteredSchemas.map → <ProjectCard key={id} ...handlers />}

        <div class="create-card" onClick={handleCreateNew()}>
          ├── "+" icon
          ├── "New Design"
          └── "Start from scratch"
        </div>
      </div>
    </section>

    <section id="templates">
      header: "Suggested Starters"

      <div style="grid; 4 columns">
        {[ecommerce, saas, blog, auth].map →
          <div onClick={() => handleCreateNew(tpl.id)}>
            {tpl.name}
          </div>
        }
      </div>
    </section>

  </main>

  {showClaimModal && (
    <div> (fixed overlay, z:9999, blur backdrop)
      <div> (modal panel)
        <h2>Save Sandbox Work?</h2>
        <p>Would you like to move the progress...</p>
        [Save to Cloud]   [Discard]
      </div>
    </div>
  )}
</>
```

---

## 14. Notable Patterns & Caveats

| | Detail |
|---|---|
| **Free tier check is client-only** | `schemas.length >= FREE_TIER_LIMIT` enforced in JS — a direct Supabase API call bypasses it |
| **`URL.revokeObjectURL` race** | Called immediately after `link.click()` — technically a race on older browsers |
| **No error handling on Supabase calls** | All handlers destructure only `data` — `error` is ignored throughout. Failed inserts/deletes silently no-op |
| **Template quick-pick hardcoded to 4 IDs** | `['ecommerce', 'saas', 'blog', 'auth']` — must match keys in `TEMPLATES` registry exactly |
| **Pro upgrade CTA has hardcoded price** | `$12/mo` hardcoded in JSX — must be updated manually if pricing changes |
| **`sandbox_schema` claim never checks schema validity** | `parsed.tables && parsed.tables.length > 0` is the only validation — deeper structure issues would silently corrupt the cloud schema |
| **`DashboardSidebar` not rendered** | The Dashboard page renders inside `AppLayout` which provides `AppSidebar`. `DashboardSidebar` (in `components/dashboard/`) is a separate component — it's unclear where it's actually used given `Dashboard.tsx` doesn't import it |
| **"New Design" card always shown** | Even when `limitReached`, the "New Design" card appears and clicking it calls `handleCreateNew()` — which silently returns early (`schemas.length >= FREE_TIER_LIMIT`). The card should be visually disabled or hidden at the limit |

---

## Schema Data Flow

```
Supabase (schemas table)
  │  SELECT * ORDER BY updated_at DESC
  ▼
schemas: any[]  (component state)
  │
  ├── filteredSchemas  (search filter)
  │     └── → ProjectCard[] (grid)
  │
  ├── schemas.length → limitReached
  │     ├── → DashboardStats (progress bar)
  │     ├── → DashboardHeader (disable New Project button)
  │     └── → Pro upgrade banner visibility
  │
  └── schemas  (unfiltered)
        └── → DashboardStats prop

Actions → Supabase writes:
  handleCreateNew   → INSERT → navigate('/app/:id')
  handleDuplicate   → INSERT → prepend to local schemas[]
  handleDelete      → DELETE → filter from local schemas[]
  handleClaimSandbox → INSERT → navigate('/app/:id')

handleExport → client-side only (no Supabase)
```

---

*Generated documentation for Modellr — `src/pages/Dashboard.tsx`*
