# Docs Components — Documentation

> **Location:** `src/components/docs/`  
> **Type:** React Components — TypeScript/TSX  
> **Purpose:** Two components that form the in-app documentation section — a layout shell with a grouped sidebar navigation, and a collection of six static article content components covering Modellr concepts from beginner to advanced.

---

## Overview

| File | Export(s) | Role |
|---|---|---|
| `DocsLayout.tsx` | `DocsLayout` | Two-column docs shell: sidebar nav + article content area |
| `Articles.tsx` | `IntroArticle`, `NormalizationArticle`, `CanvasArticle`, `RelationshipsArticle`, `MCPArticle`, `ExportArticle` | Static article content components for each documentation topic |

---

---

# `DocsLayout.tsx` — Component Documentation

> **Location:** `src/components/docs/DocsLayout.tsx`

## File Overview

A **layout shell** that wraps all documentation pages. Renders a fixed sidebar navigation grouped by topic, with the article content area rendered as `children`. The parent (`Docs.tsx` page) controls which article is active and handles article switching — `DocsLayout` is purely a presentational layout component.

## Dependencies & Imports

No explicit imports — relies on the JSX auto-transform. `React.FC` is used but `React` is not imported, which suggests the TSX file relies on the automatic JSX runtime.

> **Note:** `React` is not imported despite using `React.FC` as the type annotation. This will cause a TypeScript error (`Cannot find name 'React'`). Works at runtime (Vite resolves JSX automatically) but breaks strict TypeScript compilation.

## Props

```tsx
interface DocsLayoutProps {
  currentArticle: string;        // ID of the currently active article
  onSelect:       (id: string) => void;  // Called when user clicks a nav item
  children:       React.ReactNode;       // The rendered article component
}
```

| Prop | Type | Description |
|---|---|---|
| `currentArticle` | `string` | Compared against `item.id` to apply `docs-nav-item--active` class |
| `onSelect` | `(id: string) => void` | Parent handles actual article switching by ID |
| `children` | `React.ReactNode` | The article component rendered in the main content area |

## Navigation Structure

```ts
const navGroups = [
  {
    title: 'Introduction',
    items: [
      { id: 'intro',         label: 'Welcome to Modellr' },
      { id: 'normalization', label: 'Normalization 101' },
      { id: 'canvas',        label: 'The Visual Editor' },
      { id: 'relationships', label: 'Understanding Relationships' },
    ],
  },
  {
    title: 'Professional Sync',
    items: [
      { id: 'mcp',  label: 'MCP & IDE Connection' },
    ],
  },
  {
    title: 'Collaboration & Porting',
    items: [
      { id: 'export', label: 'SQL & Prisma Exports' },
    ],
  },
];
```

**Article IDs** (6 total):

| ID | Group | Rendered By |
|---|---|---|
| `'intro'` | Introduction | `IntroArticle` |
| `'normalization'` | Introduction | `NormalizationArticle` |
| `'canvas'` | Introduction | `CanvasArticle` |
| `'relationships'` | Introduction | `RelationshipsArticle` |
| `'mcp'` | Professional Sync | `MCPArticle` |
| `'export'` | Collaboration & Porting | `ExportArticle` |

## Rendered Layout

```
<div class="docs-container">
  │
  ├── <aside class="docs-sidebar">
  │     ├── "Documentation" logo/heading
  │     └── <nav>
  │           ├── Group: "Introduction"
  │           │     ├── Welcome to Modellr    [docs-nav-item / --active]
  │           │     ├── Normalization 101
  │           │     ├── The Visual Editor
  │           │     └── Understanding Relationships
  │           ├── Group: "Professional Sync"
  │           │     └── MCP & IDE Connection
  │           └── Group: "Collaboration & Porting"
  │                 └── SQL & Prisma Exports
  │
  └── <main class="docs-article-wrapper">
        └── <div class="docs-content">
              {children}   ← Article component rendered here
        </div>
```

## Active Link Detection

```tsx
className={`docs-nav-item ${currentArticle === item.id ? 'docs-nav-item--active' : ''}`}
```

