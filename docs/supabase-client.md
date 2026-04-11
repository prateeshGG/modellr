# `supabase.ts` — Library Documentation

> **Location:** `src/lib/supabase.ts`  
> **Type:** Singleton Client Module — TypeScript  
> **Purpose:** Initializes and exports the **single shared Supabase JavaScript client instance** used across the entire frontend application. Acts as the central integration point between the React client and the Supabase backend — used for authentication, database queries, real-time subscriptions, and storage.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Code Structure & Organization](#3-code-structure--organization)
4. [Environment Variables](#4-environment-variables)
5. [Validation & Fallback](#5-validation--fallback)
6. [Exported Client — `supabase`](#6-exported-client--supabase)
7. [How the Client Is Used Across the App](#7-how-the-client-is-used-across-the-app)
8. [Configuration Details](#8-configuration-details)
9. [Notable Patterns & Conventions](#9-notable-patterns--conventions)
10. [Known Caveats & Limitations](#10-known-caveats--limitations)
11. [Local Development Setup](#11-local-development-setup)

---

## 1. File Overview

`supabase.ts` is an **infrastructure singleton file** — small, intentionally minimal, and critical. It follows the standard Supabase JS client setup pattern: read credentials from environment variables, validate them, then create and export a single `SupabaseClient` instance that the entire app imports.

By centralizing client creation here, the app ensures:
- Only **one** client instance exists (no duplicate connections or auth state conflicts).
- Credentials are configured in **one place** — changing the project URL or key only requires updating `.env`.
- Any Supabase-aware module simply imports `{ supabase }` without needing its own setup.

---

## 2. Dependencies & Imports

```ts
import { createClient } from '@supabase/supabase-js';
```

| Import | Package | Role |
|---|---|---|
| `createClient` | `@supabase/supabase-js` | Factory function that creates a configured `SupabaseClient` |

**Package version:** `^2.101.1` (from `package.json`).

The `@supabase/supabase-js` v2 client provides:
- `supabase.auth.*` — session management, sign in/out, OAuth, token refresh
- `supabase.from(table).*` — PostgREST query builder (select, insert, update, delete, upsert)
- `supabase.channel()*` / `supabase.realtime.*` — real-time subscriptions
- `supabase.storage.*` — file storage (not currently used in SchemaForge)
- `supabase.functions.*` — Edge Function invocations (not currently used)

---

## 3. Code Structure & Organization

```
supabase.ts
├── Import createClient          (line 1)
├── Read env vars                (lines 3–4)
├── Validate + warn on missing   (lines 6–8)
└── Create + export client       (lines 10–13)
```

Total: **14 lines** — intentionally minimal. All application-level logic belongs in stores and hooks, not here.

---

## 4. Environment Variables

```ts
const supabaseUrl    = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

| Variable | Description | Where to Find |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your project's `anon` (public) key | Supabase Dashboard → Project Settings → API → `anon` `public` key |

**`VITE_` prefix explained:** Vite only exposes environment variables prefixed with `VITE_` to client-side code via `import.meta.env`. Variables without this prefix are server-side only and inaccessible in the browser bundle. Since the Supabase `anon` key is safe to expose publicly (it is Row Level Security-bound), the `VITE_` prefix is appropriate here.

These variables must be defined in a `.env` file at the project root (not committed to version control):

```env
# .env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

---

## 5. Validation & Fallback

```ts
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Supabase features will be disabled.');
}

export const supabase = createClient(
  supabaseUrl    || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
```

### Validation Strategy

- **Non-throwing:** Missing credentials emit a `console.warn` but do **not** throw an error or prevent the client from being created.
- **Placeholder fallback:** `createClient` is always called — even with invalid/placeholder values. This means:
  - The `supabase` export always exists as a valid object.
  - Every call to `supabase.from(...)`, `supabase.auth.getSession()`, etc. will fail at the network level (HTTP 400/401) rather than crashing at import time.
  - The app can still render and show unauthenticated/offline UI.

### Why Non-Throwing?

This pattern allows the app to function in degraded mode (no Supabase connection) without crashing — useful for:
- Running the canvas editor without a Supabase account (sandbox/demo mode)
- Development without `.env` configured
- Preview deployments with missing secrets

---

## 6. Exported Client — `supabase`

```ts
export const supabase = createClient(url, anonKey);
```

**Type:** `SupabaseClient` (from `@supabase/supabase-js`)

The exported `supabase` object is a fully initialized client. Key namespaces:

### `supabase.auth`

| Method | Used By | Description |
|---|---|---|
| `getSession()` | `authStore.ts` | Restore existing session on app load |
| `onAuthStateChange()` | `authStore.ts` | Listen for login/logout/token refresh |
| `signOut()` | `authStore.ts` | Sign out current user |
| `signInWithOAuth()` | Login UI | OAuth sign-in (Google, GitHub, etc.) |

### `supabase.from(table)`

| Table | Used By | Operations |
|---|---|---|
| `'users'` | `authStore.ts` | SELECT (check profile exists), INSERT (create profile) |
| `'schemas'` | `useCloudPersistence.ts` | SELECT (load), UPDATE (auto-save) |
| `'api_keys'` | `apikeys.js` (server) | SELECT, INSERT, DELETE — via server-side routes |

The client uses the **`anon` key** which is subject to Row Level Security. Users can only read/write their own rows as enforced by the RLS policies defined in `supabase/schema.sql`.

---

## 7. How the Client Is Used Across the App

```
src/lib/supabase.ts
        │
        │ import { supabase }
        ├──→ src/store/authStore.ts
        │         supabase.auth.getSession()
        │         supabase.auth.onAuthStateChange()
        │         supabase.auth.signOut()
        │         supabase.from('users').select/insert
        │
        ├──→ src/hooks/useCloudPersistence.ts
        │         supabase.from('schemas').select()
        │         supabase.from('schemas').update()
        │
        └──→ src/store/yjsStore.ts
                  (indirect — via authStore for user identity)
```

The server-side routes (`server/routes/*.js`) use their **own separate Supabase clients** initialized with `SUPABASE_SERVICE_ROLE_KEY` — they do not import from this file.

---

## 8. Configuration Details

### Session Persistence

`createClient` with default options persists the auth session to `localStorage` automatically. On page reload, `supabase.auth.getSession()` restores the session from the stored token — no explicit configuration needed.

### Token Auto-Refresh

The Supabase client automatically refreshes JWT access tokens before they expire (they expire every 1 hour by default). This is handled transparently by the client.

### No Custom Options

`createClient` is called with **no third argument** (no custom options object). Default behavior applies:
- `auth.persistSession: true` — session persisted to localStorage
- `auth.autoRefreshToken: true` — tokens auto-refreshed
- `auth.detectSessionInUrl: true` — handles OAuth redirect tokens from URL hash
- `realtime: true` — real-time features enabled

---

## 9. Notable Patterns & Conventions

- **Singleton export:** The single `export const supabase` instance is shared across all imports. Importing this module multiple times always returns the same client object (ES module singleton guarantee).
- **`VITE_` prefix convention:** Both variables use the `VITE_` prefix — semantically unusual for server-side-like configuration (noted across other docs in this project), but technically correct since the Supabase `anon` key is intentionally public.
- **Graceful degradation over hard failure:** `console.warn` + placeholder fallback allows partial functionality without Supabase — supports sandbox/offline use cases.
- **No TypeScript generics on `createClient`:** The client is untyped (`SupabaseClient<any>`). Strongly-typed Supabase clients can be generated from the DB schema via `supabase gen types typescript` — not implemented here.
- **Placed in `src/lib/`:** Following the convention of putting third-party client initializations in `lib/` (as opposed to `store/` for state or `utils/` for pure functions).

---

## 10. Known Caveats & Limitations

| Issue | Description |
|---|---|
| **No TypeScript database types** | `createClient()` without type params returns `SupabaseClient<any>` — no compile-time checking of table names, column names, or return shapes. `supabase gen types typescript` would generate a typed schema |
| **Placeholder client on missing env** | If `.env` is not configured, the app creates a client pointing at `placeholder.supabase.co`. Every DB/auth call will fail with a network error — but at network time, not import time. Error handling is the responsibility of each caller |
| **`console.warn` may be silenced** | In production builds, `console.warn` may be stripped or ignored. Missing env vars in production silently degrade all auth and DB features |
| **`anon` key visible in browser** | The `VITE_SUPABASE_ANON_KEY` is embedded in the built JavaScript bundle and visible to anyone who opens DevTools. This is by design — the anon key is safe to expose because all access is controlled by RLS policies |
| **No retry / backoff** | The Supabase client does not retry failed queries automatically (beyond token refresh). Network failures propagate directly to callers |
| **Shared across auth + data queries** | Using one client for both auth (`supabase.auth`) and data (`supabase.from`) is standard Supabase practice and has no known issues, but means any auth state change affects all concurrent queries |

---

## 11. Local Development Setup

To configure Supabase for local development:

1. Create a `.env` file in the project root (same level as `package.json`):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. Both values are available in the Supabase Dashboard under:  
   **Project Settings → API → Project URL** and **Project API Keys → `anon` `public`**

3. Run the database schema setup (once, on a new project):  
   Copy and execute `supabase/schema.sql` in the **Supabase SQL Editor**.

4. Start the dev server:
```bash
npm run dev
```

The Supabase client will automatically pick up the `.env` values via Vite's `import.meta.env`.

> **Never commit `.env` to version control.** The `.gitignore` should already exclude it. The `anon` key, while technically public-safe (RLS-bound), should still not be committed to avoid unintended public exposure.

---

*Generated documentation for SchemaForge — `src/lib/supabase.ts`*
