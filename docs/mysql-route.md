# `mysql.js` — Route Documentation

> **Location:** `server/routes/mysql.js`  
> **Type:** Express Router Module  
> **Purpose:** Introspects a live MySQL database via a connection string and returns a structured schema representation (tables, fields, relationships) suitable for visual schema editing in Modellr.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Code Structure & Organization](#3-code-structure--organization)
4. [Functions & Methods](#4-functions--methods)
   - [`getDialectType(myType)`](#getdialecttypemytype)
   - [POST `/` — Introspection Endpoint](#post----introspection-endpoint)
5. [SQL Queries Breakdown](#5-sql-queries-breakdown)
6. [Data Shape & Output Schema](#6-data-shape--output-schema)
7. [Error Handling](#7-error-handling)
8. [Notable Patterns & Conventions](#8-notable-patterns--conventions)
9. [Known Caveats & Limitations](#9-known-caveats--limitations)
10. [Usage Example](#10-usage-example)

---

## 1. File Overview

This file defines a single Express **POST** route (`/`) responsible for **MySQL database introspection**. When called with a valid MySQL connection string, it:

1. Connects to the target MySQL database.
2. Queries `information_schema` to extract tables, columns, and constraints (Primary Keys & Foreign Keys).
3. Normalizes raw MySQL types into a set of generic dialect types.
4. Builds an in-memory graph of tables and their inter-relationships.
5. Returns this graph as a JSON response that the Modellr frontend can consume to render a visual schema diagram.

This route is mounted externally (likely in `server/index.js` or equivalent) under a path like `/api/introspect/mysql`.

---

## 2. Dependencies & Imports

```js
import express from 'express';
import mysql from 'mysql2/promise';
```

| Package | Version Hint | Role |
|---|---|---|
| `express` | N/A (peer dep) | HTTP routing framework; provides `Router()` |
| `mysql2/promise` | `mysql2` pkg | Promise-based MySQL client; used for async/await connection and queries |

### Why `mysql2/promise` instead of `mysql2`?

`mysql2/promise` exposes a promise-native API — `createConnection()`, `connection.query()`, `connection.end()` — so no callback wrapping is needed. This integrates cleanly with the `async/await` pattern used throughout this file.

---

## 3. Code Structure & Organization

```
mysql.js
├── Imports                          (lines 1–2)
├── Router Initialization            (line 4)
├── getDialectType()                 (lines 6–14)   — Helper function
└── router.post('/', ...)            (lines 16–127) — Main introspection endpoint
    ├── Input validation             (lines 17–20)
    ├── DB Connection                (line 24)
    ├── Query 1: Fetch Tables        (lines 31–36)
    ├── Query 2: Fetch Columns       (lines 39–44)
    ├── Query 3: Fetch Constraints   (lines 47–59)
    ├── Data Assembly
    │   ├── Init tablesMap           (lines 65–73)
    │   ├── Assign Fields            (lines 76–90)
    │   └── Apply Constraints        (lines 93–114)
    ├── JSON Response                (lines 116–119)
    ├── Error Handler                (lines 121–123)
    └── Finally: Close Connection    (lines 124–126)
```

The file is intentionally **flat and self-contained** — no external service abstractions or model classes are used. All logic lives within the single route handler.

---

## 4. Functions & Methods

### `getDialectType(myType)`

**Lines:** 6–14  
**Signature:** `function getDialectType(myType: string): string`

Converts a raw MySQL `data_type` string (as returned from `information_schema.columns`) into a normalized, dialect-agnostic type string that Modellr uses internally.

#### Type Mapping Table

| MySQL Type(s) | Returns |
|---|---|
| `bigint` | `'bigint'` |
| `int`, `tinyint`, `smallint`, `mediumint` | `'integer'` |
| `varchar`, `text`, `char` | `'varchar'` |
| `date`, `datetime`, `timestamp`, `time` | `'datetime'` |
| `tinyint(1)` | `'boolean'` *(note: checked last; may not override `integer` — see caveats)* |
| anything else | returned as-is (passthrough) |

#### Notes

- The input is **lowercased** at the start (`myType.toLowerCase()`), so matching is case-insensitive.
- The `tinyint(1)` → `boolean` check on **line 12** comes *after* the `int` check on **line 9**. Because `tinyint(1)` includes the substring `int`, the `integer` branch will fire first for `tinyint(1)` values. This is a **logical bug** — see [Known Caveats](#9-known-caveats--limitations).

---

### POST `/` — Introspection Endpoint

**Lines:** 16–127  
**Method:** `POST`  
**Path:** `/` (relative to mount point)  
**Handler:** `async (req, res) => { ... }`

#### Request

| Field | Location | Type | Required | Description |
|---|---|---|---|---|
| `connectionString` | `req.body` | `string` | ✅ Yes | A valid MySQL connection URL, e.g. `mysql://user:pass@host:3306/dbname` |

#### Flow

```
Request received
      │
      ▼
Validate connectionString
      │ (missing → 400)
      ▼
mysql.createConnection(connectionString)
      │
      ▼
 ┌────────────────────────────┐
 │  Query 1: Tables           │  SELECT from information_schema.tables
 │  Query 2: Columns          │  SELECT from information_schema.columns
 │  Query 3: Constraints      │  JOIN table_constraints + key_column_usage
 └────────────────────────────┘
      │
      ▼
Build tablesMap (Map<string, TableObject>)
      │
      ├─ Populate .fields[] for each table from columnsRes
      │
      └─ Apply PK/FK constraints → mutate field flags, push to relationships[]
      │
      ▼
Serialize and respond: { tables: [...], relationships: [...] }
      │
      ▼
finally: connection.end()
```

---

## 5. SQL Queries Breakdown

### Query 1 — Fetch Tables

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = ?          -- current database name
  AND table_type = 'BASE TABLE' -- exclude VIEWs
```

- Filters to only **user-defined base tables**, excluding views and system tables.
- Uses parameterized query with `[dbName]` to prevent SQL injection.
- `dbName` is retrieved before this via `SELECT DATABASE() AS dbName`.

---

### Query 2 — Fetch Columns

```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = ?
ORDER BY ordinal_position
```

- Retrieves all columns for every table in the current schema.
- `ordinal_position` ordering ensures columns appear in their definition order.
- Fetches `is_nullable` (`YES`/`NO`) and `column_default` for field metadata.

---

### Query 3 — Fetch Constraints (PK & FK)

```sql
SELECT 
    kcu.TABLE_NAME as table_name, 
    kcu.COLUMN_NAME as column_name, 
    tc.CONSTRAINT_TYPE as constraint_type, 
    kcu.REFERENCED_TABLE_NAME as foreign_table_name,
    kcu.REFERENCED_COLUMN_NAME as foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME 
  AND tc.DEFAULT_COLLATION_NAME IS NULL OR tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA 
WHERE tc.TABLE_SCHEMA = ?
  AND tc.CONSTRAINT_TYPE IN ('PRIMARY KEY', 'FOREIGN KEY');
```

- Joins `table_constraints` with `key_column_usage` to get constraint-to-column mappings.
- Filters to only `PRIMARY KEY` and `FOREIGN KEY` constraints.
- `REFERENCED_TABLE_NAME` / `REFERENCED_COLUMN_NAME` are only populated for `FOREIGN KEY` rows.

> **⚠️ Note:** The `JOIN` condition on line 56 contains a potential logical operator precedence issue:  
> `ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.DEFAULT_COLLATION_NAME IS NULL OR tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA`  
> Due to SQL operator precedence, `AND` binds before `OR`, making this equivalent to:  
> `(... AND tc.DEFAULT_COLLATION_NAME IS NULL) OR tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA`  
> This could produce inadvertent cross-schema matches in some edge cases.

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
          "default": null,
          "isPK": true,
          "isFK": false,
          "unique": false
        },
        {
          "id": "fld_users_email",
          "name": "email",
          "type": "varchar",
          "nullable": false,
          "default": null,
          "isPK": false,
          "isFK": false,
          "unique": false
        }
      ],
      "position": { "x": 0, "y": 0 },
      "accentColor": "indigo"
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

### Field Object Properties

| Property | Type | Source | Description |
|---|---|---|---|
| `id` | `string` | Generated | Unique field identifier |
| `name` | `string` | `column_name` | Column name as in the database |
| `type` | `string` | `getDialectType(data_type)` | Normalized generic type |
| `nullable` | `boolean` | `is_nullable === 'YES'` | Whether column accepts NULL |
| `default` | `any \| undefined` | `column_default \|\| undefined` | Default value, or `undefined` if none |
| `isPK` | `boolean` | Constraints query | Whether this is part of the Primary Key |
| `isFK` | `boolean` | Constraints query | Whether this is a Foreign Key |
| `unique` | `boolean` | Hardcoded `false` | Not yet populated from DB |

### Table Object Properties

| Property | Type | Description |
|---|---|---|
| `id` | `string` | Unique table identifier (`tbl_*`) |
| `name` | `string` | Raw table name from DB |
| `fields` | `Field[]` | Array of field objects |
| `position` | `{ x: 0, y: 0 }` | Initial canvas position (origin) |
| `accentColor` | `'indigo'` | Fixed accent color for MySQL tables in the UI |

### Relationship Object Properties

| Property | Type | Description |
|---|---|---|
| `id` | `string` | Unique relationship identifier (`rel_*`) |
| `sourceTableId` | `string` | `tbl_*` of the FK-holding table |
| `sourceFieldId` | `string` | `fld_*` of the FK column |
| `targetTableId` | `string` | `tbl_*` of the referenced table |
| `targetFieldId` | `string` | `fld_*` of the referenced column |
| `cardinality` | `'one-to-many'` | Hardcoded; not derived from actual DB cardinality |

---

## 7. Error Handling

| Scenario | HTTP Status | Response |
|---|---|---|
| Missing `connectionString` | `400 Bad Request` | `{ "error": "connectionString is required" }` |
| Any DB or query error | `500 Internal Server Error` | `{ "error": "Failed to introspect MySQL database: <err.message>" }` |
| Unknown table in column mapping | — | Column silently skipped (`continue`) |
| Unknown table/field in constraints | — | Constraint silently skipped (`continue`) |

The `finally` block **always** calls `connection.end()` — even if a query fails — preventing connection leaks.

---

## 8. Notable Patterns & Conventions

- **`Map` for O(1) table lookup:** `tablesMap` (a `Map<string, TableObject>`) is used throughout data assembly to avoid expensive `Array.find()` loops when looking up tables by name.
- **Mutative field flagging:** Instead of tracking PK/FK during column fetch, fields are initialized with `isPK: false, isFK: false` and then **mutated** during the constraints pass. This decouples column enumeration from constraint logic.
- **`Array.from(tablesMap.values())`:** The final response serializes the Map back to an array, preserving insertion order (which reflects table discovery order).
- **Parameterized queries:** All queries use `?` placeholders with `[dbName]` to safely inject the database name, avoiding SQL injection.
- **`finally` for cleanup:** Connection teardown is in `finally`, not `catch`, ensuring it runs regardless of success or failure.
- **`accentColor: 'indigo'`:** MySQL tables are visually distinguished from PostgreSQL tables (`'blue'`) in the UI via this hardcoded property.

---

## 9. Known Caveats & Limitations

| Issue | Description |
|---|---|
| **`tinyint(1)` → `boolean` unreachable** | `getDialectType` checks `int` before `tinyint(1)`, so `tinyint(1)` will always resolve to `integer`, never `boolean`. The order of checks should be reversed. |
| **`unique: false` always** | The `unique` property is hardcoded to `false` and never populated from `information_schema.table_constraints` (UNIQUE constraints are not queried). |
| **`cardinality: 'one-to-many'` hardcoded** | All relationships are assumed `one-to-many`. Actual cardinality (one-to-one, many-to-many) is not derived. |
| **`position: { x: 0, y: 0 }` for all tables** | All tables start at the canvas origin. The frontend is expected to auto-layout them. |
| **JOIN condition logic** | The `OR` in the constraint query's `JOIN` condition may produce unexpected cross-schema rows in multi-schema MySQL instances. |
| **No connection pooling** | A fresh connection is created per request (`createConnection`). Under load, this is inefficient — a pool (`createPool`) would be preferable. |
| **No schema filtering config** | All tables in the current DB are returned. There's no way to filter specific tables from the request. |

---

## 10. Usage Example

### HTTP Request

```http
POST /api/introspect/mysql
Content-Type: application/json

{
  "connectionString": "mysql://root:password@localhost:3306/myapp"
}
```

### Fetch (JavaScript)

```js
const response = await fetch('/api/introspect/mysql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    connectionString: 'mysql://root:password@localhost:3306/myapp'
  })
});

const { tables, relationships } = await response.json();
console.log(`Found ${tables.length} tables and ${relationships.length} relationships`);
```

### Possible Connection String Formats

```
mysql://user:password@localhost:3306/database_name
mysql://user:password@127.0.0.1:3306/database_name?ssl=true
```

---

*Generated documentation for Modellr — `server/routes/mysql.js`*
