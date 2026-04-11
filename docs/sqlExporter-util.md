# `sqlExporter.js` — Utility Documentation

> **Location:** `server/utils/sqlExporter.js`  
> **Type:** Pure Utility Module — ES Module  
> **Purpose:** Converts a Modellr canvas state (tables + relationships) into a valid PostgreSQL DDL SQL script — `CREATE TABLE` statements with column definitions, inline constraints, and `FOREIGN KEY` clauses.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Code Structure & Organization](#3-code-structure--organization)
4. [Constraint Helper Functions](#4-constraint-helper-functions)
5. [Internal Function — `fieldDDL`](#5-internal-function--fieldddl)
6. [Exported Function — `generatePostgresSQL`](#6-exported-function--generatepostgressql)
7. [SQL Generation Pipeline](#7-sql-generation-pipeline)
8. [Output Format & Structure](#8-output-format--structure)
9. [Generated SQL Examples](#9-generated-sql-examples)
10. [Known Bug — Syntax Error in `fieldDDL`](#10-known-bug--syntax-error-in-fieldddl)
11. [Notable Patterns & Conventions](#11-notable-patterns--conventions)
12. [Known Caveats & Limitations](#12-known-caveats--limitations)
13. [Usage Examples](#13-usage-examples)
14. [Consumers of This Module](#14-consumers-of-this-module)

---

## 1. File Overview

`sqlExporter.js` is the **SQL rendering engine** of Modellr. It takes the internal canvas representation of a schema and produces PostgreSQL-compatible DDL (Data Definition Language) SQL — the `CREATE TABLE` statements that a developer could run against a PostgreSQL database to instantiate the schema.

It is consumed by:
- `mcpGateway.js` — via the `Modellr_generate_postgres_sql` tool.
- `migrationGenerator.js` — for generating the `CREATE TABLE` block in migration scripts for newly added tables.

The module exports a single function `generatePostgresSQL` and uses four small inline arrow functions as constraint formatters.

---

## 2. Dependencies & Imports

```js
// No imports
```

This file has **zero external dependencies**. It uses only native JavaScript. All logic is self-contained within the module.

---

## 3. Code Structure & Organization

```
sqlExporter.js
├── Constraint helpers (arrow functions)    (lines 1–4)
│   ├── NULLABLE(nullable)
│   ├── UNIQUE(unique)
│   ├── DEFAULT(def)
│   └── CHECK(check)
├── fieldDDL(f)                             (lines 6–9)   — Column definition renderer
└── generatePostgresSQL(tables, relationships)  (lines 11–38) — Main export
    ├── tableMap construction               (line 12)
    ├── fieldMap construction               (lines 13–15)
    ├── stmts — CREATE TABLE per table      (lines 17–34)
    │   ├── Column definitions              (line 18)
    │   └── FK constraint definitions       (lines 21–30)
    ├── Header comment string               (line 36)
    └── Return joined SQL                  (line 37)
```

---

## 4. Constraint Helper Functions

**Lines:** 1–4

Four single-line arrow functions that produce SQL constraint fragments for individual columns:

```js
const NULLABLE = (nullable) => (nullable ? '' : ' NOT NULL');
const UNIQUE   = (unique)   => (unique   ? ' UNIQUE' : '');
const DEFAULT  = (def)      => (def      ? ` DEFAULT ${def}` : '');
const CHECK    = (check)    => (check    ? ` CHECK (${check})` : '');
```

| Function | Input | Output (true) | Output (false/empty) |
|---|---|---|---|
| `NULLABLE(nullable)` | `boolean` | `''` (nullable → no constraint) | `' NOT NULL'` |
| `UNIQUE(unique)` | `boolean` | `' UNIQUE'` | `''` |
| `DEFAULT(def)` | `string \| falsy` | `' DEFAULT <value>'` | `''` |
| `CHECK(check)` | `string \| falsy` | `' CHECK (<expression>)'` | `''` |

### Notable Logic

- **`NULLABLE`** is inverted — a `true` (nullable) field produces an **empty string** (no constraint), while `false` (not nullable) produces `' NOT NULL'`. This aligns with PostgreSQL where columns are nullable by default unless `NOT NULL` is explicitly stated.
- **`DEFAULT`** interpolates the value directly without quoting — `DEFAULT ${def}`. This is correct for numeric defaults and expressions (e.g. `DEFAULT 0`, `DEFAULT now()`) but **will produce invalid SQL for string defaults** (e.g. `DEFAULT pending` instead of `DEFAULT 'pending'`).
- **`CHECK`** is defined but **not currently used** by any field in the Modellr canvas data model — the canvas field object has no `check` property. It is present for future extensibility.

---

## 5. Internal Function — `fieldDDL`

**Lines:** 6–9

Renders a single column's DDL line within a `CREATE TABLE` statement.

```js
function fieldDDL(f) {
  const pk = f.isPK ? ' PRIMARY KEY' : '';
  return `  "${f.name}" ${f.type}${NULLABLE(f.nullable)}${UNIQUE(f.unique)}${DEFAULT(f.default)}${CHECK(f.check)}${pk}`;
}
```

**Parameters:**

| Property | Type | Description |
|---|---|---|
| `f.name` | `string` | Column name |
| `f.type` | `string` | PostgreSQL data type (e.g. `bigserial`, `text`, `integer`) |
| `f.nullable` | `boolean` | Whether the column allows NULL |
| `f.unique` | `boolean` | Whether a UNIQUE constraint is added |
| `f.default` | `string \| null \| undefined` | Default value expression |
| `f.check` | `string \| null \| undefined` | CHECK constraint expression (currently unused in practice) |
| `f.isPK` | `boolean` | Whether this is a PRIMARY KEY column |

**Output example:**
```sql
  "id" bigserial NOT NULL PRIMARY KEY
  "email" text NOT NULL UNIQUE
  "status" text DEFAULT pending
```

> ⚠️ **There is a syntax error on line 8** — see [Section 10](#10-known-bug--syntax-error-in-fieldddl) for details.

**Constraint order in output:**
```
"<name>" <type> [NOT NULL] [UNIQUE] [DEFAULT <val>] [CHECK (<expr>)] [PRIMARY KEY]
```

---

## 6. Exported Function — `generatePostgresSQL`

**Lines:** 11–38  
**Signature:**
```ts
function generatePostgresSQL(
  tables: Table[],
  relationships: Relationship[]
): string
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `tables` | `Table[]` | Array of table objects from the canvas state |
| `relationships` | `Relationship[]` | Array of relationship objects from the canvas state |

**Returns:** A `string` — the complete PostgreSQL DDL SQL script.

---

## 7. SQL Generation Pipeline

```
tables[] + relationships[]
          │
          ▼
Build tableMap: Map<tableId, Table>
Build fieldMap: Map<"tableId:fieldId", { table, field }>
          │
          ▼
For each table:
  ├── Map table.fields → fieldDDL(f)  → column definition strings
  │
  └── Filter relationships where sourceTableId === table.id
       └── For each matching relationship:
             Resolve targetTable via tableMap
             Resolve sourceField via fieldMap
             Resolve targetField via fieldMap
             → FOREIGN KEY ("<src>") REFERENCES "<tgt>" ("<tgtField>")
          │
          ▼
  Combine [cols..., fks...] → JOIN with ',\n'
  → CREATE TABLE "<name>" (\n...\n);
          │
          ▼
Prepend header comment
Join all CREATE TABLE blocks with '\n\n'
          │
          ▼
Return complete SQL string
```

---

## 8. Output Format & Structure

### Header Block

```sql
-- Generated by Modellr MCP
-- Dialect: postgres
-- <ISO 8601 timestamp>
```

### Per-Table Block

```sql
CREATE TABLE "<table_name>" (
  "<col1>" <type> [NOT NULL] [UNIQUE] [DEFAULT x] [PRIMARY KEY],
  "<col2>" <type> [NOT NULL],
  FOREIGN KEY ("<src_col>") REFERENCES "<target_table>" ("<target_col>")
);
```

- Table and column names are always **double-quoted**.
- `FOREIGN KEY` constraints appear **after** all column definitions, as table-level constraints.
- No `ALTER TABLE ADD CONSTRAINT` — FKs are inline within the `CREATE TABLE` block.
- Tables are emitted in their array order — no topological sorting for FK dependency order.

---

## 9. Generated SQL Examples

### Simple Table

Input:
```js
tables = [{
  id: 'tbl_users', name: 'users',
  fields: [
    { id: 'fld_1', name: 'id',    type: 'bigserial', isPK: true,  nullable: false, unique: false },
    { id: 'fld_2', name: 'email', type: 'text',      isPK: false, nullable: false, unique: true  }
  ]
}]
relationships = []
```

Output:
```sql
-- Generated by Modellr MCP
-- Dialect: postgres
-- 2026-04-11T09:25:39.000Z

CREATE TABLE "users" (
  "id" bigserial NOT NULL PRIMARY KEY,
  "email" text NOT NULL UNIQUE
);
```

---

### Two Tables with FK Relationship

Input:
```js
tables = [
  { id: 'tbl_users',  name: 'users',  fields: [{ id: 'fld_u1', name: 'id', type: 'bigserial', isPK: true, nullable: false }] },
  { id: 'tbl_orders', name: 'orders', fields: [
    { id: 'fld_o1', name: 'id',      type: 'bigserial', isPK: true,  nullable: false },
    { id: 'fld_o2', name: 'user_id', type: 'bigint',    isPK: false, nullable: false }
  ]}
]
relationships = [{
  id: 'rel_1',
  sourceTableId: 'tbl_orders', sourceFieldId: 'fld_o2',
  targetTableId: 'tbl_users',  targetFieldId: 'fld_u1'
}]
```

Output:
```sql
-- Generated by Modellr MCP
-- Dialect: postgres
-- 2026-04-11T09:25:39.000Z

CREATE TABLE "users" (
  "id" bigserial NOT NULL PRIMARY KEY
);

CREATE TABLE "orders" (
  "id" bigserial NOT NULL PRIMARY KEY,
  "user_id" bigint NOT NULL,
  FOREIGN KEY ("user_id") REFERENCES "users" ("id")
);
```

---

## 10. Known Bug — Syntax Error in `fieldDDL`

**Line 8** contains a **JavaScript syntax error**:

```js
// Actual code (line 8):
return `  "${f.name}" ${f.type}${NULLABLE(f.nullable)}${UNIQUE(f.unique)}$ DEFAULT(f.default)}${CHECK(f.check)}${pk}`;
//                                                                         ↑
//                                              Missing opening brace: should be ${DEFAULT(f.default)}
```

The template literal for `DEFAULT` reads `$ DEFAULT(f.default)}` — it is missing the opening `{` of the template expression `${`. This means:

1. The `DEFAULT()` function call is **never executed**.
2. The literal string `$ DEFAULT(f.default)}` is written into the SQL output for every column.
3. This **will produce invalid SQL** for any generated output.

**Fix:**
```js
// Correct:
return `  "${f.name}" ${f.type}${NULLABLE(f.nullable)}${UNIQUE(f.unique)}${DEFAULT(f.default)}${CHECK(f.check)}${pk}`;
```

> ⚠️ This is a critical bug. Any SQL generated by this module will be syntactically invalid due to the literal `$ DEFAULT(f.default)}` appearing in every column definition.

---

## 11. Notable Patterns & Conventions

- **`Map` for O(1) lookups:** Both `tableMap` and `fieldMap` are built upfront from the input arrays. All FK resolution inside the table loop is O(1) via `.get()` rather than O(n) `.find()` — efficient even for large schemas.
- **Composite key for `fieldMap`:** Fields are keyed by `"tableId:fieldId"` — a simple composite key that avoids field ID collisions across tables that might have identically generated IDs.
- **`filter(Boolean)` cleanup:** FK constraint strings that fail to resolve (missing table/field reference) return `null` and are filtered out via `.filter(Boolean)` — prevents `null` entries breaking the `JOIN`.
- **`relationships || []` guard:** The `relationships` parameter defaults to an empty array with `|| []` — safe to call with `null` or `undefined`.
- **Double-quoted identifiers:** All table and column names are wrapped in double-quotes — PostgreSQL-safe for reserved words, uppercase names, and names with spaces.
- **`CHECK` for future extensibility:** The helper is defined and called (despite the bug) in anticipation of a `check` property being added to schema fields in the future.

---

## 12. Known Caveats & Limitations

| Issue | Description |
|---|---|
| **Syntax error in `fieldDDL`** | `$ DEFAULT(f.default)}` — missing `{`. DEFAULT is never rendered correctly; literal garbage is output instead. **Critical bug.** |
| **No topological sort** | Tables are emitted in input array order. If `orders` appears before `users` in the array and has a FK to `users`, the generated SQL will fail because `users` hasn't been created yet. |
| **No `IF NOT EXISTS`** | `CREATE TABLE` has no `IF NOT EXISTS` guard — running the SQL twice will error on the second run. |
| **Default value not quoted** | String defaults like `'pending'` must be pre-quoted in the field's `default` property — the exporter doesn't add quotes. |
| **`CHECK` constraint unused** | The `CHECK` helper is defined and called, but no canvas field currently carries a `check` property, so it always produces `''`. |
| **`PRIMARY KEY` after constraints** | The `PRIMARY KEY` fragment is appended last, after `CHECK`. In PostgreSQL this is valid, but conventionally `PRIMARY KEY` comes before `CHECK`. |
| **Multi-column PKs not supported** | Each field independently declares `PRIMARY KEY` if `isPK: true`. For composite PKs, this would generate multiple `PRIMARY KEY` declarations, which is invalid SQL. |
| **No `SERIAL` / `SEQUENCE` handling** | `bigserial` and `serial` types implicitly create sequences in PostgreSQL. No explicit `CREATE SEQUENCE` statements are generated. |
| **FK naming** | No `CONSTRAINT` names are generated for FK constraints — PostgreSQL will auto-generate names, making them harder to identify in migrations. |

---

## 13. Usage Examples

### Direct Usage

```js
import { generatePostgresSQL } from './sqlExporter.js';

const tables = [
  {
    id: 'tbl_products',
    name: 'products',
    fields: [
      { id: 'f1', name: 'id',    type: 'bigserial', isPK: true,  nullable: false, unique: false },
      { id: 'f2', name: 'title', type: 'text',      isPK: false, nullable: false, unique: false },
      { id: 'f3', name: 'price', type: 'numeric',   isPK: false, nullable: false, unique: false }
    ]
  }
];

const sql = generatePostgresSQL(tables, []);
console.log(sql);
```

### Via MCP Gateway

The function is called indirectly through `mcpGateway.js`:

```json
POST /api/mcp/call
{
  "tool": "Modellr_generate_postgres_sql",
  "arguments": { "id": "<schema-uuid>" }
}
```

The gateway fetches `canvas_state` from Supabase and passes `canvas_state.tables` and `canvas_state.relationships` to `generatePostgresSQL()`.

---

## 14. Consumers of This Module

| Consumer | Import | Usage |
|---|---|---|
| `server/routes/mcpGateway.js` | `generatePostgresSQL` | `Modellr_generate_postgres_sql` tool — generates full DDL for a schema |
| `server/utils/migrationGenerator.js` | `generatePostgresSQL` | Generates `CREATE TABLE` blocks for newly added tables in migration scripts |

---

*Generated documentation for Modellr — `server/utils/sqlExporter.js`*
