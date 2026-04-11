# `templates.ts` — Utility Documentation

> **Location:** `src/utils/templates.ts`  
> **Type:** Template Data Module — TypeScript  
> **Purpose:** Defines four pre-built database schema templates (Blog, E-commerce, Auth & Users, Multi-tenant SaaS) as structured data with tables, fields, and relationships. Exports a `TEMPLATES` registry, a `getTemplate()` function that returns deep-cloned instances, and the `TemplateKey` type for type-safe template access.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Code Structure & Organization](#3-code-structure--organization)
4. [Type Definitions](#4-type-definitions)
5. [Helper Function — `t()`](#5-helper-function--t)
6. [Templates — Complete Reference](#6-templates--complete-reference)
   - [Blog](#blog)
   - [E-commerce](#e-commerce)
   - [Auth & Users](#auth--users)
   - [Multi-tenant SaaS](#multi-tenant-saas)
7. [Exports](#7-exports)
   - [`TEMPLATES`](#templates)
   - [`TemplateKey`](#templatekey)
   - [`getTemplate()`](#gettemplate)
8. [Deep Clone Architecture](#8-deep-clone-architecture)
9. [Notable Patterns & Conventions](#9-notable-patterns--conventions)
10. [Known Caveats & Limitations](#10-known-caveats--limitations)
11. [Usage Examples](#11-usage-examples)

---

## 1. File Overview

`templates.ts` is a **data-heavy module** that defines SchemaForge's built-in starter templates. Each template is a complete, ready-to-use relational schema with:

- **Named tables** with typed fields, constraints, and accent colors
- **Pre-computed canvas positions** so tables appear arranged (not all at `{0,0}`)
- **Relationship definitions** wiring FK fields between tables

The critical design challenge here is that template objects are **module-level singletons** — they are created once when the module loads and shared across all imports. If a template were applied directly to the canvas, every subsequent application of that template would reference the same object IDs, causing conflicts. The `getTemplate()` function solves this by returning a **deep clone with freshly generated IDs** every time it is called.

---

## 2. Dependencies & Imports

```ts
import { nanoid } from '../store/nanoid';
import type { Table, Relationship } from '../types/schema';
```

| Import | Source | Role |
|---|---|---|
| `nanoid` | `../store/nanoid` | Generates short, unique, URL-safe IDs for tables, fields, and relationships |
| `Table` | `../types/schema` | TypeScript type for canvas table objects |
| `Relationship` | `../types/schema` | TypeScript type for FK relationship objects |

`nanoid` is imported from a local re-export (`../store/nanoid`) rather than the `nanoid` package directly — likely to centralize ID generation configuration (e.g. custom alphabet or length).

---

## 3. Code Structure & Organization

```
templates.ts
├── Imports                         (lines 1–2)
├── Template interface              (lines 4–9)
├── t() helper function             (lines 11–19)
├── Blog template data              (lines 21–66)
│   ├── Table definitions           (lines 22–51)
│   ├── Position assignments        (lines 53–58)
│   └── Relationship definitions    (lines 60–66)
├── E-commerce template data        (lines 68–106)
│   ├── Table definitions           (lines 69–95)
│   ├── Position assignments        (lines 97–100)
│   └── Relationship definitions    (lines 102–106)
├── Auth & Users template data      (lines 108–137)
│   ├── Table definitions           (lines 109–128)
│   ├── Position assignments        (lines 130–132)
│   └── Relationship definitions    (lines 134–137)
├── Multi-tenant SaaS template data (lines 139–175)
│   ├── Table definitions           (lines 140–164)
│   ├── Position assignments        (lines 166–169)
│   └── Relationship definitions    (lines 171–175)
├── TEMPLATES export (registry)     (lines 177–202)
├── TemplateKey type export         (line 204)
└── getTemplate() export            (lines 213–249)
```

---

## 4. Type Definitions

### `Template` (local interface)

**Lines:** 4–9

```ts
interface Template {
  label: string;
  description: string;
  tables: Table[];
  relationships: Relationship[];
}
```

| Property | Type | Description |
|---|---|---|
| `label` | `string` | Display name shown in the UI template picker |
| `description` | `string` | Short subtitle describing the template's domain |
| `tables` | `Table[]` | Array of table objects with fields and positions |
| `relationships` | `Relationship[]` | Array of FK relationships between tables |

---

## 5. Helper Function — `t()`

**Lines:** 11–19

```ts
function t(
  name: string,
  accent: Table['accentColor'],
  fields: Omit<Table['fields'][0], 'id'>[]
): Table
```

A **concise table factory** — creates a fully structured `Table` object from minimal inputs, auto-generating `nanoid()` IDs for the table and all its fields.

```ts
function t(name, accent, fields): Table {
  return {
    id: nanoid(),              // Auto-generated table ID
    name,
    accentColor: accent,
    position: { x: 0, y: 0 }, // Default — overridden below each call
    fields: fields.map(f => ({ ...f, id: nanoid() })), // Auto-generate field IDs
  };
}
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `name` | `string` | Table name (snake_case) |
| `accent` | `Table['accentColor']` | Accent color from the color palette |
| `fields` | `Omit<Field, 'id'>[]` | Field definitions without IDs (IDs are auto-generated) |

The `Omit<Table['fields'][0], 'id'>` type ensures callers don't need to supply IDs — the helper generates them. This makes template definitions compact and readable.

---

## 6. Templates — Complete Reference

---

### Blog

**Lines:** 21–66 | **Key:** `'blog'`  
**Description:** `"Users, posts, comments, tags and post_tags"`

#### Tables

| Table | Accent | Fields | Position |
|---|---|---|---|
| `users` | `blue` | id, email, name, created_at | `(80, 80)` |
| `posts` | `teal` | id, author_id (FK), title, slug, body, published_at, created_at | `(360, 80)` |
| `comments` | `coral` | id, post_id (FK), author_id (FK), body, created_at | `(360, 340)` |
| `tags` | `purple` | id, name | `(700, 80)` |
| `post_tags` | `amber` | post_id (FK), tag_id (FK) | `(700, 280)` |

#### Relationships

| From | Field | To | Field | Cardinality |
|---|---|---|---|---|
| `posts` | `author_id` → | `users` | `id` | one-to-many |
| `comments` | `post_id` → | `posts` | `id` | one-to-many |
| `comments` | `author_id` → | `users` | `id` | one-to-many |
| `post_tags` | `post_id` → | `posts` | `id` | one-to-many |
| `post_tags` | `tag_id` → | `tags` | `id` | one-to-many |

`post_tags` is a **junction table** implementing a many-to-many relationship between `posts` and `tags`.

---

### E-commerce

**Lines:** 68–106 | **Key:** `'ecommerce'`  
**Description:** `"Users, products, orders and order_items"`

#### Tables

| Table | Accent | Key Fields | Position |
|---|---|---|---|
| `users` | `blue` | id, email, name, created_at | `(80, 80)` |
| `products` | `teal` | id, name, price, stock (default: 0), created_at | `(380, 320)` |
| `orders` | `coral` | id, user_id (FK), total, status (default: `'pending'`), created_at | `(380, 80)` |
| `order_items` | `amber` | id, order_id (FK), product_id (FK), quantity, unit_price | `(680, 200)` |

#### Relationships

| From | Field | To | Field | Cardinality |
|---|---|---|---|---|
| `orders` | `user_id` → | `users` | `id` | one-to-many |
| `order_items` | `order_id` → | `orders` | `id` | one-to-many |
| `order_items` | `product_id` → | `products` | `id` | one-to-many |

`order_items` serves as the line-item bridge between orders and products.

---

### Auth & Users

**Lines:** 108–137 | **Key:** `'auth'`  
**Description:** `"Users, sessions and profiles with UUID keys"`

#### Tables

| Table | Accent | Key Fields | Position |
|---|---|---|---|
| `users` | `blue` | id (uuid, PK, default: `gen_random_uuid()`), email, email_verified_at, created_at | `(80, 160)` |
| `sessions` | `teal` | id (uuid), user_id (FK), token_hash, expires_at, created_at | `(400, 80)` |
| `profiles` | `purple` | user_id (uuid, PK+FK), display_name, avatar_url, bio, updated_at | `(400, 300)` |

#### Relationships

| From | Field | To | Field | Cardinality |
|---|---|---|---|---|
| `sessions` | `user_id` → | `users` | `id` | one-to-many |
| `profiles` | `user_id` → | `users` | `id` | **one-to-one** |

This is the only template that uses `'one-to-one'` cardinality (profiles ↔ users) and `uuid` PKs with `gen_random_uuid()` defaults.

---

### Multi-tenant SaaS

**Lines:** 139–175 | **Key:** `'saas'`  
**Description:** `"Organizations, users, members and subscriptions"`

#### Tables

| Table | Accent | Key Fields | Position |
|---|---|---|---|
| `organizations` | `blue` | id (uuid), name, slug, plan (default: `'free'`), created_at | `(80, 80)` |
| `users` | `teal` | id (uuid), email, created_at | `(80, 360)` |
| `members` | `coral` | org_id (FK), user_id (FK), role (default: `'member'`), joined_at | `(400, 200)` |
| `subscriptions` | `purple` | id (uuid), org_id (FK), plan, status, current_period_end | `(700, 80)` |

#### Relationships

| From | Field | To | Field | Cardinality |
|---|---|---|---|---|
| `members` | `org_id` → | `organizations` | `id` | one-to-many |
| `members` | `user_id` → | `users` | `id` | one-to-many |
| `subscriptions` | `org_id` → | `organizations` | `id` | one-to-many |

`members` is a junction table modeling the many-to-many relationship between organizations and users, with an additional `role` column.

---

## 7. Exports

### `TEMPLATES`

**Lines:** 177–202  
**Type:** `Record<string, Template>`

```ts
export const TEMPLATES: Record<string, Template> = {
  blog:      { label: 'Blog',             description: '...', tables: [...], relationships: [...] },
  ecommerce: { label: 'E-commerce',       description: '...', tables: [...], relationships: [...] },
  auth:      { label: 'Auth & Users',     description: '...', tables: [...], relationships: [...] },
  saas:      { label: 'Multi-tenant SaaS', description: '...', tables: [...], relationships: [...] },
};
```

The registry of all available templates. Keys are the template identifiers used in code; values are the full `Template` objects.

> ⚠️ **Do not use `TEMPLATES[key]` directly** to apply templates to the canvas. Use `getTemplate(key)` instead — see below.

---

### `TemplateKey`

**Line:** 204  
**Type:** `type TemplateKey = keyof typeof TEMPLATES`

```ts
export type TemplateKey = keyof typeof TEMPLATES;
// Equivalent to: 'blog' | 'ecommerce' | 'auth' | 'saas'
```

A **derived union type** from the `TEMPLATES` object keys. Automatically updated when keys are added or removed from `TEMPLATES` — no manual maintenance needed. Used for type-safe template selection in components.

---

### `getTemplate()`

**Lines:** 213–249  
**Signature:**
```ts
export function getTemplate(id: string): Template | null
```

Returns a **deep clone** of the requested template with **freshly generated `nanoid()`s** for all table IDs, field IDs, and relationship IDs. Returns `null` if the `id` doesn't match any template.

#### Why deep clone?

The module-level template objects are **singletons**. All templates are instantiated once at module load time with fixed `nanoid()` IDs. If they were applied directly:

- Applying "Blog" twice would result in two sets of tables with **identical IDs**.
- This would cause ID collisions in the canvas store, Zustand state, and React key props.
- Historically (per the JSDoc comment on line 207), this caused all templates to appear as e-commerce (the first one loaded), because shared IDs made different templates indistinguishable.

#### Clone Algorithm

```
1. For each original table:
   - Generate newTableId = nanoid()
   - Record: tableIdMap[oldTableId] = newTableId
   - For each field:
     - Generate newFieldId = nanoid()
     - Record: fieldIdMap[oldFieldId] = newFieldId
   - Return cloned table with new IDs

2. For each original relationship:
   - Generate new rel ID = nanoid()
   - Remap: sourceTableId, targetTableId via tableIdMap
   - Remap: sourceFieldId, targetFieldId via fieldIdMap
   - Return cloned relationship with remapped IDs
```

The `?? rel.sourceTableId` fallback in the remap ensures that if an ID isn't found in the map (shouldn't happen in valid data), the original ID is preserved rather than producing `undefined`.

---

## 8. Deep Clone Architecture

```
getTemplate('blog')
      │
      ▼
original = TEMPLATES['blog']   ← singleton, never mutated
      │
      ▼
Build tableIdMap: { "old_tbl_id" → "new_tbl_id", ... }
Build fieldIdMap: { "old_fld_id" → "new_fld_id", ... }
      │
      ▼
clonedTables = original.tables.map(table => ({
  ...table,
  id: tableIdMap[table.id],
  fields: table.fields.map(f => ({ ...f, id: fieldIdMap[f.id] }))
}))
      │
      ▼
clonedRelationships = original.relationships.map(rel => ({
  ...rel,
  id: nanoid(),
  sourceTableId: tableIdMap[rel.sourceTableId],
  targetTableId: tableIdMap[rel.targetTableId],
  sourceFieldId: fieldIdMap[rel.sourceFieldId],
  targetFieldId: fieldIdMap[rel.targetFieldId],
}))
      │
      ▼
return { label, description, tables: clonedTables, relationships: clonedRelationships }
```

**Shallow properties are spread** (`...table`, `...field`, `...rel`) — only `id` references are replaced. Non-ID properties (names, types, defaults, positions) are copied as-is from the original.

---

## 9. Notable Patterns & Conventions

- **Two-phase ID generation:** IDs are assigned by `t()` at module load time for the singletons, and reassigned by `getTemplate()` for each clone. This two-phase approach cleanly separates template definition from runtime instantiation.
- **Field index-based relationship wiring:** Relationships reference fields by positional index (e.g. `blogPosts.fields[1].id` for `author_id`). This is compact but fragile — inserting a field before `author_id` would silently wire the relationship to the wrong column.
- **Position mutation after creation:** Positions are assigned via direct property mutation (`blogUsers.position = { x: 80, y: 80 }`) after `t()` returns. This is simpler than passing positions into `t()` and keeps the table definition line short.
- **Accent color per table:** Each table in a template gets a distinct accent color, making the multi-table canvas visually distinguishable at a glance.
- **`Omit<Field, 'id'>[]` in `t()`:** Callers don't supply field IDs — the helper auto-generates them. This prevents typos and ID collisions in template definitions.
- **`TemplateKey` derived type:** Rather than manually maintaining `'blog' | 'ecommerce' | 'auth' | 'saas'`, the type is derived from `keyof typeof TEMPLATES` — always stays in sync automatically.
- **`nanoid` from local re-export:** Using `'../store/nanoid'` instead of the `nanoid` package directly suggests the project controls ID generation centrally (custom length, alphabet, or seed).

---

## 10. Known Caveats & Limitations

| Issue | Description |
|---|---|
| **Field index-based FK wiring** | Relationships use `table.fields[N].id` positional lookups. Adding a field before an FK field breaks all relationships wired to fields after it — silently, with no error. |
| **Hardcoded canvas positions** | Template positions are manually chosen pixel coordinates. They may overlap or look suboptimal on different screen sizes or after canvas zooming. |
| **No `getTemplate` for `TemplateKey` type** | `getTemplate(id: string)` accepts any `string`, not just `TemplateKey`. A more type-safe signature would be `getTemplate(id: TemplateKey): Template`. |
| **Singleton mutation risk** | Although `getTemplate()` clones deeply, the original singletons could theoretically be mutated by a consumer doing `TEMPLATES.blog.label = 'X'`. These objects are not frozen (`Object.freeze`). |
| **No `updated_at` on most templates** | Only the Auth template includes `updated_at` on `profiles`. Most templates don't include it for non-PK tables, which may lead to inconsistency when comparing against real-world schema conventions. |
| **`post_tags` has no PK** | The blog `post_tags` junction table has no `isPK: true` field — in a real database this would typically have a composite PK or a surrogate PK. |
| **`members` has no PK** | Similarly, the SaaS `members` junction table has no PK. |

---

## 11. Usage Examples

### Applying a Template

```ts
import { getTemplate } from './templates';

const template = getTemplate('blog');
if (template) {
  schemaStore.setTables(template.tables);
  schemaStore.setRelationships(template.relationships);
}
```

### Listing Available Templates

```ts
import { TEMPLATES } from './templates';

Object.entries(TEMPLATES).forEach(([key, tmpl]) => {
  console.log(`${key}: ${tmpl.label} — ${tmpl.description}`);
});
// blog: Blog — Users, posts, comments, tags and post_tags
// ecommerce: E-commerce — Users, products, orders and order_items
// auth: Auth & Users — Users, sessions and profiles with UUID keys
// saas: Multi-tenant SaaS — Organizations, users, members and subscriptions
```

### Type-safe Template Key

```ts
import type { TemplateKey } from './templates';
import { getTemplate } from './templates';

function loadTemplate(key: TemplateKey) {
  return getTemplate(key)!; // guaranteed non-null for valid TemplateKey
}
```

---

*Generated documentation for SchemaForge — `src/utils/templates.ts`*
