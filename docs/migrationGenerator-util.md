# `migrationGenerator.js` — Utility Documentation

> **Location:** `server/utils/migrationGenerator.js`  
> **Type:** Pure Utility Function — ES Module  
> **Purpose:** Consumes a schema diff object (produced by `schemaDiff.js`) and generates a PostgreSQL migration SQL script that transforms the old schema into the new one — covering new tables, dropped tables, and column-level `ALTER TABLE` statements.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Code Structure & Organization](#3-code-structure--organization)
4. [Exported Function — `generateMigration`](#4-exported-function--generatemigration)
5. [SQL Generation Logic — Section by Section](#5-sql-generation-logic--section-by-section)
6. [Generated SQL Examples](#6-generated-sql-examples)
7. [Input Shape Requirements](#7-input-shape-requirements)
8. [Output Format](#8-output-format)
9. [Notable Patterns & Conventions](#9-notable-patterns--conventions)
10. [Known Caveats & Limitations](#10-known-caveats--limitations)
11. [Usage Examples](#11-usage-examples)
12. [Consumers of This Module](#12-consumers-of-this-module)

---

## 1. File Overview

`migrationGenerator.js` is the final step in the schema migration pipeline:

```
Canvas State A ──┐
                  ├──► schemaDiff.js ──► diff ──► migrationGenerator.js ──► SQL
Canvas State B ──┘                                        │
                                                          │ also uses
                                                     sqlExporter.js
                                                   (for CREATE TABLE blocks)
```

It takes the `diff` object from `diffSchemas()` and the new canvas state, then produces a **runnable PostgreSQL migration script** with three sections:

1. `-- [CREATE]` — `CREATE TABLE` statements for newly added tables.
2. `-- [ALTER]` — `ALTER TABLE` statements for modified tables (add/remove/modify columns).
3. `-- [DROP]` — `DROP TABLE CASCADE` statements for removed tables.

---

## 2. Dependencies & Imports

```js
import { generatePostgresSQL } from './sqlExporter.js';
```

| Import | Source | Role |
|---|---|---|
| `generatePostgresSQL` | `./sqlExporter.js` | Used to generate full `CREATE TABLE` DDL for newly added tables, including FK constraints |

`migrationGenerator.js` reuses the existing SQL generation logic from `sqlExporter.js` for the CREATE section, avoiding duplication of the field DDL rendering logic.

---

## 3. Code Structure & Organization

```
migrationGenerator.js
├── Import                          (line 1)
└── generateMigration(diff, newState)   (lines 3–61)
    ├── Header comment block            (lines 4–5)
    ├── Section 1: Added tables         (lines 7–11)   — CREATE TABLE via sqlExporter
    ├── Section 2: Modified tables      (lines 13–50)  — ALTER TABLE statements
    │   ├── Add columns loop            (lines 18–22)
    │   ├── Remove columns loop         (lines 25–27)
    │   └── Modify columns loop         (lines 30–48)
    │       ├── type change             (lines 31–33)
    │       ├── nullable change         (lines 34–40)
    │       └── default change          (lines 41–47)
    └── Section 3: Removed tables       (lines 52–58)  — DROP TABLE CASCADE
```

---

## 4. Exported Function — `generateMigration`

**Lines:** 3–61  
**Signature:**
```ts
function generateMigration(
  diff: DiffResult,
  newState: { tables: Table[], relationships: Relationship[] }
): string
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `diff` | `DiffResult` | Output of `diffSchemas(oldState, newState)` |
| `newState` | `object` | The new/target canvas state — used to resolve FK relationships for new tables |

**Returns:** A `string` containing the full PostgreSQL migration SQL script.

---

## 5. SQL Generation Logic — Section by Section

### Section 1 — CREATE TABLE for Added Tables

**Lines:** 7–11

```js
if (diff.addedTables.length > 0) {
  sql += `-- [CREATE] Added tables\n`;
  sql += generatePostgresSQL(
    diff.addedTables,
    newState.relationships.filter(r => diff.addedTables.find(t => t.id === r.sourceTableId))
  ) + '\n\n';
}
```

- Delegates to `generatePostgresSQL()` for full `CREATE TABLE` DDL — including column definitions and inline FK constraints.
- Filters `newState.relationships` to only include relationships where the **source table** is one of the newly added tables, preventing FK references to the existing schema from bleeding into the new-table block.
- If no tables were added, this entire section is skipped.

---

### Section 2 — ALTER TABLE for Modified Tables

**Lines:** 13–50

Loops over each entry in `diff.modifiedTables` and generates three sub-groups of `ALTER TABLE` statements:

#### 2a — Add Columns

```js
for (const f of table.addedFields) {
  const nullable = f.nullable ? '' : ' NOT NULL';
  const def = f.default ? ` DEFAULT ${f.default}` : '';
  sql += `ALTER TABLE "${table.name}" ADD COLUMN "${f.name}" ${f.type}${nullable}${def};\n`;
}
```

Produces: `ALTER TABLE "users" ADD COLUMN "phone" text;`

#### 2b — Remove Columns

```js
for (const f of table.removedFields) {
  sql += `ALTER TABLE "${table.name}" DROP COLUMN "${f.name}";\n`;
}
```

Produces: `ALTER TABLE "users" DROP COLUMN "legacy_field";`

> Note: No `CASCADE` or `RESTRICT` modifier is added — the default PostgreSQL behavior (`RESTRICT`) applies.

#### 2c — Modify Columns (three sub-cases)

For each `modifiedField`, up to three separate `ALTER COLUMN` statements can be emitted:

**Type change:**
```js
if (mf.changes.type) {
  sql += `ALTER TABLE "${table.name}" ALTER COLUMN "${mf.name}" TYPE ${mf.changes.type.to};\n`;
}
```
Produces: `ALTER TABLE "orders" ALTER COLUMN "total" TYPE numeric;`

**Nullable change:**
```js
if (mf.changes.nullable) {
  if (mf.changes.nullable.to === false) {
    sql += `ALTER TABLE "${table.name}" ALTER COLUMN "${mf.name}" SET NOT NULL;\n`;
  } else {
    sql += `ALTER TABLE "${table.name}" ALTER COLUMN "${mf.name}" DROP NOT NULL;\n`;
  }
}
```
Produces either:
- `ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;`
- `ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;`

**Default change:**
```js
if (mf.changes.default) {
  if (mf.changes.default.to === null || mf.changes.default.to === '') {
    sql += `ALTER TABLE "${table.name}" ALTER COLUMN "${mf.name}" DROP DEFAULT;\n`;
  } else {
    sql += `ALTER TABLE "${table.name}" ALTER COLUMN "${mf.name}" SET DEFAULT ${mf.changes.default.to};\n`;
  }
}
```
Produces either:
- `ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;`
- `ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending';`

Each modified table's block ends with a blank line (`sql += '\n'`).

---

### Section 3 — DROP TABLE for Removed Tables

**Lines:** 52–58

```js
if (diff.removedTables.length > 0) {
  sql += `-- [DROP] Removed tables\n`;
  for (const t of diff.removedTables) {
    sql += `DROP TABLE "${t.name}" CASCADE;\n`;
  }
}
```

Produces: `DROP TABLE "legacy_table" CASCADE;`

- Uses `CASCADE` — automatically drops dependent objects (FK constraints, views referencing the table).
- If no tables were removed, the section is skipped entirely.

---

## 6. Generated SQL Examples

### Full Migration Example

Given diff with one new table, one modified table (added column + nullable change), and one dropped table:

```sql
-- Migration generated by Modellr Migration tool
-- Created At: 2026-04-11T09:25:39.000Z

-- [CREATE] Added tables
-- Generated by Modellr MCP
-- Dialect: postgres
-- 2026-04-11T09:25:39.000Z

CREATE TABLE "tags" (
  "id" bigserial NOT NULL PRIMARY KEY,
  "name" text NOT NULL
);


-- [ALTER] Table "users"
ALTER TABLE "users" ADD COLUMN "phone" text;
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- [DROP] Removed tables
DROP TABLE "old_logs" CASCADE;
```

---

## 7. Input Shape Requirements

### `diff` parameter (from `diffSchemas()`)

```ts
{
  addedTables: Table[];
  removedTables: Table[];
  modifiedTables: {
    name: string;
    addedFields: Field[];
    removedFields: Field[];
    modifiedFields: {
      name: string;
      changes: {
        type?:     { from: string, to: string };
        nullable?: { from: boolean, to: boolean };
        default?:  { from: any, to: any };
      }
    }[];
  }[];
}
```

### `newState` parameter

```ts
{
  tables: Table[];
  relationships: Relationship[];
}
```

### `Table` object
```ts
{ id: string; name: string; fields: Field[]; }
```

### `Field` object
```ts
{ id: string; name: string; type: string; nullable: boolean; default?: string | null; isPK: boolean; }
```

### `Relationship` object
```ts
{ id: string; sourceTableId: string; sourceFieldId: string; targetTableId: string; targetFieldId: string; }
```

---

## 8. Output Format

The returned string always begins with a two-line header comment:

```sql
-- Migration generated by Modellr Migration tool
-- Created At: <ISO 8601 timestamp>
```

Sections appear in this order (only if non-empty):
1. `-- [CREATE] Added tables`
2. `-- [ALTER] Table "<name>"` (one block per modified table)
3. `-- [DROP] Removed tables`

All table and column names are wrapped in **double-quotes** (`"table_name"`) — proper PostgreSQL identifier quoting that handles reserved words and mixed-case names.

---

## 9. Notable Patterns & Conventions

- **Reuses `sqlExporter.js`:** Rather than re-implementing `CREATE TABLE` DDL rendering, the generator delegates to the existing `generatePostgresSQL()` function. This keeps the code DRY and ensures new-table SQL is identical to what the direct export would produce.
- **Relationship filtering for new tables:** The FK filter (`newState.relationships.filter(r => diff.addedTables.find(t => t.id === r.sourceTableId))`) only includes relationships where the new table is the source — preventing FK constraints that reference other new tables from being included twice, and avoiding references to tables not yet `CREATE`d.
- **Ordered sections:** CREATE → ALTER → DROP is a deliberate order. Creating tables first ensures FK references in `ALTER TABLE ADD COLUMN` (if any) can resolve. Dropping last ensures no FK-dependency errors from existing tables.
- **Double-quoted identifiers:** All table and field names in hand-rolled SQL use `"name"` quoting — safe for names with reserved words, spaces, or mixed case.
- **String concatenation:** SQL is built via `+=` string concatenation in a `let sql` variable. Simple and effective for a utility of this size.

---

## 10. Known Caveats & Limitations

| Issue | Description |
|---|---|
| **`ALTER COLUMN TYPE` may require `USING`** | In PostgreSQL, changing a column type (e.g. `text` → `integer`) often requires a `USING` clause to cast existing data. None is generated here — the SQL may fail on tables with existing rows. |
| **`DROP COLUMN` without `CASCADE`** | `DROP COLUMN` uses PostgreSQL's default `RESTRICT`. If the column is referenced by a view or constraint, the statement will fail. |
| **No `IF EXISTS` guards** | `DROP TABLE` and `DROP COLUMN` don't use `IF EXISTS`. Running the migration twice will error on the second run. |
| **No transaction wrapping** | The migration SQL is not wrapped in `BEGIN; ... COMMIT;`. A partial failure leaves the database in a partially migrated state. |
| **No relationship migration** | `addedRelationships` and `removedRelationships` from the diff are completely ignored. FK constraint additions/removals are not emitted. |
| **`isPK`, `isFK`, `unique` changes ignored** | Since `schemaDiff.js` doesn't track these, no migration SQL is generated for primary key or unique constraint changes. |
| **Default value interpolated unsafely** | `DEFAULT ${f.default}` and `SET DEFAULT ${mf.changes.default.to}` insert the value directly into SQL without quoting or sanitization. A string default like `hello world` would produce invalid SQL — it should be `'hello world'`. |

---

## 11. Usage Examples

### Standard Pipeline

```js
import { diffSchemas } from './schemaDiff.js';
import { generateMigration } from './migrationGenerator.js';

const diff = diffSchemas(oldCanvasState, newCanvasState);
const sql  = generateMigration(diff, newCanvasState);

console.log(sql);
// -- Migration generated by Modellr Migration tool
// -- Created At: 2026-04-11T09:25:39.000Z
// ...
```

### No-op Migration (identical schemas)

```js
const diff = diffSchemas(state, state);
// diff.addedTables = [], removedTables = [], modifiedTables = []

const sql = generateMigration(diff, state);
// Returns only the header:
// -- Migration generated by Modellr Migration tool
// -- Created At: ...
```

---

## 12. Consumers of This Module

| Consumer | Usage |
|---|---|
| `server/routes/mcpGateway.js` | `Modellr_generate_migration` tool — calls `generateMigration(diff, newState)` and returns the SQL + diff summary to MCP clients |

---

*Generated documentation for Modellr — `server/utils/migrationGenerator.js`*
