# `prisma.ts` — Importer Documentation

> **Location:** `src/utils/importers/prisma.ts`  
> **Type:** Pure Utility Function — TypeScript  
> **Purpose:** Parses a raw Prisma schema string (`schema.prisma`) into Modellr-compatible tables and relationships. Handles Prisma model blocks, scalar types, `@id`, `@unique`, `@default`, and `@relation` attributes — converting them into the internal `Table`, `Field`, and `Relationship` data shapes.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Code Structure & Organization](#3-code-structure--organization)
4. [Type Definitions](#4-type-definitions)
5. [Exported Function — `importPrisma`](#5-exported-function--importprisma)
6. [Two-Pass Parsing Algorithm](#6-two-pass-parsing-algorithm)
7. [Prisma Attribute Parsing](#7-prisma-attribute-parsing)
8. [Helper Functions](#8-helper-functions)
9. [Prisma → SQL Type Mapping](#9-prisma--sql-type-mapping)
10. [Canvas Position Assignment](#10-canvas-position-assignment)
11. [Output Shape](#11-output-shape)
12. [Notable Patterns & Conventions](#12-notable-patterns--conventions)
13. [Known Caveats & Limitations](#13-known-caveats--limitations)
14. [Usage Examples](#14-usage-examples)

---

## 1. File Overview

`prisma.ts` is a **hand-written regex-based parser** for Prisma schema files. It converts Prisma's ORM-centric schema format into Modellr's relational canvas model. It does **not** use an official Prisma SDK or AST parser — it uses regular expressions and string manipulation directly, which makes it lightweight but limited in edge case handling.

The importer is used when a user pastes or uploads a `schema.prisma` file into Modellr, allowing them to visualize and edit their existing Prisma-defined schema on the canvas.

**Key parsing challenges it solves:**
- Prisma uses **PascalCase model names** (`UserProfile`) — these are converted to **snake_case table names** (`user_profile`).
- Prisma has **virtual relation fields** (`author User @relation(...)`) that are not real DB columns — these must be identified and skipped.
- FK fields are identified by **matching the `@relation(fields: [...])` directive** to the actual scalar FK column.
- **Two passes** are needed: first to build all tables (to know all IDs), then to wire relationships cross-table.

---

## 2. Dependencies & Imports

```ts
import { nanoid } from '../../store/nanoid';
import type { Table, Field, Relationship, AccentColor } from '../../types/schema';
import { ACCENT_COLORS } from '../constants';
```

| Import | Source | Role |
|---|---|---|
| `nanoid` | `../../store/nanoid` | Generates unique IDs for tables, fields, and relationships |
| `Table`, `Field`, `Relationship`, `AccentColor` | `../../types/schema` | Core schema type definitions |
| `ACCENT_COLORS` | `../constants` | Accent color palette for cycling table colors |

**Zero external parsing dependencies** — no Prisma SDK, no third-party schema parser. All logic is regex-and-string-based.

---

## 3. Code Structure & Organization

```
prisma.ts
├── Imports                          (lines 1–3)
├── PrismaImportResult interface     (lines 5–9)
├── importPrisma()                   (lines 19–185)  — Main export
│   ├── Comment stripping            (lines 25–27)
│   ├── Pass 1: Build tables         (lines 34–152)
│   │   ├── Model regex extraction   (lines 30–31)
│   │   ├── Field parsing loop       (lines 51–127)
│   │   │   ├── Block attr skip      (line 53)
│   │   │   ├── Field regex match    (line 56)
│   │   │   ├── @id, @unique parse   (lines 67–68)
│   │   │   ├── @default parse       (lines 71–83)
│   │   │   ├── @relation parse      (lines 86–102)
│   │   │   ├── List/back-rel skip   (lines 104–108)
│   │   │   └── Field push           (lines 110–126)
│   │   ├── FK field resolution      (lines 130–138)
│   │   └── Table construction       (lines 140–152)
│   ├── Empty table guard            (lines 154–157)
│   └── Pass 2: Build relationships  (lines 159–182)
├── Helper: PRISMA_SCALARS set       (lines 189–192)
├── Helper: isPrismaScalar()         (lines 194–196)
├── Helper: autoIncrementType()      (lines 198–200)
├── Helper: prismaTypeToSQL()        (lines 202–215)
└── Helper: modelNameToTableName()   (lines 218–222)
```

---

## 4. Type Definitions

### `PrismaImportResult`

**Lines:** 5–9

```ts
interface PrismaImportResult {
  tables: Table[];
  relationships: Relationship[];
  errors: string[];
}
```

| Property | Description |
|---|---|
| `tables` | Parsed canvas tables (may be partial even if errors exist) |
| `relationships` | FK relationships extracted from `@relation` attributes |
| `errors` | Human-readable error/warning strings (non-fatal — function still returns partial results) |

---

## 5. Exported Function — `importPrisma`

**Lines:** 19–185  
**Signature:**
```ts
export function importPrisma(prismaText: string): PrismaImportResult
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `prismaText` | `string` | Raw content of a `schema.prisma` file |

**Returns:** `PrismaImportResult` — always returns an object (never throws). On failure, `errors` is populated and `tables`/`relationships` may be empty or partial.

---

## 6. Two-Pass Parsing Algorithm

### Pre-processing: Comment Stripping

```ts
const cleaned = prismaText
  .replace(/\/\/[^\n]*/g, '')       // Remove single-line // comments
  .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block /* */ comments
```

Applied before any parsing — ensures comment text doesn't interfere with regex matching.

---

### Pass 1 — Build Tables

**Lines:** 34–152

**Model regex:**
```ts
const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
```

Extracts each `model ModelName { ... }` block. The regex captures:
- Group 1: Model name (e.g. `User`, `BlogPost`)
- Group 2: Model body (everything inside `{ }`)

> **Limitation:** The closing `}` is matched by `[^}]+` — doesn't handle nested blocks. If a model body contains another `}` (e.g. in `@@map("table_{name}")`) the block may be truncated.

**For each model:**

1. A `tableId = nanoid()` is generated and stored in `tableNameToId` map.
2. Model body is split into lines, trimmed, and filtered.
3. Each field line is parsed with:

```ts
const fieldMatch = line.match(/^(\w+)\s+(\w+)(\??)\s*(.*)?$/);
```
Captures: `fieldName`, `prismaType`, `?` (optional marker), and the rest of the line as `attrStr`.

4. Attributes are parsed from `attrStr`:
   - `@id` → `isPK = true`
   - `@unique` → `isUnique = true`
   - `@default(...)` → `defaultVal` (with special-case mapping — see below)
   - `@relation(fields: [...])` → marks pending FK, skips the virtual field
   - List types (`[]`) → skipped as back-relations
   - Uppercase model-name types → skipped as relational object references

5. After processing all lines, pending FK relations are resolved: finds the actual scalar field by name and sets `isFK = true`, storing `__relTarget` (the target model name) as a temp property on the field.

6. Tables are pushed with positions assigned by a grid formula.

---

### Pass 2 — Build Relationships

**Lines:** 159–182

Iterates all tables and fields. For each field with a `__relTarget`:
1. Looks up the target model name in `tableNameToId` to get the target table's ID.
2. Finds the target table's PK field.
3. Creates a `Relationship` object linking the FK field to the target PK.
4. Deletes `__relTarget` from the field to clean up the temp property.

---

## 7. Prisma Attribute Parsing

### `@default(...)` Mapping

**Lines:** 71–83

```ts
defaultVal = d === 'now()'          ? 'now()'              :
             d === 'autoincrement()' ? undefined            :  // PK handles via serial
             d === 'uuid()'          ? 'gen_random_uuid()' :
             d === 'cuid()'          ? undefined            :  // no SQL equivalent
             d === 'true'            ? 'TRUE'               :
             d === 'false'           ? 'FALSE'              :
             d.startsWith('"')      ? d.slice(1, -1)        :  // strip Prisma string quotes
             d;                                                 // pass through (numbers etc.)
```

| Prisma Default | SQL Default |
|---|---|
| `now()` | `now()` |
| `autoincrement()` | `undefined` (field becomes `serial`/`bigserial`) |
| `uuid()` | `gen_random_uuid()` |
| `cuid()` | `undefined` (no standard SQL equivalent) |
| `true` | `TRUE` |
| `false` | `FALSE` |
| `"string value"` | `string value` (quotes stripped) |
| numbers, expressions | passed through as-is |

---

### `@relation` Detection

**Lines:** 86–102

```ts
const relationMatch = attrStr.match(/@relation\(([^)]+)\)/);
if (relationMatch && !attrStr.includes('@id')) {
  const fieldsMatch = relArgs.match(/fields:\s*\[([^\]]+)\]/);
  if (fieldsMatch) {
    pendingRelations.push({
      fieldId: '',
      targetModelName: prismaType,
      foreignFieldName: fieldsMatch[1].trim()
    });
  }
  continue; // Don't push as a real column
}
```

- If a field has `@relation(fields: [...])`, it's a **FK owner** — the FK scalar field name is extracted from `fields: [...]`.
- The virtual object field itself (`author User @relation(...)`) is **skipped** — not pushed as a DB column.
- The target model name is taken from `prismaType` (e.g. `User` in `author User @relation(...)`).

---

### Back-Relation & List Detection

**Lines:** 104–108

```ts
if (isList) continue;  // Skip array relations (e.g. posts Post[])
if (prismaType[0] === prismaType[0].toUpperCase() && !isPrismaScalar(prismaType)) continue;
```

- Fields with `[]` suffix are **back-relations** (reverse side of a relationship) — not real columns.
- Fields with **uppercase type names** that aren't Prisma scalars are also skipped (relation object references without `@relation`).

---

### Auto-increment PK Type Override

**Lines:** 124–126

```ts
if (isPK && autoIncrementType(prismaType) && attrStr.includes('autoincrement()')) {
  field.type = prismaType.toLowerCase() === 'int' ? 'serial' : 'bigserial';
}
```

Prisma `Int @id @default(autoincrement())` → `serial`  
Prisma `BigInt @id @default(autoincrement())` → `bigserial`

The default value is also set to `undefined` for these fields (line 118) since `serial`/`bigserial` are self-incrementing in PostgreSQL.

---

## 8. Helper Functions

### `isPrismaScalar(type: string): boolean`

**Lines:** 194–196

```ts
const PRISMA_SCALARS = new Set([
  'String', 'Boolean', 'Int', 'BigInt', 'Float', 'Decimal',
  'DateTime', 'Json', 'Bytes', 'Unsupported',
]);
```

Returns `true` if `type` is a known Prisma scalar (i.e., a real DB column type). Used to distinguish scalar fields from relational object-type fields.

---

### `autoIncrementType(type: string): boolean`

**Lines:** 198–200

Returns `true` for `'Int'` and `'BigInt'` — the only Prisma types that support `@default(autoincrement())`.

---

### `prismaTypeToSQL(type: string): string`

**Lines:** 202–215

Full Prisma → PostgreSQL SQL type mapping:

| Prisma Type | SQL Type |
|---|---|
| `String` | `text` |
| `Boolean` | `boolean` |
| `Int` | `integer` |
| `BigInt` | `bigint` |
| `Float` | `double precision` |
| `Decimal` | `numeric` |
| `DateTime` | `timestamptz` |
| `Json` | `jsonb` |
| `Bytes` | `bytea` |
| anything else | `text` (fallback) |

---

### `modelNameToTableName(name: string): string`

**Lines:** 218–222

Converts Prisma's PascalCase model names to snake_case table names:

```ts
'UserProfile'   → 'user_profile'
'BlogPost'      → 'blog_post'
'Order'         → 'order'
'APIKey'        → 'a_p_i_key'   // ← known issue: consecutive capitals
```

Uses a regex that inserts `_` before each uppercase letter (except the first character):
```ts
.replace(/([A-Z])/g, (_, l, i) => (i === 0 ? l : '_' + l))
.toLowerCase()
```

---

## 9. Prisma → SQL Type Mapping

| Prisma | SQL | Notes |
|---|---|---|
| `String` | `text` | Prisma `String` maps to unbounded text |
| `Int` + autoincrement | `serial` | Auto-detected if `@default(autoincrement())` |
| `BigInt` + autoincrement | `bigserial` | Auto-detected if `@default(autoincrement())` |
| `Int` | `integer` | Without autoincrement |
| `BigInt` | `bigint` | Without autoincrement |
| `Float` | `double precision` | Prisma Float = IEEE 754 double |
| `Decimal` | `numeric` | Arbitrary precision |
| `DateTime` | `timestamptz` | Always timezone-aware |
| `Json` | `jsonb` | Binary JSON for PostgreSQL |
| `Bytes` | `bytea` | Raw binary |
| `Boolean` | `boolean` | |
| Unknown | `text` | Safe fallback |

---

## 10. Canvas Position Assignment

**Lines:** 146–149

```ts
position: {
  x: 80 + (tables.length % 4) * 300,
  y: 80 + Math.floor(tables.length / 4) * 200,
},
```

Tables are arranged in a **4-column grid** starting at `(80, 80)` with:
- 300px horizontal spacing between columns
- 200px vertical spacing between rows

| Table # | Column | Row | Position |
|---|---|---|---|
| 0 | 0 | 0 | `(80, 80)` |
| 1 | 1 | 0 | `(380, 80)` |
| 2 | 2 | 0 | `(680, 80)` |
| 3 | 3 | 0 | `(980, 80)` |
| 4 | 0 | 1 | `(80, 280)` |
| 5 | 1 | 1 | `(380, 280)` |

After import, the user can trigger `autoLayout()` to get a smarter, relationship-aware arrangement.

---

## 11. Output Shape

### Success Case

```json
{
  "tables": [
    {
      "id": "abc123",
      "name": "user",
      "accentColor": "blue",
      "position": { "x": 80, "y": 80 },
      "fields": [
        { "id": "f1", "name": "id", "type": "bigserial", "isPK": true, "isFK": false, "nullable": false, "unique": true },
        { "id": "f2", "name": "email", "type": "text", "isPK": false, "isFK": false, "nullable": false, "unique": true },
        { "id": "f3", "name": "org_id", "type": "integer", "isPK": false, "isFK": true, "nullable": false, "unique": false }
      ]
    }
  ],
  "relationships": [
    { "id": "rel1", "sourceTableId": "abc123", "sourceFieldId": "f3", "targetTableId": "def456", "targetFieldId": "p1", "cardinality": "one-to-many" }
  ],
  "errors": []
}
```

### No Models Found

```json
{ "tables": [], "relationships": [], "errors": ["No model blocks found in the Prisma schema."] }
```

---

## 12. Notable Patterns & Conventions

- **Two-pass architecture:** Relationships require knowing both source and target table IDs — so tables are fully built in Pass 1, then relationships are wired in Pass 2.
- **`__relTarget` temp property:** A non-standard property is attached to field objects during parsing (`(field as any).__relTarget`) to carry the relation target model name between passes. It is deleted in Pass 2 before returning. The `as any` cast is necessary since it's not part of the `Field` type.
- **`(table as any).__fkConstraints` pattern (not present here but in `sql.ts`):** The same temp-property pattern is used differently — here it's on fields; in `sql.ts` it's on tables.
- **Accent color cycling:** `ACCENT_COLORS[tables.length % ACCENT_COLORS.length]` — distributes colors evenly across tables by cycling through the palette.
- **Non-throwing:** The function always returns a `PrismaImportResult` — it never throws. Errors are collected into the `errors` array, allowing partial results to be returned even when parsing is incomplete.
- **`tableNameToId` for cross-model lookup:** A `Map<modelName, tableId>` is maintained during Pass 1 and used in Pass 2 for O(1) target table resolution.

---

## 13. Known Caveats & Limitations

| Issue | Description |
|---|---|
| **Consecutive capitals in model names** | `modelNameToTableName('APIKey')` → `'a_p_i_key'` (each capital letter gets a separate `_`). Prisma convention is `ApiKey` → `api_key` which works correctly. |
| **Regex model block may truncate early** | `[^}]+` in the model regex doesn't handle nested `}` characters inside model bodies (e.g. block-level attributes with special chars). |
| **`@relation` regex can fail with complex attributes** | `@relation\(([^)]+)\)` doesn't handle nested parentheses in relation arguments. |
| **No composite PK (`@@id`)** | Block-level `@@id([field1, field2])` composite primary keys are skipped (line 53 ignores all `@@` lines). |
| **No `@@index`, `@@unique` block support** | These table-level attributes are skipped — UNIQUE constraints from `@@unique` are not transferred to fields. |
| **Back-relation detection is heuristic** | Uppercase non-scalar types without `@relation` are assumed to be back-relations (line 108). A model named the same as a Prisma scalar would be mishandled. |
| **`cuid()` has no SQL equivalent** | Prisma's `@default(cuid())` → `undefined` default. No SQL CUID implementation exists natively. |
| **`datasource db` blocks parsed but ignored** | The JSDoc mentions datasource parsing but no code handles it — dialect is not extracted from the schema. |
| **Cardinality always `one-to-many`** | All relationships are hardcoded to `one-to-many`. Prisma's one-to-one or many-to-many relationships aren't auto-detected. |

---

## 14. Usage Examples

### Parsing a Simple Prisma Schema

```ts
import { importPrisma } from './importers/prisma';

const prismaSchema = `
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  posts     Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  title     String
  content   String?
}
`;

const { tables, relationships, errors } = importPrisma(prismaSchema);
// tables → [{ name: 'user', ... }, { name: 'post', ... }]
// relationships → [{ sourceTableId: post.id, sourceFieldId: authorId.id, targetTableId: user.id, ... }]
// errors → []
```

### Handling Errors

```ts
const { tables, relationships, errors } = importPrisma('invalid content');
if (errors.length > 0) {
  console.warn('Import issues:', errors);
}
// Still attempt to use partial tables/relationships
```

---

*Generated documentation for Modellr — `src/utils/importers/prisma.ts`*
