# `postgres.js` — Route Documentation

> **Location:** `server/routes/postgres.js`  
> **Type:** Express Router Module  
> **Purpose:** Introspects a live PostgreSQL database via a connection string and returns a structured schema representation (tables, fields, relationships) suitable for visual schema editing in Modellr.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Code Structure & Organization](#3-code-structure--organization)
4. [Functions & Methods](#4-functions--methods)
   - [`getDialectType(pgType)`](#getdialecttypepgtype)
   - [POST `/` — Introspection Endpoint](#post----introspection-endpoint)
5. [SQL Queries Breakdown](#5-sql-queries-breakdown)
6. [Data Shape & Output Schema](#6-data-shape--output-schema)
7. [Error Handling](#7-error-handling)
8. [Notable Patterns & Conventions](#8-notable-patterns--conventions)
9. [Known Caveats & Limitations](#9-known-caveats--limitations)
10. [Comparison with `mysql.js`](#10-comparison-with-mysqljs)
11. [Usage Example](#11-usage-example)

---

## 1. File Overview

This file defines a single Express **POST** route (`/`) responsible for **PostgreSQL database introspection**. When called with a valid PostgreSQL connection string, it:

1. Connects to the target PostgreSQL database using `pg.Client`.
2. Queries `information_schema` to extract user-defined tables, columns, and constraints (Primary Keys & Foreign Keys).
3. Maps raw PostgreSQL type names into normalized, dialect-agnostic types.
4. Assembles an in-memory graph of tables, their fields, and inter-table relationships.
5. Returns this graph as a JSON payload that the Modellr frontend uses to render a visual schema diagram.

This route is mounted externally (likely in `server/index.js` or equivalent) under a path like `/api/introspect/postgres`.

---

## 2. Dependencies & Imports

```js
import express from 'express';
import pg from 'pg';
const { Client } = pg;
```

| Package | Role |
|---|---|
| `express` | HTTP routing framework; provides `Router()` |
| `pg` | Official Node.js PostgreSQL driver (`node-postgres`) |
| `pg.Client` | Single-connection client — destructured for direct use |

### Why `pg.Client` vs `pg.Pool`?

`Client` represents a **single dedicated connection** to the database. It is instantiated per request (`new Client(...)`) and explicitly connected (`client.connect()`) and disconnected (`client.end()`) within the handler. This is straightforward for a one-shot introspection request but is less efficient than a `Pool` under concurrent load.

### ESM Interop Note

```js
import pg from 'pg';
const { Client } = pg;
```

The `pg` package uses CommonJS exports. In an ESM context (which Modellr's server appears to use, given the `import` syntax), `pg` is imported as a default export and `Client` is destructured from it. This is the standard ESM interop pattern for `pg`.

---

## 3. Code Structure & Organization

```
postgres.js
├── Imports                          (lines 1–3)
├── Router Initialization            (line 4)
├── getDialectType()                 (lines 6–14)   — Type normalization helper
└── router.post('/', ...)            (lines 16–125) — Main introspection endpoint
    ├── Input validation             (lines 17–20)
    ├── Client Instantiation         (line 22)
    ├── DB Connection                (line 25)
    ├── Query 1: Fetch Tables        (lines 28–33)
    ├── Query 2: Fetch Columns       (lines 36–41)
    ├── Query 3: Fetch Constraints   (lines 44–57)
    ├── Data Assembly
    │   ├── Init tablesMap           (lines 63–71)
    │   ├── Assign Fields            (lines 74–88)
    │   └── Apply Constraints        (lines 91–112)
    ├── JSON Response                (lines 114–117)
    ├── Error Handler                (lines 119–121)
    └── Finally: Close Connection    (lines 122–124)
```

The architecture mirrors `mysql.js` closely — flat, self-contained, and single-route. No service layer or model abstraction is used.

---

## 4. Functions & Methods

### `getDialectType(pgType)`

**Lines:** 6–14  
**Signature:** `function getDialectType(pgType: string): string`

Converts a raw PostgreSQL `data_type` string (as returned by `information_schema.columns`) into a normalized, dialect-agnostic type string used by Modellr's internal schema model.

#### Type Mapping Table

| PostgreSQL Type(s) | Returns |
|---|---|
| `'int8'`, `'bigint'` | `'bigint'` |
| types containing `'int'`, `'integer'` | `'integer'` |
| types containing `'char'`, `'text'` | `'text'` |
| types containing `'time'`, `'date'` | `'timestamp'` |
| `'boolean'` (exact match) | `'boolean'` |
| anything else | returned as-is (passthrough) |

#### Notes

- Unlike `mysql.js`, this function does **not** lowercase the input first. PostgreSQL's `information_schema` returns type names in lowercase by default, so this generally works — but it is less defensive.
- The ordering of checks matters: `int8` is checked before the general `int` check, correctly routing `int8` to `bigint` rather than `integer`. This is **correct ordering**, avoiding the bug present in `mysql.js`.
- The `'text'` check uses both `pgType.includes('char')` (catches `character varying`, `char`) and `pgType === 'text'` (exact match for `text`).
- `'date'` exact match is redundant since `pgType.includes('time')` already covers `datetime` — but `date` alone (without `time`) would be missed by `.includes('time')`. The `pgType === 'date'` guard correctly catches plain `date` columns.

---

### POST `/` — Introspection Endpoint

**Lines:** 16–125  
**Method:** `POST`  
**Path:** `/` (relative to mount point)  
**Handler:** `async (req, res) => { ... }`

#### Request

| Field | Location | Type | Required | Description |
|---|---|---|---|---|
| `connectionString` | `req.body` | `string` | ✅ Yes | A valid PostgreSQL connection URL, e.g. `postgresql://user:pass@host:5432/dbname` |

#### Flow

```
Request received
      │
      ▼
Validate connectionString
      │ (missing → 400)
      ▼
new Client({ connectionString })
      │
      ▼
client.connect()
      │
      ▼
 ┌────────────────────────────────────────┐
 │  Query 1: Fetch Tables                 │  Excludes pg_catalog & information_schema
 │  Query 2: Fetch Columns                │  Excludes pg_catalog & information_schema
 │  Query 3: Fetch Constraints (PK/FK)    │  3-way JOIN across info_schema tables
 └────────────────────────────────────────┘
      │
      ▼
Build tablesMap (Map<string, TableObject>)
      │
      ├─ Populate .fields[] from columnsRes.rows
      │
      └─ Apply PK/FK constraints → mutate isPK/isFK, push to relationships[]
      │
      ▼
res.json({ tables: [...], relationships: [...] })
      │
      ▼
finally: client.end().catch(console.error)
```

---

## 5. SQL Queries Breakdown

### Query 1 — Fetch Tables

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema NOT IN ('pg_catalog', 'information_schema') 
  AND table_type = 'BASE TABLE'
```

- Excludes PostgreSQL's internal schemas (`pg_catalog`, `information_schema`).
- Filters to only **BASE TABLE** rows — excludes views, foreign tables, etc.
- Unlike the MySQL version, **no parameterized schema name** is needed; the schema exclusion list is hardcoded and safe.

---

### Query 2 — Fetch Columns

```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY ordinal_position
```

- Fetches columns for all user-defined tables.
- `ordinal_position` ordering preserves column definition order.
- Returns `data_type` which conforms to PostgreSQL's `information_schema` naming (e.g. `integer`, `character varying`, `boolean`, `bigint`).

---

### Query 3 — Fetch Constraints (PK & FK)

```sql
SELECT 
    tc.table_name, kcu.column_name, 
    tc.constraint_type, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name 
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name 
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema NOT IN ('pg_catalog', 'information_schema')
  AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY');
```

- Uses a **three-way JOIN** unique to PostgreSQL: adds `constraint_column_usage` (aliased `ccu`) to resolve the referenced table and column of a foreign key.
- This is cleaner than the MySQL approach since PostgreSQL's `information_schema` provides `constraint_column_usage` which directly maps constraints to their target columns.
- The `JOIN` conditions are precise and unambiguous (both `constraint_name` and `table_schema` are matched), unlike the MySQL version's potentially problematic `OR` in the join condition.

---

## 6. Data Shape & Output Schema

### Successful Response — `200 OK`

```json
{
  "tables": [
    {
      "id": "tbl_users",
      "name": "users",
      "fields": [
        {
          "id": "fld_users_id",
          "name": "id",
          "type": "integer",
          "nullable": false,
          "default": "nextval('users_id_seq'::regclass)",
          "isPK": true,
          "isFK": false,
          "unique": false
        },
        {
          "id": "fld_users_email",
          "name": "email",
          "type": "text",
          "nullable": false,
          "default": null,
          "isPK": false,
          "isFK": false,
          "unique": false
        }
      ],
      "position": { "x": 0, "y": 0 },
      "accentColor": "blue"
    }
  ],
  "relationships": [
    {
      "id": "rel_1",
      "sourceTableId": "tbl_orders",
      "sourceFieldId": "fld_orders_user_id",
      "targetTableId": "tbl_users",
      "targetFieldId": "fld_users_id",
      "cardinality": "one-to-many"
    }
  ]
}
```

### ID Generation Conventions

| Entity | Pattern | Example |
|---|---|---|
| Table | `tbl_<table_name>` | `tbl_users` |
| Field | `fld_<table_name>_<column_name>` | `fld_users_id` |
| Relationship | `rel_<incrementing_index>` | `rel_1`, `rel_2` |

> These conventions are **identical** to `mysql.js`, ensuring the frontend can treat both sources uniformly.

### Field Object Properties

| Property | Type | Source | Description |
|---|---|---|---|
| `id` | `string` | Generated | Unique field identifier |
| `name` | `string` | `column_name` | Raw column name from DB |
| `type` | `string` | `getDialectType(data_type)` | Normalized generic type |
| `nullable` | `boolean` | `is_nullable === 'YES'` | Whether column accepts NULL |
| `default` | `any \| undefined` | `column_default \|\| undefined` | Default expression or `undefined` |
| `isPK` | `boolean` | Constraints query | Whether part of the Primary Key |
| `isFK` | `boolean` | Constraints query | Whether a Foreign Key column |
| `unique` | `boolean` | Hardcoded `false` | Always false — not queried |

### Table Object Properties

| Property | Type | Description |
|---|---|---|
| `id` | `string` | Unique table identifier (`tbl_*`) |
| `name` | `string` | Raw table name from DB |
| `fields` | `Field[]` | Array of field objects |
| `position` | `{ x: 0, y: 0 }` | Default canvas position |
| `accentColor` | `'blue'` | Fixed accent color for PostgreSQL tables in the UI |

### Relationship Object Properties

| Property | Type | Description |
|---|---|---|
| `id` | `string` | Unique relationship identifier (`rel_*`) |
| `sourceTableId` | `string` | `tbl_*` of the FK-holding table |
| `sourceFieldId` | `string` | `fld_*` of the FK column |
| `targetTableId` | `string` | `tbl_*` of the referenced table |
| `targetFieldId` | `string` | `fld_*` of the referenced column |
| `cardinality` | `'one-to-many'` | Hardcoded default |

---

## 7. Error Handling

| Scenario | HTTP Status | Response |
|---|---|---|
| Missing `connectionString` | `400 Bad Request` | `{ "error": "connectionString is required" }` |
| Connection failure / query error | `500 Internal Server Error` | `{ "error": "Failed to introspect database: <err.message>" }` |
| Column references unknown table | — | Silently skipped (`continue`) |
| Constraint references unknown table/field | — | Silently skipped (`continue`) |

### `finally` Block

```js
} finally {
  await client.end().catch(console.error);
}
```

Unlike `mysql.js` which uses `if (connection) await connection.end()` (guards against connection never being created), the postgres version **always** calls `client.end()` since `client` is instantiated before the `try` block. The `.catch(console.error)` swallows any error during disconnect, preventing a double-throw scenario where both the original error and the disconnect error would propagate.

---

## 8. Notable Patterns & Conventions

- **Client instantiated outside `try`:** `const client = new Client(...)` is on line 22, before the `try`. This means `client.end()` in `finally` is always safe to call.
- **`tablesMap` for O(1) lookup:** Same as `mysql.js` — a `Map<string, TableObject>` avoids O(n) array searches when assembling fields and constraints.
- **`.rows` access:** Unlike `mysql2` which returns `[rows, fields]` tuples destructured with `const [rows] = await query(...)`, the `pg` client returns an object `{ rows, fields, ... }`, so rows are accessed via `.rows`. This is a key API difference from the MySQL route.
- **Three-way JOIN for FK resolution:** PostgreSQL's `constraint_column_usage` view makes FK target lookup clean and reliable — superior to the MySQL approach.
- **`accentColor: 'blue'`:** PostgreSQL tables are visually distinguished from MySQL tables (`'indigo'`) in the UI.
- **Schema exclusion by NOT IN:** All queries exclude `'pg_catalog'` and `'information_schema'` to isolate user data. This targets the `public` schema by default (and any other user-created schemas).

---

## 9. Known Caveats & Limitations

| Issue | Description |
|---|---|
| **`unique: false` always** | The `unique` property is hardcoded and UNIQUE constraints are never queried from `information_schema.table_constraints`. |
| **`cardinality: 'one-to-many'` hardcoded** | All FK relationships are assumed one-to-many. Junction tables (for many-to-many) are not detected. |
| **`position: { x: 0, y: 0 }` for all tables** | No initial layout is computed; the frontend must handle positioning. |
| **No connection pooling** | A `pg.Client` is created per-request. For production use, a `pg.Pool` would be more efficient. |
| **Single schema only (`public`)** | While system schemas are excluded, multi-schema databases (e.g. schemas beyond `public`) may return tables from all user schemas mixed together without separation. |
| **No input sanitization beyond `connectionString` check** | The connection string is passed directly to `pg.Client`. Malformed or malicious strings would produce a DB error rather than a validation error. |
| **`getDialectType` not lowercasing input** | If PostgreSQL ever returns mixed-case type names, the function could fail to match. In practice, `information_schema` always returns lowercase types in PostgreSQL. |

---

## 10. Comparison with `mysql.js`

| Aspect | `mysql.js` | `postgres.js` |
|---|---|---|
| **DB Driver** | `mysql2/promise` | `pg` (`node-postgres`) |
| **Connection** | `mysql.createConnection()` | `new Client(); client.connect()` |
| **Query API** | Returns `[rows, fields]` tuple | Returns `{ rows }` object |
| **Schema filtering** | By `dbName` (dynamic, parameterized) | By `NOT IN ('pg_catalog', 'information_schema')` |
| **Constraint query JOINs** | 2-way JOIN (tc + kcu) | 3-way JOIN (tc + kcu + ccu) |
| **FK target resolution** | Via `kcu.REFERENCED_TABLE_NAME` | Via `ccu.table_name` |
| **`getDialectType` lowercases?** | ✅ Yes | ❌ No |
| **`tinyint(1)` → boolean bug** | ✅ Present | N/A |
| **`accentColor`** | `'indigo'` | `'blue'` |
| **Type alias for `text`** | `'varchar'` | `'text'` |
| **Type alias for dates** | `'datetime'` | `'timestamp'` |
| **`finally` guard** | `if (connection)` check | Always calls `.end()` |

---

## 11. Usage Example

### HTTP Request

```http
POST /api/introspect/postgres
Content-Type: application/json

{
  "connectionString": "postgresql://postgres:password@localhost:5432/myapp"
}
```

### Fetch (JavaScript)

```js
const response = await fetch('/api/introspect/postgres', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    connectionString: 'postgresql://postgres:password@localhost:5432/myapp'
  })
});

const { tables, relationships } = await response.json();
console.log(`Found ${tables.length} tables and ${relationships.length} relationships`);
```

### Possible Connection String Formats

```
postgresql://user:password@localhost:5432/database_name
postgres://user:password@localhost:5432/database_name
postgresql://user:password@localhost:5432/database_name?sslmode=require
postgresql://user:password@localhost/database_name   (default port 5432)
```

---

*Generated documentation for Modellr — `server/routes/postgres.js`*