Exact string match — works correctly since IDs are simple stable strings.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **`React` not imported** | `React.FC` used in props type but `React` not imported — TypeScript error if `noImplicitAny` / `react` types strict mode is enabled |
| **Static nav structure** | `navGroups` defined inside the component body on every render — could be extracted as a module-level constant |
| **No URL routing** | Article selection is purely state-based (no URL params) — users cannot deep-link to a specific article or use the browser Back button to navigate between articles |
| **`onSelect` delegates all logic** | `DocsLayout` has zero side effects — it calls `onSelect(id)` and lets the parent (`Docs.tsx`) decide what to render as `children` |
| **Inline style for group margin** | `style={{ marginBottom: '32px' }}` on group divs — inconsistent with the CSS class approach used elsewhere |

---

---

# `Articles.tsx` — Component Documentation

> **Location:** `src/components/docs/Articles.tsx`

## File Overview

A collection of **six static, self-contained article components** — one per documentation topic. Each component returns an `<article>` element with semantic HTML content. No state, no props, no store access — purely presentational.

All articles use a shared set of CSS classes defined in the docs stylesheet:

| CSS Class | Purpose |
|---|---|
| `.docs-article` | Article container (padding, max-width, typography) |
| `.docs-alert` | Callout/tip box |
| `.docs-alert-title` | Bold callout header |
| `.docs-alert-text` | Callout body text |
| `.docs-list` | Styled `<ul>` list |
| `.docs-code-block` | Code/snippet display box |
| `.docs-code-label` | Label inside a code block (e.g. filename) |

---

## Article Registry

| Export | Article ID (in `DocsLayout`) | Topic |
|---|---|---|
| `IntroArticle` | `'intro'` | Welcome — what Modellr is, why visual modeling |
| `NormalizationArticle` | `'normalization'` | Database normalization — beginner analogy-first |
| `CanvasArticle` | `'canvas'` | Visual editor — interactions, naming conventions, shortcuts |
| `RelationshipsArticle` | `'relationships'` | FK relationships, crow's foot notation, 1:1 and 1:N |
| `MCPArticle` | `'mcp'` | MCP/IDE integration — advanced, config snippet |
| `ExportArticle` | `'export'` | Export formats — PostgreSQL, Prisma, Image |

---

## Article Content Details

### `IntroArticle`

**Audience:** All users (emphasizes no-code accessibility)

**Sections:**
- Hero copy: Modellr for architects and students
- Alert callout: "Visual Designing for Students" — reassures non-code users
- "Why Visual Modeling Matters?" — three benefits: catch errors early, collaborate, focus on logic

```jsx
<article className="docs-article">
  <h1>Welcome to Modellr</h1>
  <div className="docs-alert">...</div>
  <h2>Why Visual Modeling Matters?</h2>
  <ul className="docs-list">...</ul>
</article>
```

---

### `NormalizationArticle`

**Audience:** Beginners / students

**Sections:**
- Analogy-first intro: "buckets" metaphor for tables
- "The Single Bucket Mistake" — over-denormalization example
- Alert callout: "The Golden Rule" — one table = one thing
- Self-test question: "If a user changes their email, how many rows update?"

**Teaching style:** Analogy-driven, avoids academic jargon (no mention of 1NF/2NF/3NF).

---

### `CanvasArticle`

**Audience:** New users learning the editor

**Sections:**
- Overview of the visual editor
- "Table Interactions" list: naming conventions (`snake_case`), PKs, accent colors
- "Keyboard Power-Ups" — displayed as a raw text code block

**Keyboard shortcuts block (raw text string):**
```
G      - Auto-layout (cleans up your mess)
/      - Search for a specific table or field
DEL    - Delete the selected table or connection
F      - Fit the entire schema on your screen
```

> These shortcuts are documented as `G`, `/`, `DEL`, `F` — cross-reference with the actual bindings in `useKeyboardShortcuts.ts`. The shortcut for "fit view" is `0` (zero) in the actual code, not `F`.

> **Discrepancy:** The documented shortcut `F` for "Fit" does not match the implementation. `useKeyboardShortcuts.ts` dispatches `sf:fit-view` on key `'0'` (zero), not `'f'`. This documentation is potentially misleading for users.

---

### `RelationshipsArticle`

**Audience:** Beginners

