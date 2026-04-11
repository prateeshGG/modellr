# `apikeys.js` — Route Documentation

> **Location:** `server/routes/apikeys.js`  
> **Type:** Express Router Module  
> **Purpose:** Manages the full lifecycle of SchemaForge API keys (`sfk_live_*`) used by the MCP Gateway — listing, generating, and revoking keys, all scoped per-user via Supabase Row Level Security (RLS).

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Code Structure & Organization](#3-code-structure--organization)
4. [Helper Function — `getSupabaseClient(req)`](#4-helper-function)
5. [Endpoints](#5-endpoints)
6. [API Key Architecture](#6-api-key-architecture)
7. [Security Model](#7-security-model)
8. [Data Shapes](#8-data-shapes)
9. [Error Handling](#9-error-handling)
10. [Environment Variables](#10-environment-variables)
11. [Notable Patterns & Conventions](#11-notable-patterns--conventions)
12. [Known Caveats & Limitations](#12-known-caveats--limitations)
13. [Usage Examples](#13-usage-examples)

---

## 1. File Overview

This file implements API key management for SchemaForge. The keys it manages (`sfk_live_*`) are **not** OpenAI or Supabase keys — they are SchemaForge-specific tokens used to authenticate external MCP clients connecting through `mcpGateway.js`.

Core security principles enforced here:
1. **Keys are never stored in plaintext** — only a bcrypt hash is persisted.
2. **The raw key is revealed exactly once**, at generation time, and is irrecoverable afterward.
3. **Supabase RLS** ensures users can only access, create, or delete their own keys.
4. **Authentication is delegated to Supabase** via the incoming `Authorization: Bearer <JWT>` header.

---

## 2. Dependencies & Imports

```js
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
```

| Package | Role |
|---|---|
| `express` | HTTP routing — `Router()` |
| `bcryptjs` | Password-grade hashing of raw keys before DB storage |
| `crypto` | Node.js built-in; generates cryptographically secure random bytes |
| `@supabase/supabase-js` | Supabase JS client for RLS-bound database operations |

---

## 3. Code Structure & Organization

```
apikeys.js
├── Imports                    (lines 1–4)
├── Router Initialization      (line 6)
├── getSupabaseClient()        (lines 9–24)   — Per-request RLS client factory
├── GET /                      (lines 26–39)  — List user's keys
├── POST /generate             (lines 41–77)  — Create a new key
├── DELETE /:id                (lines 79–92)  — Revoke a key by ID
└── export default router      (line 94)
```

---

## 4. Helper Function

### `getSupabaseClient(req)`

**Lines:** 9–24

Creates a Supabase client bound to the **user's JWT**, enabling RLS to automatically restrict all DB operations to that user's data.

```js
function getSupabaseClient(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error('Missing Authorization header');

  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: authHeader } } }
  );
}
```

**Key design points:**
- Uses the **anon key** (not service role) — this activates RLS, restricting the client to the JWT user's data only.
- Throws synchronously if the `Authorization` header is absent — callers wrap in `try/catch`.
- A **new client instance per request** — no shared/persisted state across requests.
- The `Authorization` header is forwarded verbatim (e.g. `Bearer eyJhbGci...`).

---

## 5. Endpoints

### GET `/` — List API Keys

**Lines:** 26–39 | **Full path:** `GET /api/keys`

Returns all API keys belonging to the authenticated user — metadata only, never the hash or raw key.

#### Request Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | ✅ | `Bearer <supabase_jwt>` |

#### Flow

```
getSupabaseClient(req)
       ↓
supabase.from('api_keys')
  .select('id, label, key_prefix, created_at, last_used_at')
  .order('created_at', { ascending: false })
       ↓
res.json(keys)
```

#### Response — `200 OK`

```json
[
  {
    "id": "uuid-1",
    "label": "My MCP Key",
    "key_prefix": "sfk_live_abc12...",
    "created_at": "2026-04-10T12:00:00Z",
    "last_used_at": "2026-04-11T09:00:00Z"
  }
]
```

> `key_hash` is deliberately excluded from the `select()` — the hash is never exposed via API.

---

### POST `/generate` — Generate a New API Key

**Lines:** 41–77 | **Full path:** `POST /api/keys/generate`

Generates a cryptographically secure `sfk_live_` API key, hashes it, stores the hash, and returns the **raw key exactly once**.

#### Request

| Header | Required |
|---|---|
| `Authorization` | ✅ `Bearer <supabase_jwt>` |

```json
{ "label": "VS Code MCP Extension" }
```

| Field | Type | Required | Default |
|---|---|---|---|
| `label` | `string` | ❌ | `'Default MCP Key'` |

#### Flow

```
getSupabaseClient(req)
       ↓
supabase.auth.getUser()  — Verify JWT, extract user.id
       ↓
crypto.randomBytes(16).toString('hex')   → 32 hex chars
rawKey    = `sfk_live_${randomHex}`
keyPrefix = rawKey.substring(0, 15) + '...'
       ↓
bcrypt.hash(rawKey, 10)  → keyHash
       ↓
supabase.from('api_keys').insert({
  user_id, key_hash, key_prefix, label
})
       ↓
res.json({ newKey: <metadata>, rawKey })
```

#### Response — `200 OK`

```json
{
  "newKey": {
    "id": "uuid-2",
    "label": "VS Code MCP Extension",
    "key_prefix": "sfk_live_a3f9c...",
    "created_at": "2026-04-11T09:25:00Z",
    "last_used_at": null
  },
  "rawKey": "sfk_live_a3f9c2d8e1b4f7a09c6d2e5f8a3b1c4d"
}
```

> ⚠️ **`rawKey` is shown only once and cannot be retrieved again. Store it immediately.**

---

### DELETE `/:id` — Revoke an API Key

**Lines:** 79–92 | **Full path:** `DELETE /api/keys/:id`

Permanently deletes an API key by its database ID. RLS ensures only the owner can delete their own keys.

#### Request

| Header | Required |
|---|---|
| `Authorization` | ✅ `Bearer <supabase_jwt>` |

| URL Param | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | Database ID of the key to delete |

#### Response — `200 OK`

```json
{ "success": true }
```

> **RLS note:** If the `id` belongs to another user, Supabase silently deletes 0 rows and still returns `{ success: true }`. No information leaks about key existence.

---

## 6. API Key Architecture

### Key Format

```
sfk_live_<32 hex chars>
         └ crypto.randomBytes(16).toString('hex') = 128-bit entropy
```

Example: `sfk_live_a3f9c2d8e1b4f7a09c6d2e5f8a3b1c4d`

### Key Prefix (lookup index)

```
rawKey.substring(0, 15) + '...'
→ "sfk_live_a3f9c..."
```

Stored in `key_prefix` column. Used in `mcpGateway.js` to find candidate rows before running bcrypt compare — avoids full-table hashing.

### Inferred `api_keys` Table Schema

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Owner's Supabase auth user ID |
| `key_hash` | `text` | bcrypt hash of the raw key (cost 10) |
| `key_prefix` | `text` | First 15 chars + `'...'` for indexed lookup |
| `label` | `text` | Human-readable name |
| `created_at` | `timestamptz` | Creation timestamp |
| `last_used_at` | `timestamptz` | Updated by mcpGateway on each valid auth |

---

## 7. Security Model

```
Browser / MCP Client
      │  Authorization: Bearer <supabase_jwt>
      ▼
apikeys.js (Express)
      │
      ├─ getSupabaseClient() — RLS-bound client (anon key + user JWT)
      │         ↓
      │    Supabase enforces: WHERE user_id = auth.uid()
      │
      └─ /generate only: supabase.auth.getUser() → explicit user.id in INSERT
```

| Security Property | Implementation |
|---|---|
| Key never stored as plaintext | `bcrypt.hash(rawKey, 10)` before INSERT |
| Key shown only once | `rawKey` in response body, not logged |
| Cross-user access prevented | RLS via anon key + JWT |
| Identity confirmed on generation | `getUser()` called explicitly |
| Cryptographic randomness | `crypto.randomBytes(16)` — OS CSPRNG |
| Fast prefix lookup for auth | `key_prefix` used as DB index in gateway |

---

## 8. Data Shapes

### List item (`GET /`)
```ts
{ id: string; label: string; key_prefix: string; created_at: string; last_used_at: string | null }
```

### Generate response (`POST /generate`)
```ts
{ newKey: { id, label, key_prefix, created_at, last_used_at }, rawKey: string }
```

### Revoke response (`DELETE /:id`)
```ts
{ success: true }
```

---

## 9. Error Handling

| Scenario | Status | Response |
|---|---|---|
| Missing `Authorization` header | `401` | `{ error: 'Missing Authorization header' }` |
| Supabase query error (list/delete) | `401` | `{ error: <supabase_error_message> }` |
| Invalid JWT / `getUser()` failure | `400` | `{ error: 'Unauthorized' }` |
| Supabase insert error | `400` | `{ error: <supabase_error_message> }` |

> Note: `GET /` uses status `401` for errors while `POST` and `DELETE` use `400` — a minor inconsistency that could confuse client-side error handling.

---

## 10. Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key — activates RLS |

> The `VITE_` prefix is a Vite (client-side) convention being used here on the server. Functionally correct, but semantically unconventional for server-side variables.

---

## 11. Notable Patterns & Conventions

- **RLS-first ownership:** No manual `WHERE user_id = ?` filters — RLS handles all row-level isolation automatically via the JWT-bound client.
- **Per-request client creation:** Each request creates its own `SupabaseClient` with the correct auth context — no cross-request state leakage.
- **`crypto.randomBytes` for entropy:** OS-level CSPRNG instead of `Math.random()` — correct for security-sensitive token generation.
- **bcrypt cost factor 10:** ~100ms of deliberate compute per key generation — protects against brute force if the hash database is ever compromised.
- **Explicit `user_id` in INSERT:** Rather than relying on a DB-level `DEFAULT auth.uid()`, the `user_id` from `getUser()` is set explicitly — auditable at the application layer.
- **One-time raw key reveal:** The `rawKey` is only in the success response body, never logged via `console.error` (which fires only in the catch path).

---

## 12. Known Caveats & Limitations

| Issue | Description |
|---|---|
| `VITE_` prefix on server vars | Semantically wrong but functionally fine |
| Silent success on wrong-user delete | RLS deletes 0 rows but returns `{ success: true }` |
| No label validation | Empty string or excessively long labels are accepted |
| Error status inconsistency | `GET /` → `401`, others → `400` |
| bcrypt blocks event loop | CPU-intensive hashing under concurrency could degrade throughput |
| No pagination on list | All keys returned in one response regardless of count |
| No rate limiting on `/generate` | No cap on how many keys a user can create |

---

## 13. Usage Examples

### List Keys
```http
GET /api/keys
Authorization: Bearer <jwt>
```

### Generate Key
```http
POST /api/keys/generate
Authorization: Bearer <jwt>
Content-Type: application/json

{ "label": "CI Pipeline Key" }
```

### Revoke Key
```http
DELETE /api/keys/9f3a2c1d-4b5e-6f7a-8b9c-0d1e2f3a4b5c
Authorization: Bearer <jwt>
```

---

*Generated documentation for SchemaForge — `server/routes/apikeys.js`*
