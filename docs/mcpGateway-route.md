# `mcpGateway.js` — Route Documentation

> **Location:** `server/routes/mcpGateway.js`  
> **Type:** Express Router Module  
> **Purpose:** Authenticated gateway that exposes Modellr schema data and operations to external MCP (Model Context Protocol) clients. Validates `sfk_live_*` bearer tokens, resolves the user context, and dispatches named tool calls against Supabase schema data.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Code Structure & Organization](#3-code-structure--organization)
4. [Supabase Initialization](#4-supabase-initialization)
5. [Authentication Middleware](#5-authentication-middleware)
6. [Tool Dispatcher — POST `/call`](#6-tool-dispatcher--post-call)
7. [Available Tools (Complete Reference)](#7-available-tools-complete-reference)
8. [External Utility Dependencies](#8-external-utility-dependencies)
9. [Data Flow Diagram](#9-data-flow-diagram)
10. [Error Handling](#10-error-handling)
11. [Environment Variables](#11-environment-variables)
12. [Notable Patterns & Conventions](#12-notable-patterns--conventions)
13. [Known Caveats & Limitations](#13-known-caveats--limitations)
14. [Usage Examples](#14-usage-examples)

---

## 1. File Overview

`mcpGateway.js` is the **programmatic API layer** of Modellr — it allows external AI agents, IDE extensions (e.g. VS Code with MCP support), and automation pipelines to read and modify Modellr schemas without a browser session.

It exposes a single endpoint (`POST /call`) that acts as a **tool dispatcher** — similar in concept to a JSON-RPC or function-calling interface. The caller names a tool and passes arguments; the gateway validates ownership and executes the operation against Supabase.

**Authentication flow:**
- Requires a `sfk_live_*` bearer token (generated via `apikeys.js`)
- Validates the token via **bcrypt comparison against stored hashes** (using the service role key to bypass RLS for lookup)
- Attaches the resolved `userId` to `req.ctx` for all downstream handlers

**Available tools:**

| Tool Name | Operation |
|---|---|
| `Modellr_list_schemas` | List all schemas owned by the user |
| `Modellr_read_schema` | Read full canvas state of one schema |
| `Modellr_update_schema` | Replace a schema's full canvas state |
| `Modellr_add_table` | Append a new table to an existing schema |
| `Modellr_modify_table` | Patch fields/properties of an existing table |
| `Modellr_generate_postgres_sql` | Generate PostgreSQL DDL SQL from a schema |
| `Modellr_diff_schemas` | Compute a structural diff between two schemas |
| `Modellr_generate_migration` | Generate a SQL migration script between two schemas |

---

## 2. Dependencies & Imports

```js
import express from 'express';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { generatePostgresSQL } from '../utils/sqlExporter.js';
import { diffSchemas } from '../utils/schemaDiff.js';
import { generateMigration } from '../utils/migrationGenerator.js';
```

| Package / Module | Role |
|---|---|
| `express` | HTTP routing — `Router()` |
| `bcryptjs` | Verifies raw `sfk_live_*` tokens against stored bcrypt hashes |
| `@supabase/supabase-js` | Service-role Supabase client for auth lookup + schema CRUD |
| `../utils/sqlExporter.js` | Generates PostgreSQL DDL SQL from canvas state |
| `../utils/schemaDiff.js` | Produces a structural diff object between two schema states |
| `../utils/migrationGenerator.js` | Converts a schema diff into a SQL migration script |

### Why service role key here (vs. anon key in `apikeys.js`)?

`mcpGateway.js` uses the **service role key** to bypass RLS. This is necessary because:
1. The gateway authenticates via `sfk_live_*` tokens (not Supabase JWTs), so there's no user JWT to bind to a Supabase client.
2. Authentication is performed manually via bcrypt — ownership is verified programmatically within each handler (`.eq('owner_id', userId)`).

---

## 3. Code Structure & Organization

```
mcpGateway.js
├── Imports                          (lines 1–6)
├── Router Initialization            (line 8)
├── Service Role Supabase Setup      (lines 11–19)
│   ├── ENV var reads                (lines 11–12)
│   ├── Debug console.log            (lines 14–16)
│   └── Conditional client init      (line 19)
├── Auth Middleware (router.use)     (lines 22–69)
│   ├── Supabase availability check  (lines 23–25)
│   ├── Header format validation     (lines 27–30)
│   ├── Prefix extraction            (lines 32–33)
│   ├── DB prefix lookup             (lines 36–43)
│   ├── bcrypt comparison loop       (lines 47–57)
│   ├── Auth failure check           (lines 59–61)
│   ├── last_used_at update          (line 64)
│   └── req.ctx injection + next()   (lines 67–68)
├── POST /call (tool dispatcher)     (lines 72–247)
│   ├── Modellr_list_schemas     (lines 78–87)
│   ├── Modellr_read_schema      (lines 89–102)
│   ├── Modellr_update_schema    (lines 104–129)
│   ├── Modellr_add_table        (lines 131–154)
│   ├── Modellr_modify_table     (lines 156–182)
│   ├── Modellr_generate_postgres_sql (lines 184–200)
│   ├── Modellr_diff_schemas     (lines 202–219)
│   ├── Modellr_generate_migration   (lines 221–239)
│   └── default (unknown tool)       (lines 241–242)
└── export default router            (line 249)
```

---

## 4. Supabase Initialization

**Lines:** 11–19

```js
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = serviceKey
  ? createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;
```

**Key points:**
- `supabaseUrl` falls back from `VITE_SUPABASE_URL` → `SUPABASE_URL` for deployment flexibility.
- `auth: { autoRefreshToken: false, persistSession: false }` — disables session management since this is a server-side, stateless service-role client.
- If `serviceKey` is missing, `supabase` is set to `null`. The auth middleware catches this and returns `500` before any handler runs.
- Three `console.log` lines (14–16) log Supabase config at startup — useful for debugging but may expose partial key info in production logs.

---

## 5. Authentication Middleware

**Lines:** 22–69  
**Applied via:** `router.use(...)` — runs before every route in this router.

### Full Auth Flow

```
Request arrives at /mcp/*
         │
         ▼
[1] Is supabase client initialized?
    NO → 500 "Server missing SUPABASE_SERVICE_ROLE_KEY"
         │
         ▼
[2] Does Authorization header start with "Bearer sfk_live_"?
    NO → 401 "Invalid or missing SCHEMA_FORGE_TOKEN format"
         │
         ▼
[3] Extract prefix: rawKey.substring(0, 15) + '...'
         │
         ▼
[4] DB lookup: SELECT id, user_id, key_hash
               FROM api_keys
               WHERE key_prefix = prefix
    NONE FOUND → 401 "Token not found or revoked"
         │
         ▼
[5] bcrypt.compare(rawKey, row.key_hash) for each candidate
    ALL FAIL → 401 "Invalid token"
         │
         ▼
[6] (background) UPDATE api_keys SET last_used_at = now() WHERE id = matchedKeyId
         │
         ▼
[7] req.ctx = { userId: matchedUserId }
    next()
```

### Security Notes

- **Prefix-then-hash lookup:** The prefix (`key_prefix`) narrows candidates in the DB, then bcrypt compare is done only on matches. This is an efficient pattern — avoids calling bcrypt on every key in the table.
- **Loop over prefix matches:** Multiple keys could (in theory) share the same 15-char prefix. The loop (lines 50–57) handles this correctly, checking each.
- **`last_used_at` update is fire-and-forget:** `.then()` without `.catch()` — if this DB update fails, there's no error surfaced to the user or logged.
- **`req.ctx`:** All downstream handlers read `req.ctx.userId` to scope their DB operations — never trusting any user-provided userId in the request body.

---

## 6. Tool Dispatcher — POST `/call`

**Lines:** 72–247  
**Full path (when mounted):** `POST /api/mcp/call`

### Request

```json
{
  "tool": "Modellr_read_schema",
  "arguments": {
    "id": "schema-uuid-here"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `tool` | `string` | ✅ | Name of the tool to invoke |
| `arguments` | `object` | depends | Tool-specific arguments object |

### Response Pattern

All tools return:
```json
{ "result": <tool_specific_data> }
```

Errors return:
```json
{ "error": "<error message>" }
```

---

## 7. Available Tools (Complete Reference)

---

### `Modellr_list_schemas`

**Lines:** 78–87

Lists all schemas owned by the authenticated user.

**Arguments:** _(none)_

**Response:**
```json
{
  "result": [
    { "id": "uuid", "name": "My Schema", "updated_at": "2026-04-11T..." }
  ]
}
```

**DB query:**
```js
supabase.from('schemas')
  .select('id, name, updated_at')
  .eq('owner_id', userId)
  .order('updated_at', { ascending: false })
```

---

### `Modellr_read_schema`

**Lines:** 89–102

Returns the full canvas state of a single schema (all tables, fields, and relationships).

**Arguments:**

| Field | Type | Required |
|---|---|---|
| `id` | `string` (UUID) | ✅ |

**Response:**
```json
{
  "result": {
    "name": "E-Commerce Schema",
    "canvas_state": {
      "tables": [ ... ],
      "relationships": [ ... ]
    },
    "updated_at": "2026-04-11T..."
  }
}
```

**Ownership check:** `.eq('id', id).eq('owner_id', userId)` — access denied if user doesn't own the schema.

---

### `Modellr_update_schema`

**Lines:** 104–129

Replaces a schema's entire canvas state (full overwrite of tables and relationships).

**Arguments:**

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | ✅ | Schema UUID |
| `tables` | `array` | ✅ | Full tables array |
| `relationships` | `array` | ❌ | Defaults to `[]` if omitted |

**Flow:**
1. Ownership check via `count` query.
2. Overwrites `canvas_state` with `{ tables, relationships }`.
3. Updates `updated_at` timestamp.

**Response:**
```json
{ "result": { "success": true, "message": "Schema <id> updated remotely." } }
```

---

### `Modellr_add_table`

**Lines:** 131–154

Appends a new table object to an existing schema's canvas state without overwriting existing tables.

**Arguments:**

| Field | Type | Required |
|---|---|---|
| `id` | `string` | ✅ |
| `table` | `object` | ✅ — full table object |

**Flow:**
1. Fetch current `canvas_state`.
2. Spread existing tables + append new table.
3. Write back updated `canvas_state`.

**Response:**
```json
{ "result": { "success": true, "message": "Table <name> added to schema <id>." } }
```

> This is a **read-modify-write** operation — not atomic. Concurrent modifications could cause race conditions.

---

### `Modellr_modify_table`

**Lines:** 156–182

Applies a partial update (patch) to a specific table within a schema.

**Arguments:**

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | ✅ | Schema UUID |
| `tableName` | `string` | ✅ | Table to modify (looked up by `.name`) |
| `updates` | `object` | ✅ | Partial object to spread-merge into the table |

**Flow:**
1. Fetch `canvas_state`.
2. Find table by `tableName`.
3. `{ ...existingTable, ...updates }` — shallow merge.
4. Write back.

**Response:**
```json
{ "result": { "success": true, "message": "Table <tableName> modified in schema <id>." } }
```

> Only top-level table properties can be patched (e.g. `name`, `accentColor`). Modifying individual fields within a table requires passing a full updated `fields` array in `updates`.

---

### `Modellr_generate_postgres_sql`

**Lines:** 184–200

Generates PostgreSQL DDL SQL (`CREATE TABLE`, foreign key constraints, etc.) for an entire schema.

**Arguments:**

| Field | Type | Required |
|---|---|---|
| `id` | `string` | ✅ |

**Delegates to:** `generatePostgresSQL(tables, relationships)` from `../utils/sqlExporter.js`

**Response:**
```json
{
  "result": {
    "sql": "CREATE TABLE users (\n  id bigserial PRIMARY KEY,\n  email text NOT NULL\n);\n..."
  }
}
```

---

### `Modellr_diff_schemas`

**Lines:** 202–219

Computes a structural diff between two schema versions — which tables were added, removed, or modified.

**Arguments:**

| Field | Type | Required |
|---|---|---|
| `oldId` | `string` | ✅ |
| `newId` | `string` | ✅ |

**Ownership check:** Both schemas must belong to the authenticated user (`.eq('owner_id', userId)` with `.in('id', [oldId, newId])`).

**Delegates to:** `diffSchemas(oldState, newState)` from `../utils/schemaDiff.js`

**Response:**
```json
{ "result": { "addedTables": [...], "removedTables": [...], "modifiedTables": [...] } }
```

---

### `Modellr_generate_migration`

**Lines:** 221–239

Generates a SQL migration script that transforms one schema into another.

**Arguments:**

| Field | Type | Required |
|---|---|---|
| `oldId` | `string` | ✅ |
| `newId` | `string` | ✅ |

**Flow:**
1. Fetch both schemas (same ownership check as `diff_schemas`).
2. Compute diff via `diffSchemas()`.
3. Generate SQL via `generateMigration(diff, newCanvasState)`.

**Delegates to:**
- `diffSchemas()` from `../utils/schemaDiff.js`
- `generateMigration()` from `../utils/migrationGenerator.js`

**Response:**
```json
{
  "result": {
    "sql": "ALTER TABLE orders ADD COLUMN status text;\n...",
    "diffSummary": {
      "added": 1,
      "removed": 0,
      "modified": 2
    }
  }
}
```

---

## 8. External Utility Dependencies

| Import | Source File | Role |
|---|---|---|
| `generatePostgresSQL` | `server/utils/sqlExporter.js` | Converts `{ tables, relationships }` canvas state into PostgreSQL DDL SQL |
| `diffSchemas` | `server/utils/schemaDiff.js` | Given two canvas states, returns `{ addedTables, removedTables, modifiedTables }` |
| `generateMigration` | `server/utils/migrationGenerator.js` | Given a diff + new canvas state, returns an `ALTER TABLE` / `CREATE TABLE` migration SQL string |

---

## 9. Data Flow Diagram

```
MCP Client (e.g. VS Code extension, AI agent)
    │
    │  POST /api/mcp/call
    │  Authorization: Bearer sfk_live_xxxxx
    │  Body: { tool: "...", arguments: { ... } }
    │
    ▼
mcpGateway.js — Auth Middleware
    │
    ├─ DB: lookup key_prefix in api_keys (service role)
    ├─ bcrypt.compare(rawKey, hash)
    ├─ req.ctx = { userId }
    │
    ▼
Tool Dispatcher (switch on req.body.tool)
    │
    ├─ Supabase queries (service role, manual owner_id filter)
    │
    ├─ [optional] External utils:
    │      sqlExporter / schemaDiff / migrationGenerator
    │
    ▼
{ result: <data> }  →  MCP Client
```

---

## 10. Error Handling

### Auth Middleware Errors

| Condition | Status | Response |
|---|---|---|
| `supabase` is null | `500` | `{ error: 'Server missing SUPABASE_SERVICE_ROLE_KEY' }` |
| Missing/wrong token format | `401` | `{ error: 'Invalid or missing SCHEMA_FORGE_TOKEN format' }` |
| Prefix not found in DB | `401` | `{ error: 'Token not found or revoked' }` |
| bcrypt compare fails for all candidates | `401` | `{ error: 'Invalid token' }` |

### Tool Dispatcher Errors

| Condition | Status | Response |
|---|---|---|
| Missing required argument | `400` | `{ error: "Missing 'x' argument" }` |
| Schema not found / not owned by user | `400` | `{ error: 'Schema not found or access denied' }` |
| Table not found within schema | `400` | `{ error: 'Table <name> not found in schema.' }` |
| Unknown tool name | `404` | `{ error: 'Unknown tool: <tool>' }` |
| Any other exception | `400` | `{ error: err.message }` |

---

## 11. Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (primary) |
| `SUPABASE_URL` | Supabase project URL (fallback) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — bypasses RLS for key lookup |

---

## 12. Notable Patterns & Conventions

- **Service role + manual ownership filter:** Because MCP tokens are not Supabase JWTs, RLS cannot be used. Instead, every handler manually appends `.eq('owner_id', userId)` to scope queries — equivalent to what RLS would do automatically.
- **`req.ctx` for user context injection:** The middleware attaches `{ userId }` to `req.ctx`, a clean pattern for passing auth-resolved identity to handlers without re-verifying in each one.
- **Switch-based tool dispatch:** A `switch(tool)` in a single POST handler is a common and readable pattern for RPC-style APIs. Avoids requiring separate route registrations for each tool.
- **Background `last_used_at` update:** `.then()` with no `.catch()` — intentionally fire-and-forget to avoid adding latency to the auth path. A failed timestamp update is non-critical.
- **Read-modify-write pattern:** `add_table` and `modify_table` both fetch current state, mutate in memory, then write back — a simple but non-atomic approach.
- **`count` query for ownership check:** `Modellr_update_schema` uses `{ count: 'exact', head: true }` to verify ownership without fetching the full canvas state — efficient for large schemas.

---

## 13. Known Caveats & Limitations

| Issue | Description |
|---|---|
| **Debug logs in production** | Lines 14–16 log the Supabase URL and a partial service key on every server startup. Should be removed or gated behind a `DEBUG` flag in production. |
| **Race conditions in read-modify-write** | `add_table` and `modify_table` are not atomic. Concurrent calls could overwrite each other's changes. |
| **No tool argument schema validation** | Arguments are destructured and checked for presence, but not validated for type or format. Unexpected argument shapes could cause runtime errors. |
| **`last_used_at` failures are silent** | If the background update fails, there's no log or alert. |
| **Error status is always `400`** | All tool-level errors (including "not found") return `400`. A `404` for missing schemas would be more semantically correct. Only the "unknown tool" case correctly returns `404`. |
| **No pagination on list** | `Modellr_list_schemas` returns all schemas without limit or cursor-based pagination. |
| **`relationships` defaults to `[]` silently** | In `Modellr_update_schema`, if `relationships` is omitted, it silently becomes `[]` — potentially deleting all existing relationships. |

---

## 14. Usage Examples

### List Schemas

```http
POST /api/mcp/call
Authorization: Bearer sfk_live_a3f9c2d8e1b4f7a09c6d2e5f8a3b1c4d
Content-Type: application/json

{ "tool": "Modellr_list_schemas", "arguments": {} }
```

### Read a Schema

```http
POST /api/mcp/call
Authorization: Bearer sfk_live_...
Content-Type: application/json

{ "tool": "Modellr_read_schema", "arguments": { "id": "uuid-here" } }
```

### Add a Table

```http
POST /api/mcp/call
Authorization: Bearer sfk_live_...
Content-Type: application/json

{
  "tool": "Modellr_add_table",
  "arguments": {
    "id": "schema-uuid",
    "table": {
      "id": "tbl_tags",
      "name": "tags",
      "fields": [
        { "id": "fld_tags_id", "name": "id", "type": "bigserial", "isPK": true, "nullable": false }
      ],
      "position": { "x": 400, "y": 200 },
      "accentColor": "green"
    }
  }
}
```

### Generate PostgreSQL SQL

```http
POST /api/mcp/call
Authorization: Bearer sfk_live_...
Content-Type: application/json

{ "tool": "Modellr_generate_postgres_sql", "arguments": { "id": "schema-uuid" } }
```

### Generate Migration Between Two Schemas

```http
POST /api/mcp/call
Authorization: Bearer sfk_live_...
Content-Type: application/json

{
  "tool": "Modellr_generate_migration",
  "arguments": {
    "oldId": "old-schema-uuid",
    "newId": "new-schema-uuid"
  }
}
```

---

*Generated documentation for Modellr — `server/routes/mcpGateway.js`*
