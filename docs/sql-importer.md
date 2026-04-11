# `sql.ts` — Importer Documentation

> **Location:** `src/utils/importers/sql.ts`  
> **Type:** Pure Utility Function — TypeScript  
> **Purpose:** Parses raw SQL DDL (`CREATE TABLE` statements) into SchemaForge-compatible tables and relationships. Uses `node-sql-parser` to produce an AST, then traverses the AST to extract table names, column definitions, constraints, and foreign key references — supporting both PostgreSQL and MySQL dialects.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Code Structure & Organization](#3-code-structure--organization)
4. [Type Definitions](#4-type-definitions)
5. [Exported Function — `importSQL`](#5-exported-function--importsql)
6. [Two-Pass Parsing Algorithm](#6-two-pass-parsing-algorithm)
7. [AST Node Traversal](#7-ast-node-traversal)
8. [Helper Functions](#8-helper-functions)
9. [SQL Type Normalization](#9-sql-type-normalization)
10. [Canvas Position Assignment](#10-canvas-position-assignment)
11. [Dialect Fallback Strategy](#11-dialect-fallback-strategy)
12. [Output Shape](#12-output-shape)
13. [Notable Patterns & Conventions](#13-notable-patterns--conventions)
14. [Known Caveats & Limitations](#14-known-caveats--limitations)
15. [Usage Examples](#15-usage-examples)
16. [Comparison with `prisma.ts`](#16-comparison-with-prismats)

---

## 1. File Overview

`sql.ts` is an **AST-based SQL DDL importer**. Unlike `prisma.ts` which uses hand-written regex, this file delegates parsing to `node-sql-parser` — a proper SQL parser that produces a structured AST (Abstract Syntax Tree). The importer then walks the AST to extract column definitions, constraints, and FK references.

It is used when a user pastes or uploads raw SQL (e.g. from `pg_dump`, a migration file, or a handwritten DDL script) to import their schema into SchemaForge.

**Key challenges it addresses:**
- `node-sql-parser`'s AST shape varies between PostgreSQL and MySQL dialects — column name and constraint nodes have different structures.
- FK constraints appear as **table-level** constraint definitions (not inline per-column), requiring a two-pass approach.
- Column names may be quoted (`"email"`, `` `email` ``) — quotes must be stripped uniformly.
- A **dialect fallback** strategy tries PostgreSQL first, then MySQL if parsing fails.

---

## 2. Dependencies & Imports

```ts
import { Parser } from 'node-sql-parser';
import { nanoid } from '../../store/nanoid';
import type { Table, Field, Relationship, AccentColor } from '../../types/schema';
import { ACCENT_COLORS } from '../constants';
```

| Import | Source | Role |
|---|---|---|
| `Parser` | `node-sql-parser` | SQL parser that produces an AST from DDL strings |
| `nanoid` | `../../store/nanoid` | Generates unique IDs for tables, fields, relationships |
| `Table`, `Field`, `Relationship`, `AccentColor` | `../../types/schema` | Core schema type definitions |
| `ACCENT_COLORS` | `../constants` | Color palette for cycling table accent colors |

### Module-level Parser Instance

```ts
const parser = new Parser();
```

`Parser` is instantiated **once at module load time** as a singleton — not per call. This avoids re-initialization overhead since `node-sql-parser` initialization is non-trivial.

---

## 3. Code Structure & Organization

```
sql.ts
├── Imports                          (lines 1–4)
├── Parser singleton                 (line 6)
├── ImportResult interface           (lines 8–12)
├── importSQL()                      (lines 18–196) — Main export
│   ├── Comment stripping            (lines 24–27)
│   ├── Empty content guard          (lines 29–31)
│   ├── AST parsing (PG → MySQL)     (lines 33–43)
│   ├── Pass 1: Build tables         (lines 48–156)
│   │   ├── CREATE TABLE filter      (line 50)
│   │   ├── Table name extraction    (lines 52–54)
│   │   ├── Column def loop          (lines 67–131)
│   │   │   ├── Column field parse   (lines 69–117)
│   │   │   └── FK constraint parse  (lines 121–130)
│   │   ├── FK field marking         (lines 133–139)
│   │   ├── Table push               (lines 141–155)
│   │   └── FK temp storage          (line 155)
│   ├── Pass 2: Build relationships  (lines 158–189)
│   └── Empty table guard            (lines 191–193)
├── Helper: toStr()                  (lines 199–208)
└── Helper: normalizeType()          (lines 210–228)
```

---

## 4. Type Definitions

### `ImportResult`

**Lines:** 8–12

```ts
interface ImportResult {
  tables: Table[];
  relationships: Relationship[];
  errors: string[];
}
```

| Property | Description |
|---|---|
| `tables` | Parsed canvas table objects |
| `relationships` | FK relationships extracted from `FOREIGN KEY` constraints |
| `errors` | Non-fatal error/warning messages; function always returns even on parse failure |

---

## 5. Exported Function — `importSQL`

**Lines:** 18–196  
**Signature:**
```ts
export function importSQL(sql: string): ImportResult
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `sql` | `string` | Raw SQL DDL text — may contain `CREATE TABLE` statements, comments, and whitespace |

**Returns:** `ImportResult` — always returns an object, never throws. Errors are captured in the `errors` array.

---

## 6. Two-Pass Parsing Algorithm

### Pre-processing

```ts
const cleaned = sql
  .replace(/--[^\n]*/g, '')         // Strip single-line SQL comments
  .replace(/\/\*[\s\S]*?\*\//g, '') // Strip block comments
  .trim();
```

Comments are stripped before passing to the parser — prevents comment content from confusing the AST.

---

### AST Parsing with Dialect Fallback

**Lines:** 33–43

```ts
try {
  ast = parser.astify(cleaned, { database: 'PostgreSQL' });
} catch {
  try {
    ast = parser.astify(cleaned, { database: 'MySQL' });
  } catch (err2) {
    errors.push(`Parse error: ${err2?.message ?? 'unknown'}`);
    return { tables, relationships, errors };
  }
}
```

1. **First attempt:** Parse as **PostgreSQL**.
2. **On failure:** Fall back to **MySQL**.
3. **Both fail:** Push error message and return empty result.

This makes the importer work transparently for both dialects without requiring the user to specify one.

---

### Pass 1 — Build Tables

**Lines:** 48–156

**Filter:** Only processes AST nodes where `stmt.type === 'create'` AND `stmt.keyword === 'table'`. All other statement types (`INSERT`, `ALTER`, `CREATE INDEX`, etc.) are ignored.

For each `CREATE TABLE` statement:

1. **Extract table name** — handles quoted identifiers:
   ```ts
   const rawName = stmt.table?.[0]?.table ?? stmt.table?.table ?? 'unnamed';
   const tableName = rawName.replace(/^"|"$/g, '').replace(/^`|`$/g, '');
   ```

2. **Iterate `create_definitions`** — each item is either a column (`resource === 'column'`) or a constraint (`resource === 'constraint'`).

3. **Column definitions** (see [Section 7](#7-ast-node-traversal))

4. **FK constraints** (`constraint_type === 'foreign key'`):
   ```ts
   const sourceCol = def.definition?.[0]?.column ?? def.definition?.[0];
   const targetTable = def.reference_definition?.table?.[0]?.table ?? '';
   fkConstraints.push({ sourceFieldName, targetTableName });
   ```

5. After processing columns, **mark FK fields** by matching `sourceFieldName` to field names (case-insensitive).

6. **Store FK constraints** as a temp property on the table: `(table as any).__fkConstraints = fkConstraints`.

---

### Pass 2 — Build Relationships

**Lines:** 158–189

```ts
for (const table of tables) {
  const fkConstraints = (table as any).__fkConstraints ?? [];

  for (const fk of fkConstraints) {
    const targetTableId = tableNameToId.get(fk.targetTableName.toLowerCase());
    const sourceField = table.fields.find(f => f.name.toLowerCase() === fk.sourceFieldName.toLowerCase());
    const targetPK = targetTable.fields.find(f => f.isPK);

    if (sourceField && targetPK) {
      relationships.push({
        id: nanoid(),
        sourceTableId: table.id, sourceFieldId: sourceField.id,
        targetTableId,           targetFieldId: targetPK.id,
        cardinality: 'one-to-many'
      });
    }
  }
  delete (table as any).__fkConstraints;
}
```

Resolves FK constraints into `Relationship` objects by cross-referencing the `tableNameToId` map (populated in Pass 1). Cleans up the temp `__fkConstraints` property afterward.

---

## 7. AST Node Traversal

The AST shape from `node-sql-parser` varies between dialects. Multiple fallback paths are used throughout to handle both:

### Column Name Extraction

```ts
const fieldName = toStr(
  colNode?.column?.expr?.value ??  // PostgreSQL AST standard shape
  colNode?.column?.value ??         // Alternate shape
  colNode?.column ??               // MySQL / simple shape
  colNode                           // Last resort fallback
);
```

Three different paths for the same data — the `toStr()` helper normalizes whatever value is encountered.

### Primary Key Detection

```ts
const isPK =
  allConstraints.some((c) => c?.type === 'primary key') ||  // inline constraint
  def.primary_key === true ||                                // boolean flag
  typeof def.primary_key === 'string' ||                    // string "primary key" (PostgreSQL AST)
  def.definition?.primary_key === true;                     // nested shape
```

Four different ways a PK can appear in the AST — all are checked.

### NOT NULL Detection

```ts
const isNotNull =
  allConstraints.some((c) => c?.type === 'not null') ||
  def.nullable?.type === 'not null' ||
  isPK;  // PKs are implicitly NOT NULL
```

### UNIQUE Detection

```ts
const isUnique =
  allConstraints.some((c) => c?.type === 'unique') ||
  def.unique === true ||
  def.definition?.unique === true;
```

### Default Value Extraction

```ts
const defaultRaw = def.default_val?.value;
const defaultExpr =
  defaultRaw?.value ??              // string/number literal AST node
  defaultRaw?.expr?.value ??        // expression AST node (e.g. now())
  (typeof defaultRaw === 'string' ? defaultRaw : undefined);
```

---

## 8. Helper Functions

### `toStr(val: unknown): string`

**Lines:** 199–208

Safely extracts a string from any `node-sql-parser` AST node — handles `null`, plain strings, and AST objects with `value`, `name`, or `column` properties.

```ts
function toStr(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'string') return val.replace(/^["'`]|["'`]$/g, '');  // strip quotes
  if (typeof val === 'object') {
    const o = val as Record<string, unknown>;
    const s = (o.value ?? o.name ?? o.column ?? '') as string;
    return String(s).replace(/^["'`]|["'`]$/g, '');
  }
  return String(val);
}
```

**Handles:**
- `null` / `undefined` → `''`
- `"quoted_string"` → `quoted_string` (strips `"`, `'`, `` ` ``)
- `{ value: 'name' }` → `'name'`
- `{ name: 'col' }` → `'col'`
- `{ column: 'id' }` → `'id'`
- Anything else → `String(val)`

---

### `normalizeType(raw: string): string`

**Lines:** 210–228

Normalizes raw SQL type strings into SchemaForge's canonical type names:

```ts
function normalizeType(raw: string): string {
  const base = raw.toLowerCase().trim().replace(/\s*\(.*\)/, '').trim(); // strip VARCHAR(255) → varchar

  const typeMap = {
    'int': 'integer',        'int4': 'integer',      'int2': 'smallint',
    'int8': 'bigint',        'serial4': 'serial',    'serial8': 'bigserial',
    'float4': 'real',        'float8': 'double precision',
    'bool': 'boolean',       'character varying': 'varchar',
    'character': 'char',     'nvarchar': 'varchar',  'nchar': 'char',
    'datetime': 'timestamp', 'datetime2': 'timestamp',
    'uniqueidentifier': 'uuid',
  };
  return typeMap[base] ?? base;
}
```

**Key normalizations:**

| Raw SQL | Normalized |
|---|---|
| `INT`, `INT4` | `integer` |
| `INT2` | `smallint` |
| `INT8` | `bigint` |
| `FLOAT4` | `real` |
| `FLOAT8` | `double precision` |
| `BOOL` | `boolean` |
| `CHARACTER VARYING`, `NVARCHAR` | `varchar` |
| `CHARACTER`, `NCHAR` | `char` |
| `DATETIME`, `DATETIME2` | `timestamp` |
| `UNIQUEIDENTIFIER` | `uuid` |
| `VARCHAR(255)` | `varchar` (size params stripped) |
| Unknown | returned as-is |

Size parameters like `VARCHAR(255)`, `NUMERIC(10,2)` are stripped — SchemaForge stores base types without precision/scale metadata.

---

## 9. SQL Type Normalization

The `normalizeType()` function also handles cross-dialect aliases:

| Source | Raw AST Type | Normalized |
|---|---|---|
| PostgreSQL | `integer`, `int4` | `integer` |
| PostgreSQL | `bigint`, `int8` | `bigint` |
| PostgreSQL | `timestamptz` | `timestamptz` (passed through) |
| MySQL | `int` | `integer` |
| MySQL | `datetime` | `timestamp` |
| SQL Server | `uniqueidentifier` | `uuid` |
| SQL Server | `nvarchar` | `varchar` |
| SQL Server | `datetime2` | `timestamp` |

---

## 10. Canvas Position Assignment

**Lines:** 147–150

```ts
position: {
  x: 80 + (tables.length % 4) * 280,
  y: 80 + Math.floor(tables.length / 4) * 180,
},
```

Tables are placed in a **4-column grid** (same concept as `prisma.ts` but with slightly different spacing):

| Dimension | SQL importer | Prisma importer |
|---|---|---|
| Horizontal spacing | `280px` | `300px` |
| Vertical spacing | `180px` | `200px` |
| Start offset | `(80, 80)` | `(80, 80)` |

After import, the user can trigger auto-layout for a relationship-aware arrangement.

---

## 11. Dialect Fallback Strategy

```
Input SQL
    │
    ▼
parser.astify(cleaned, { database: 'PostgreSQL' })
    │
    ├── SUCCESS → use PostgreSQL AST
    │
    └── FAIL (syntax error)
          │
          ▼
    parser.astify(cleaned, { database: 'MySQL' })
          │
          ├── SUCCESS → use MySQL AST
          │
          └── FAIL → push error, return empty result
```

This auto-detection means users don't need to specify their dialect. The tradeoff is that a completely invalid SQL input gets parsed twice before failing.

---

## 12. Output Shape

### Success Case

```json
{
  "tables": [
    {
      "id": "abc123",
      "name": "users",
      "accentColor": "blue",
      "position": { "x": 80, "y": 80 },
      "fields": [
        { "id": "f1", "name": "id", "type": "bigserial", "isPK": true, "isFK": false, "nullable": false, "unique": false },
        { "id": "f2", "name": "email", "type": "varchar", "isPK": false, "isFK": false, "nullable": false, "unique": true },
        { "id": "f3", "name": "org_id", "type": "integer", "isPK": false, "isFK": true, "nullable": false, "unique": false }
      ]
    }
  ],
  "relationships": [
    {
      "id": "rel1",
      "sourceTableId": "abc123",
      "sourceFieldId": "f3",
      "targetTableId": "def456",
      "targetFieldId": "pk1",
      "cardinality": "one-to-many"
    }
  ],
  "errors": []
}
```

### Parse Failure

```json
{ "tables": [], "relationships": [], "errors": ["Parse error: syntax error at position 42"] }
```

### No Tables Found

```json
{ "tables": [], "relationships": [], "errors": ["No CREATE TABLE statements found in the SQL."] }
```

---

## 13. Notable Patterns & Conventions

- **AST-based parsing over regex:** Using `node-sql-parser` produces a structured, validated AST rather than fragile regex — handles complex SQL with nested expressions, quoted identifiers, and varied whitespace correctly.
- **Multi-path AST access with `??` chaining:** The AST shape differs between dialects and versions. Multiple fallback paths (`a ?? b ?? c`) are used throughout to extract the same logical value from different node shapes — `toStr()` unifies the final extraction.
- **`__fkConstraints` temp property:** FK constraints are stored directly on table objects (via `(table as any).__fkConstraints`) between passes. This avoids maintaining a separate parallel data structure and is cleaned up before returning. The `as any` cast is necessary since it's not part of the `Table` type.
- **Case-insensitive field/table matching:** All table name lookups use `.toLowerCase()` — SQL table and column names are case-insensitive.
- **Accent color cycling:** `ACCENT_COLORS[tables.length % ACCENT_COLORS.length]` distributes colors evenly as tables are added.
- **Non-throwing with error collection:** The function collects errors non-fatally and always returns a result, allowing the UI to display partial results with warnings rather than a crash.
- **`tableNameToId` for O(1) cross-table lookup:** Built during Pass 1, keyed by lowercase table name, used in Pass 2 for FK resolution.

---

## 14. Known Caveats & Limitations

| Issue | Description |
|---|---|
| **`node-sql-parser` AST instability** | The AST shape is not guaranteed stable across `node-sql-parser` versions. Multiple fallback paths mitigate this but may still miss new/changed shapes. |
| **Only `CREATE TABLE` processed** | `ALTER TABLE ADD COLUMN`, `CREATE INDEX`, inline `PRIMARY KEY` on separate constraints, and `CREATE SEQUENCE` statements are all ignored. |
| **Cardinality always `one-to-many`** | All FK relationships are assumed `one-to-many`. One-to-one and many-to-many are not auto-detected. |
| **FK resolution requires both sides in the SQL** | If the SQL contains `FOREIGN KEY (user_id) REFERENCES users(id)` but `users` table isn't in the same SQL blob, the relationship is silently dropped. |
| **FK always targets the first PK field** | `targetTable.fields.find(f => f.isPK)` returns the first PK found. Composite PKs or differently-labeled PKs may not wire correctly. |
| **Column names with quotes** | Column names using reserved words (e.g. `"order"`, `"from"`) must be quoted in SQL — `toStr()` strips the quotes correctly, but the normalized name may conflict if mixed-case or unusual. |
| **Size params stripped** | `VARCHAR(255)` → `varchar`. Precision/scale info is lost (no NUMERIC(10,2) metadata preserved). |
| **SQLite and MSSQL not directly supported** | The parser fallback only tries PostgreSQL then MySQL. SQLite/MSSQL DDL may partially parse under MySQL mode but is not officially supported. |
| **Default value expressions may be incomplete** | Complex SQL expressions in `DEFAULT` clauses (e.g. `DEFAULT (1 + 2)`) may not be fully captured by the three-path `defaultExpr` extraction. |

---

## 15. Usage Examples

### Basic PostgreSQL DDL

```ts
import { importSQL } from './importers/sql';

const ddl = `
CREATE TABLE users (
  id bigserial PRIMARY KEY,
  email varchar(255) NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE posts (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL,
  title text NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

const { tables, relationships, errors } = importSQL(ddl);
// tables → [{ name: 'users', ... }, { name: 'posts', ... }]
// relationships → [{ sourceTableId: posts.id, sourceFieldId: user_id.id, ... }]
// errors → []
```

### MySQL DDL

```ts
const mysqlDDL = `
CREATE TABLE \`orders\` (
  \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` INT NOT NULL,
  \`status\` VARCHAR(50) DEFAULT 'pending',
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
);
`;

const result = importSQL(mysqlDDL);
// Automatically parses as MySQL after PostgreSQL parse fails
```

### Handling Parse Errors

```ts
const { tables, relationships, errors } = importSQL('NOT VALID SQL @@##');
// tables → []
// errors → ['Parse error: ...']
```

---

## 16. Comparison with `prisma.ts`

| Aspect | `sql.ts` | `prisma.ts` |
|---|---|---|
| **Parsing approach** | AST via `node-sql-parser` | Hand-written regex |
| **Input format** | Raw SQL DDL | Prisma schema (`schema.prisma`) |
| **Dialect support** | PostgreSQL + MySQL (fallback) | Prisma (dialect-agnostic) |
| **FK detection** | Table-level `FOREIGN KEY` constraint | `@relation(fields: [...])` attribute |
| **FK temp storage** | On `table.__fkConstraints` | On `field.__relTarget` |
| **Type mapping** | SQL aliases (`int4` → `integer`) | Prisma scalars (`Int` → `integer`) |
| **Model name conversion** | Table names used as-is | PascalCase → snake_case |
| **External dependency** | `node-sql-parser` | None (regex only) |
| **Grid spacing** | 280px × 180px | 300px × 200px |
| **Cardinality** | Always `one-to-many` | Always `one-to-many` |

---

*Generated documentation for SchemaForge — `src/utils/importers/sql.ts`*