**Sections:**
- Relationships as "bridges" between data buckets
- Crow's foot notation — visual convention explanation
- 1:1 and 1:N definitions with real-world examples
- Alert callout: "Foreign Keys (FK)" — `user_id` as the glue between User and Order

> The article only covers one-to-one and one-to-many. **Many-to-many** is not mentioned, though Modellr supports it as a cardinality option.

---

### `MCPArticle`

**Audience:** Advanced / professional developers

**Sections:**
- What MCP is — AI coding assistant (Cursor/Windsurf) bridge
- "Connecting Your Workspace" — JSON config snippet with the `@Modellr/mcp-server` npm package
- "Why use this?" — AI fetches the visual canvas and writes migrations automatically

**Config snippet:**
```json
{
  "mcpServers": {
    "Modellr": {
      "command": "npx",
      "args": ["-y", "@Modellr/mcp-server"],
      "env": {
        "SCHEMA_FORGE_TOKEN": "sfk_live_your_token_here"
      }
    }
  }
}
```

> The `SCHEMA_FORGE_TOKEN` format (`sfk_live_*`) matches the prefix-based API key lookup in `mcpGateway.js` — consistent with the backend implementation.

> `@Modellr/mcp-server` is documented as an npm package — this should exist and be published at the time this feature is promoted to users.

---

### `ExportArticle`

**Audience:** All users

**Sections:**
- Overview: all major database engines supported
- "Supported Formats" list: PostgreSQL, Prisma, Image (PNG/SVG)

> The article mentions PostgreSQL, Prisma, and Image exports — but omits MySQL, Drizzle ORM, DBML, and Migration scripts, all of which are supported by the exporters (`src/utils/exporters/`). The documentation is **incomplete relative to the actual feature set**.

---

## How Articles Connect to the Page

The parent `Docs.tsx` page manages the article ID state and maps it to the appropriate component:

```tsx
// Docs.tsx (parent page — inferred from DocsLayout integration)
const [article, setArticle] = useState('intro');

const articleMap = {
  intro:         <IntroArticle />,
  normalization: <NormalizationArticle />,
  canvas:        <CanvasArticle />,
  relationships: <RelationshipsArticle />,
  mcp:           <MCPArticle />,
  export:        <ExportArticle />,
};

<DocsLayout currentArticle={article} onSelect={setArticle}>
  {articleMap[article]}
</DocsLayout>
```

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **No imports** | Articles are pure JSX — no React import, no hooks, no types. Works with JSX auto-transform |
| **Keyboard shortcut discrepancy** | `CanvasArticle` documents `F` for "Fit view" but `useKeyboardShortcuts.ts` uses `'0'` (zero) |
| **Incomplete export list** | `ExportArticle` only mentions PostgreSQL, Prisma, and Image — omits MySQL, Drizzle, DBML, and Migrations |
| **No many-to-many coverage** | `RelationshipsArticle` covers 1:1 and 1:N but not M:N relationships |
| **Raw string code block** | Keyboard shortcuts are rendered as a raw template literal string inside a `<div>`, not in a `<pre>` or `<code>` element — semantically suboptimal for accessibility and copy-paste |
| **No deep linking** | Combined with `DocsLayout`'s state-based approach: `/docs/mcp` is not a valid URL — all articles live at the same `/docs` route |
| **Static content** | All six articles are hardcoded — no CMS, no dynamic loading, no versioning. Adding or editing articles requires a code deploy |

---

## Component Relationship Diagram

```
Docs.tsx (page)
│
├── manages:  article state (string ID)
│
└── renders:
      <DocsLayout currentArticle={article} onSelect={setArticle}>
        │
        ├── DocsLayout renders:
        │     ├── <aside> sidebar with navGroups
        │     │         onClick(item.id) → onSelect(id) → setArticle(id)
        │     └── <main> content area
        │               └── {children}
        │
        └── children = articleMap[article]:
              ├── 'intro'         → <IntroArticle />
              ├── 'normalization' → <NormalizationArticle />
              ├── 'canvas'        → <CanvasArticle />
              ├── 'relationships' → <RelationshipsArticle />
              ├── 'mcp'           → <MCPArticle />
              └── 'export'        → <ExportArticle />
```

---

*Generated documentation for Modellr — `src/components/docs/`*
