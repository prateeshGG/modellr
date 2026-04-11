# `schema.sql` — Database Schema Documentation

> **Location:** `supabase/schema.sql`  
> **Type:** PostgreSQL SQL Script  
> **Purpose:** Defines and initializes the entire SchemaForge database on Supabase — creating all tables, enabling Row Level Security (RLS), defining per-table access policies, and setting up an auth trigger to auto-provision user profiles on signup.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [How to Run](#2-how-to-run)
3. [Database Tables](#3-database-tables)
   - [`public.users`](#publicusers)
   - [`public.schemas`](#publicschemas)
   - [`public.snapshots`](#publicsnapshots)
   - [`public.api_keys`](#publicapi_keys)
4. [Entity Relationship Diagram](#4-entity-relationship-diagram)
5. [Row Level Security (RLS)](#5-row-level-security-rls)
6. [RLS Policies — Full Reference](#6-rls-policies--full-reference)
7. [Auth Trigger — `handle_new_user`](#7-auth-trigger--handle_new_user)
8. [Notable Patterns & Conventions](#8-notable-patterns--conventions)
9. [Known Caveats & Limitations](#9-known-caveats--limitations)
10. [How Application Code Uses Each Table](#10-how-application-code-uses-each-table)

---

## 1. File Overview

This file is the **single source of truth** for the SchemaForge Supabase database structure. It must be run once (in order) against a fresh Supabase project to set up:

- **4 tables** across the `public` schema
- **RLS enabled** on all 4 tables
- **10 RLS policies** defining exactly who can do what
- **1 PostgreSQL function + trigger** for automatic user provisioning

The script is written to be run in the **Supabase SQL Editor** (or via the Supabase CLI's `db push`). It assumes a fresh project — re-running it on an existing database will error on duplicate object names without `IF NOT EXISTS` guards.

---

## 2. How to Run

1. Open your Supabase project dashboard.
2. Navigate to **SQL Editor**.
3. Paste the entire contents of this file.
4. Click **Run**.

Or via Supabase CLI:
```bash
supabase db push
# or
supabase db reset
```

---

## 3. Database Tables

---

### `public.users`

**Lines:** 5–11 | **Purpose:** Extended user profile table, mirroring `auth.users` with additional application-specific fields.

```sql
CREATE TABLE public.users (
  id          uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  display_name text,
  avatar_url   text,
  tier         text DEFAULT 'free'::text,
  created_at   timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL
);
```

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | — | PK; foreign key to `auth.users(id)` |
| `display_name` | `text` | YES | `null` | User's display name (from OAuth metadata) |
| `avatar_url` | `text` | YES | `null` | Profile picture URL |
| `tier` | `text` | YES | `'free'` | Subscription tier (`'free'`, `'pro'`, etc.) |
| `created_at` | `timestamptz` | NOT NULL | `now()` UTC | Account creation time |

**Key design decisions:**
- `id` is a **foreign key to `auth.users`** — Supabase's built-in auth table. This is the standard pattern for extending Supabase auth with custom profile data.
- `ON DELETE CASCADE` — if the auth user is deleted, their profile row is automatically removed.
- `tier` is a free-form `text` — not an enum. This allows new tiers to be added without schema migrations, but loses type safety.

---

### `public.schemas`

**Lines:** 14–25 | **Purpose:** The core table storing all user-created database schemas (canvas states).

```sql
CREATE TABLE public.schemas (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id      uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name          text NOT NULL DEFAULT 'Untitled Schema',
  canvas_state  jsonb DEFAULT '{}'::jsonb,
  yjs_state     bytea,
  thumbnail_svg text,
  is_public     boolean DEFAULT false,
  created_at    timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
  updated_at    timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
  deleted_at    timestamp with time zone
);
```

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Auto-generated UUID primary key |
| `owner_id` | `uuid` | NOT NULL | — | FK to `public.users(id)` |
| `name` | `text` | NOT NULL | `'Untitled Schema'` | Human-readable schema name |
| `canvas_state` | `jsonb` | YES | `'{}'` | Full canvas state: `{ tables, relationships }` |
| `yjs_state` | `bytea` | YES | `null` | Binary Yjs CRDT state for real-time collaboration |
| `thumbnail_svg` | `text` | YES | `null` | SVG thumbnail preview of the schema canvas |
| `is_public` | `boolean` | YES | `false` | Whether the schema is publicly viewable |
| `created_at` | `timestamptz` | NOT NULL | `now()` UTC | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL | `now()` UTC | Last-modified timestamp (must be manually updated by app) |
| `deleted_at` | `timestamptz` | YES | `null` | Soft-delete timestamp (null = not deleted) |

**Key design decisions:**
- `canvas_state` is `jsonb` — stores the entire visual schema graph as a JSON document. Allows flexible schema without additional tables.
- `yjs_state` is `bytea` — stores the binary Yjs document for real-time collaborative editing (via Hocuspocus WebSocket server).
- `deleted_at` enables **soft deletes** — rows are not physically removed; they're marked with a timestamp. However, no RLS policy currently filters on `deleted_at`, so soft-deleted schemas are still accessible to their owner.
- `updated_at` has no trigger — the application must manually update this field on every write.

---

### `public.snapshots`

**Lines:** 28–35 | **Purpose:** Stores point-in-time history snapshots of a schema's canvas state.

```sql
CREATE TABLE public.snapshots (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  schema_id    uuid REFERENCES public.schemas(id) ON DELETE CASCADE NOT NULL,
  label        text NOT NULL DEFAULT 'Snapshot',
  canvas_state jsonb NOT NULL,
  created_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL
);
```

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Auto-generated UUID primary key |
| `schema_id` | `uuid` | NOT NULL | — | FK to `public.schemas(id)` |
| `label` | `text` | NOT NULL | `'Snapshot'` | Human-readable snapshot label |
| `canvas_state` | `jsonb` | NOT NULL | — | Full frozen canvas state at point in time |
| `created_by` | `uuid` | YES | `null` | FK to `public.users(id)` — nullable, `SET NULL` on user delete |
| `created_at` | `timestamptz` | NOT NULL | `now()` UTC | When the snapshot was taken |

**Key design decisions:**
- `ON DELETE CASCADE` on `schema_id` — deleting a schema deletes all its snapshots automatically.
- `ON DELETE SET NULL` on `created_by` — if a user is deleted, their snapshots remain but `created_by` becomes `null` (historical record preserved).
- `canvas_state` is `NOT NULL` — a snapshot without state is meaningless.
- No `updated_at` — snapshots are immutable by design.

---

### `public.api_keys`

**Lines:** 43–51 | **Purpose:** Stores SchemaForge MCP API keys (`sfk_live_*`) for external programmatic access via the MCP Gateway.

```sql
CREATE TABLE public.api_keys (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  label       text NOT NULL DEFAULT 'Secret Key',
  key_hash    text NOT NULL,
  key_prefix  text NOT NULL,
  created_at  timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
  last_used_at timestamp with time zone
);
```

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Auto-generated UUID primary key |
| `user_id` | `uuid` | NOT NULL | — | FK to `public.users(id)` |
| `label` | `text` | NOT NULL | `'Secret Key'` | Human-readable key name |
| `key_hash` | `text` | NOT NULL | — | bcrypt hash of the raw `sfk_live_*` key |
| `key_prefix` | `text` | NOT NULL | — | First 15 chars + `'...'` — used as a lookup index |
| `created_at` | `timestamptz` | NOT NULL | `now()` UTC | Key creation timestamp |
| `last_used_at` | `timestamptz` | YES | `null` | Last successful authentication timestamp |

**Key design decisions:**
- `key_hash` stores the bcrypt-hashed raw key — the plaintext key is never stored.
- `key_prefix` enables fast DB lookup (filter by prefix, then bcrypt-compare matches) without scanning all hashes.
- `ON DELETE CASCADE` — deleting a user removes all their API keys.
- No index defined on `key_prefix` — an index would significantly speed up MCP gateway auth lookups under load.

---

## 4. Entity Relationship Diagram

```
auth.users (Supabase built-in)
      │
      │ ON DELETE CASCADE
      ▼
public.users
  ├── id (PK, FK → auth.users)
  ├── display_name
  ├── avatar_url
  ├── tier
  └── created_at
      │
      ├──────────────────────────────────┐
      │ owner_id (FK)                    │ user_id (FK)
      ▼                                  ▼
public.schemas                     public.api_keys
  ├── id (PK)                        ├── id (PK)
  ├── owner_id                       ├── user_id
  ├── name                           ├── label
  ├── canvas_state (jsonb)           ├── key_hash
  ├── yjs_state (bytea)              ├── key_prefix
  ├── thumbnail_svg                  ├── created_at
  ├── is_public                      └── last_used_at
  ├── created_at
  ├── updated_at
  └── deleted_at
      │
      │ schema_id (FK) ON DELETE CASCADE
      ▼
public.snapshots
  ├── id (PK)
  ├── schema_id (FK → schemas)
  ├── label
  ├── canvas_state (jsonb)
  ├── created_by (FK → users, SET NULL)
  └── created_at
```

---

## 5. Row Level Security (RLS)

RLS is enabled on all four tables:

```sql
ALTER TABLE public.users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schemas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys  ENABLE ROW LEVEL SECURITY;
```

With RLS enabled and no policy, **all access is denied by default**. Policies grant specific access. The application uses `VITE_SUPABASE_ANON_KEY` (not the service role key) for client-side requests, meaning RLS is always active for browser-originated queries.

The MCP Gateway (`mcpGateway.js`) uses the **service role key**, which bypasses RLS entirely — it performs manual `owner_id` / `user_id` filtering in application code instead.

---

## 6. RLS Policies — Full Reference

### `public.users` Policies

| Policy | Operation | Condition |
|---|---|---|
| `"Users can view their own profile."` | `SELECT` | `auth.uid() = id` |
| `"Users can update their own profile."` | `UPDATE` | `auth.uid() = id` |

> No `INSERT` policy — rows are created by the `handle_new_user` trigger (runs as `SECURITY DEFINER`, bypassing RLS).  
> No `DELETE` policy — user deletion is handled by Supabase Auth, not application code.

---

### `public.schemas` Policies

| Policy | Operation | Condition |
|---|---|---|
| `"Anyone can view public schemas."` | `SELECT` | `is_public = true` |
| `"Users can view their own schemas."` | `SELECT` | `auth.uid() = owner_id` |
| `"Users can insert their own schemas."` | `INSERT` | `auth.uid() = owner_id` |
| `"Users can update their own schemas."` | `UPDATE` | `auth.uid() = owner_id` |
| `"Users can delete their own schemas."` | `DELETE` | `auth.uid() = owner_id` |

> Two `SELECT` policies coexist — Supabase evaluates them with `OR` semantics, so a row is visible if **either** condition is true (public schema, or owned by the user).

---

### `public.snapshots` Policies

| Policy | Operation | Condition |
|---|---|---|
| `"Users can view their schema snapshots."` | `SELECT` | Schema's `owner_id = auth.uid()` (subquery) |
| `"Users can insert snapshots for their schemas."` | `INSERT` | Schema's `owner_id = auth.uid()` (subquery) |

> Access is indirect — verified via `EXISTS (SELECT 1 FROM public.schemas WHERE id = schema_id AND owner_id = auth.uid())`.  
> No `UPDATE` or `DELETE` policy — snapshots are intended to be immutable append-only records.

---

### `public.api_keys` Policies

| Policy | Operation | Condition |
|---|---|---|
| `"Users can manage their own API keys."` | `ALL` | `auth.uid() = user_id` |

> `FOR ALL` covers `SELECT`, `INSERT`, `UPDATE`, and `DELETE` in a single policy. This is the broadest possible grant — users have full CRUD over their own keys through the Supabase JavaScript client.

---

## 7. Auth Trigger — `handle_new_user`

**Lines:** 91–102

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### What it does

Every time a new user signs up (a row is inserted into `auth.users` by Supabase Auth), this trigger automatically creates a matching row in `public.users` with:
- `id` = the new Supabase auth user's UUID
- `display_name` = `full_name` from the OAuth provider's user metadata (e.g. from Google)

### Key details

| Property | Value | Meaning |
|---|---|---|
| `SECURITY DEFINER` | Yes | Runs with the privileges of the function's **creator** (typically `postgres`), not the calling user — allowing the INSERT into `public.users` without an INSERT RLS policy |
| `AFTER INSERT` | Yes | Fires after the `auth.users` row is committed |
| `FOR EACH ROW` | Yes | Runs once per inserted user, not once per statement |
| `raw_user_meta_data->>'full_name'` | JSONB extract | Pulls `full_name` from the OAuth metadata JSON — may be `null` for email/password signups |

---

## 8. Notable Patterns & Conventions

- **`auth.uid()` in policies:** All RLS policies use Supabase's `auth.uid()` function — returns the UUID of the currently authenticated user from the JWT. This is the standard Supabase RLS pattern.
- **`gen_random_uuid()`:** Used for all `id` defaults — PostgreSQL's built-in UUID v4 generator (available without the `uuid-ossp` extension since Postgres 13).
- **`timezone('utc', now())`:** All timestamps default to the current UTC time. Supabase stores all timestamps in UTC by convention.
- **`jsonb` for canvas state:** Using `jsonb` (binary JSON) over `json` allows PostgreSQL to index, query, and validate the JSON structure if needed.
- **Soft delete on `schemas`:** The `deleted_at` column is present but no policies or application-level filters are currently enforced on it — it's a foundation for future soft-delete functionality.
- **Cascade strategy:**
  - `users → schemas`: CASCADE (deleting a user removes all their schemas)
  - `schemas → snapshots`: CASCADE (deleting a schema removes all snapshots)
  - `snapshots.created_by → users`: SET NULL (preserves history when a user is deleted)
  - `users → api_keys`: CASCADE (deleting a user revokes all their API keys)

---

## 9. Known Caveats & Limitations

| Issue | Description |
|---|---|
| **No `updated_at` trigger** | `public.schemas.updated_at` has no DB trigger — the application code must manually set this. If a route forgets, the timestamp will be stale. |
| **Soft delete not enforced** | `deleted_at` exists but no RLS policies or app-level queries filter it out. Soft-deleted schemas appear as normal to the owner. |
| **No unique index on `key_prefix`** | `api_keys.key_prefix` is used as a fast lookup but has no index. Under load, gateway auth lookups perform a full table scan. |
| **No unique constraint on schema `name`** | Multiple schemas can have the same name per user. |
| **No index on `owner_id`/`user_id`** | Foreign key columns used in RLS policies (`owner_id`, `user_id`) have no explicit indexes — Supabase may or may not add them automatically for FKs. |
| **`tier` is plain text** | No enum constraint — any string is valid. The app must enforce valid tier values at the application layer. |
| **No snapshot limit** | Unlimited snapshots can be created per schema — no DB-level cap. |
| **`handle_new_user` may fail silently** | If the trigger errors (e.g. a `public.users` column constraint fails), the error propagates and the auth signup fails. There's no fallback. |
| **Script is not idempotent** | Re-running will error on `CREATE TABLE` / `CREATE POLICY` / `CREATE TRIGGER` if they already exist. No `IF NOT EXISTS` or `DROP IF EXISTS` guards. |

---

## 10. How Application Code Uses Each Table

| Table | Used by | Operations |
|---|---|---|
| `public.users` | Frontend (Supabase client), `handle_new_user` trigger | SELECT own profile, UPDATE own profile, auto-INSERT on signup |
| `public.schemas` | Frontend, `mcpGateway.js`, `apikeys.js` | Full CRUD by owner; SELECT by anyone for public schemas |
| `public.snapshots` | Frontend | SELECT + INSERT (via snapshot history feature) |
| `public.api_keys` | `apikeys.js` (via user JWT), `mcpGateway.js` (via service role key) | LIST/CREATE/DELETE (user), auth lookup (gateway) |

---

*Generated documentation for SchemaForge — `supabase/schema.sql`*
