# `schemaDiff.js` — Utility Documentation

> **Location:** `server/utils/schemaDiff.js`  
> **Type:** Pure Utility Function — ES Module  
> **Purpose:** Compares two SchemaForge canvas states and returns a structured diff object describing exactly what changed — which tables were added, removed, or modified, and which relationships were added or removed. Used by both `mcpGateway.js` and `migrationGenerator.js`.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Code Structure & Organization](#3-code-structure--organization)
4. [Exported Function — `diffSchemas`](#4-exported-function--diffschemas)
5. [Diff Algorithm — Step by Step](#5-diff-algorithm--step-by-step)
6. [Output Shape (Diff Object)](#6-output-shape-diff-object)
7. [Field-Level Change Tracking](#7-field-level-change-tracking)
8. [Relationship Diffing](#8-relationship-diffing)
9. [Notable Patterns & Conventions](#9-notable-patterns--conventions)
10. [Known Caveats & Limitations](#10-known-caveats--limitations)
11. [Usage Examples](#11-usage-examples)
12. [Consumers of This Module](#12-consumers-of-this-module)

---

## 1. File Overview

`schemaDiff.js` is a **pure, stateless utility** — it takes two plain objects and returns a diff object. It has no side effects, no I/O, and no external dependencies. This makes it easy to test in isolation and safe to call from any context.

The function answers the question:  
> *"What operations would I need to perform on the old schema to make it look like the new schema?"*

The diff is consumed by:
- `migrationGenerator.js` — to generate SQL `ALTER TABLE` / `CREATE TABLE` / `DROP TABLE` statements.
- `mcpGateway.js` (`schemaforge_diff_schemas` tool) — to return a human-readable structural diff to MCP clients.

---

## 2. Dependencies & Imports

```js
// No imports
```

This file has **zero dependencies** — it uses only native JavaScript array methods. It exports a single named function.

---

## 3. Code Structure & Organization

```
schemaDiff.js
├── JSDoc comment              (lines 1–5)
└── diffSchemas()              (lines 6–55)
    ├── Null-safe state extraction   (lines 7–8)
    ├── Table-level diff             (lines 10–11)
    │   ├── addedTables              (line 10)
    │   └── removedTables            (line 11)
    ├── Field-level diff loop        (lines 15–45)
    │   ├── addedFields              (line 19)
    │   ├── removedFields            (line 20)
    │   └── modifiedFields           (lines 22–35)
    ├── modifiedTables assembly      (lines 37–44)
    └── Return object                (lines 47–54)
        ├── addedTables
        ├── removedTables
        ├── modifiedTables
        ├── addedRelationships
        └── removedRelationships
```

---

## 4. Exported Function — `diffSchemas`

**Lines:** 6–55  
**Signature:**
```ts
function diffSchemas(
  oldState: { tables: Table[], relationships: Relationship[] },
  newState: { tables: Table[], relationships: Relationship[] }
): DiffResult
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `oldState` | `object` | Previous canvas state with `tables` and `relationships` arrays |
| `newState` | `object` | Current/new canvas state with `tables` and `relationships` arrays |

Both parameters are **null-safe** — `oldState?.tables || []` and `newState?.tables || []` handle `null` or `undefined` gracefully.

**Returns:** A `DiffResult` object — see [Output Shape](#6-output-shape-diff-object).

---

## 5. Diff Algorithm — Step by Step

### Step 1 — Extract tables (null-safe)

```js
const oldTables = oldState?.tables || [];
const newTables = newState?.tables || [];
```

Handles cases where either state is `null`, `undefined`, or missing the `tables` property.

---

### Step 2 — Table-level diff (by `name`)

```js
const addedTables   = newTables.filter(nt => !oldTables.find(ot => ot.name === nt.name));
const removedTables = oldTables.filter(ot => !newTables.find(nt => nt.name === ot.name));
```

A table is considered **added** if its `name` doesn't exist in `oldTables`.  
A table is considered **removed** if its `name` doesn't exist in `newTables`.

> **Key:** Comparison is done by **`name`**, not by `id`. This means if a table is renamed, it appears as one removal + one addition — not as a modification.

---

### Step 3 — Field-level diff for modified tables

For every table that exists in **both** old and new states (i.e. same `name`):

```js
const addedFields   = newTable.fields.filter(nf => !oldTable.fields.find(of => of.name === nf.name));
const removedFields = oldTable.fields.filter(of => !newTable.fields.find(nf => nf.name === of.name));
```

Fields are also compared by `name`.

---

### Step 4 — Field property change detection

For fields present in **both** versions, each of three properties is compared:

```js
const changes = {};
if (oldField.type     !== newField.type)     changes.type     = { from: oldField.type,     to: newField.type };
if (oldField.nullable !== newField.nullable) changes.nullable = { from: oldField.nullable, to: newField.nullable };
if (oldField.default  !== newField.default)  changes.default  = { from: oldField.default,  to: newField.default };
```

If any changes exist, the field is added to `modifiedFields`.

---

### Step 5 — Assemble modifiedTables

A table is pushed to `modifiedTables` only if it has at least one of: `addedFields`, `removedFields`, or `modifiedFields`.

```js
if (addedFields.length > 0 || removedFields.length > 0 || modifiedFields.length > 0) {
  modifiedTables.push({ name: newTable.name, addedFields, removedFields, modifiedFields });
}
```

---

### Step 6 — Relationship diff (by `id`)

```js
addedRelationships:   newRelationships.filter(nr => !oldRelationships.find(or => or.id === nr.id)),
removedRelationships: oldRelationships.filter(or => !newRelationships.find(nr => nr.id === or.id))
```

Unlike tables/fields, relationships are compared by **`id`** (not by source/target names). This means if a relationship's ID changes but its endpoints are the same, it appears as removed + added.

---

## 6. Output Shape (Diff Object)

```ts
{
  addedTables: Table[];         // Full table objects from newState not in oldState
  removedTables: Table[];       // Full table objects from oldState not in newState
  modifiedTables: {
    name: string;
    addedFields: Field[];       // Full field objects added to this table
    removedFields: Field[];     // Full field objects removed from this table
    modifiedFields: {
      name: string;             // Field name
      changes: {
        type?:     { from: string,  to: string };
        nullable?: { from: boolean, to: boolean };
        default?:  { from: any,     to: any };
      }
    }[];
  }[];
  addedRelationships: Relationship[];    // Full relationship objects
  removedRelationships: Relationship[];  // Full relationship objects
}
```

### Example Output

```json
{
  "addedTables": [
    {
      "id": "tbl_tags",
      "name": "tags",
      "fields": [{ "id": "fld_tags_id", "name": "id", "type": "bigserial", "isPK": true }]
    }
  ],
  "removedTables": [],
  "modifiedTables": [
    {
      "name": "users",
      "addedFields": [
        { "id": "fld_users_phone", "name": "phone", "type": "text", "nullable": true }
      ],
      "removedFields": [],
      "modifiedFields": [
        {
          "name": "email",
          "changes": {
            "nullable": { "from": false, "to": true }
          }
        }
      ]
    }
  ],
  "addedRelationships": [],
  "removedRelationships": []
}
```

---

## 7. Field-Level Change Tracking

Only **three** field properties are tracked for changes:

| Property | Tracked? | Notes |
|---|---|---|
| `type` | ✅ | String equality comparison |
| `nullable` | ✅ | Boolean equality comparison |
| `default` | ✅ | Loose equality (`!==`) — see caveats |
| `isPK` | ❌ | Not tracked |
| `isFK` | ❌ | Not tracked |
| `unique` | ❌ | Not tracked |
| `name` | ❌ | Used as identity key, not tracked as a change |

Untracked properties (`isPK`, `isFK`, `unique`) will not appear in `modifiedFields.changes` even if they changed between versions.

---

## 8. Relationship Diffing

Relationship diffing is computed **inline** inside the return statement (line 52–53), not in the main loop:

```js
addedRelationships:   newRels.filter(nr => !oldRels.find(or => or.id === nr.id)),
removedRelationships: oldRels.filter(or => !newRels.find(nr => nr.id === or.id))
```

**Important characteristics:**
- Compared by `id`, not by `sourceTableId`/`targetTableId` pairs.
- **Modified relationships are not detected** — a change to a relationship's cardinality or target would show as remove + add.
- The comment on line 51 (`// Relationships could be added here in a future phase`) confirms this is intentionally incomplete.

---

## 9. Notable Patterns & Conventions

- **Pure function:** No side effects, no I/O, fully deterministic. The same inputs always produce the same output.
- **Name-based identity:** Tables and fields use `name` as their identity key for diffing — not `id`. This is a deliberate choice to match on semantic identity rather than generated IDs.
- **`{ from, to }` change shape:** Each change is represented as `{ from: oldValue, to: newValue }` — a clean, self-documenting diff format that's immediately consumable by migration generators.
- **Null-safe state access:** `oldState?.tables || []` prevents crashes when either state is empty or malformed.
- **No deep clone:** The returned arrays contain **references** to the original table/field objects from the input states. Callers should not mutate these objects.
- **O(n²) complexity:** The `Array.find()` calls inside `filter()` loops mean this runs in O(n²) time relative to table count and field count. Acceptable for typical schema sizes (tens of tables, hundreds of fields), but would not scale to thousands.

---

## 10. Known Caveats & Limitations

| Issue | Description |
|---|---|
| **Rename not detected** | A renamed table appears as `removedTable + addedTable`, not as a `modifiedTable`. Same for renamed fields. |
| **`default` comparison uses `!==`** | `null !== undefined` is true, so a field with `default: null` vs `default: undefined` would appear changed. Since `sqlExporter.js` uses `undefined` and the DB may return `null`, spurious default changes are possible. |
| **`isPK`, `isFK`, `unique` not tracked** | Changes to these properties are silently ignored in the diff. |
| **Relationship changes not fully modeled** | Modified relationships (same ID, different properties) are not detected. |
| **No relationship modification tracking** | Only add/remove by `id` — no `modifiedRelationships` equivalent. |
| **O(n²) performance** | Nested `.find()` calls inside `.filter()` loops. Fine for small schemas, inefficient for very large ones. |
| **No schema validation** | Input objects are not validated — malformed `tables` arrays (e.g. missing `name` or `fields`) will cause runtime errors. |

---

## 11. Usage Examples

### Basic Usage

```js
import { diffSchemas } from './schemaDiff.js';

const oldState = {
  tables: [
    {
      name: 'users',
      fields: [
        { name: 'id',    type: 'bigserial', isPK: true,  nullable: false },
        { name: 'email', type: 'text',      isPK: false, nullable: false }
      ]
    }
  ],
  relationships: []
};

const newState = {
  tables: [
    {
      name: 'users',
      fields: [
        { name: 'id',    type: 'bigserial', isPK: true,  nullable: false },
        { name: 'email', type: 'text',      isPK: false, nullable: true },  // nullable changed
        { name: 'phone', type: 'text',      isPK: false, nullable: true }   // new field
      ]
    },
    {
      name: 'tags',  // new table
      fields: [{ name: 'id', type: 'bigserial', isPK: true, nullable: false }]
    }
  ],
  relationships: []
};

const diff = diffSchemas(oldState, newState);

// diff.addedTables  → [{ name: 'tags', ... }]
// diff.modifiedTables → [{ name: 'users', addedFields: [{ name: 'phone', ... }], modifiedFields: [{ name: 'email', changes: { nullable: { from: false, to: true } } }] }]
```

### Null-safe Usage

```js
// Both of these are safe:
diffSchemas(null, newState);
diffSchemas(oldState, null);
diffSchemas(null, null);  // returns all-empty diff
```

---

## 12. Consumers of This Module

| Consumer | Usage |
|---|---|
| `server/routes/mcpGateway.js` | `schemaforge_diff_schemas` tool — returns the raw diff to MCP clients |
| `server/utils/migrationGenerator.js` | Receives the diff as input to `generateMigration()` |

---

*Generated documentation for SchemaForge — `server/utils/schemaDiff.js`*
