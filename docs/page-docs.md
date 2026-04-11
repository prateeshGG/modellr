# `Docs.tsx` — Page Documentation

> **Location:** `src/pages/Docs.tsx`  
> **Type:** React Page Component — TypeScript/TSX  
> **Route:** `/docs` (public, no auth required)  
> **Purpose:** The public-facing documentation page. Acts as a thin orchestration shell — manages only which article is currently active (`activeArticle` state), assembles the full-page layout from `PublicNav`, `DocsLayout`, and `Footer`, and delegates article content rendering to a `switch` over named article components from `Articles.tsx`.

---

## File Overview

`Docs.tsx` is deliberately minimal — a **controller page** with no business logic of its own. All visual content lives in `DocsLayout` (sidebar + content shell) and `Articles.tsx` (the individual article components). The page's sole responsibility is to:

1. Track which article ID is active (`useState`)
2. Pass `activeArticle` + `setActiveArticle` to `DocsLayout` as sidebar nav props
3. Render the correct article via `renderArticle()` as `DocsLayout`'s children

---

## Dependencies & Imports

```tsx
import { PublicNav }    from '../components/layout/PublicNav';
import { Footer }       from '../components/layout/Footer';
import { DocsLayout }   from '../components/docs/DocsLayout';
import {
  IntroArticle,
  NormalizationArticle,
  CanvasArticle,
  RelationshipsArticle,
  MCPArticle,
  ExportArticle,
} from '../components/docs/Articles';
```

| Import | Role |
|---|---|
| `PublicNav` | Top navbar with auth-aware CTA buttons |
| `Footer` | Site-wide marketing footer |
| `DocsLayout` | Two-column layout: sidebar nav + content area |
| Article components | Six named article exports from `Articles.tsx` |

No store imports — `Docs` is entirely stateless w.r.t. the application state.

---

## State

```ts
const [activeArticle, setActiveArticle] = useState('intro');
```

Single piece of state — the current article key. Defaults to `'intro'`.

**Valid article IDs:**

| ID | Article Component |
|---|---|
| `'intro'` | `IntroArticle` (default) |
| `'normalization'` | `NormalizationArticle` |
| `'canvas'` | `CanvasArticle` |
| `'relationships'` | `RelationshipsArticle` |
| `'mcp'` | `MCPArticle` |
| `'export'` | `ExportArticle` |

The `default` branch of `renderArticle()` returns `<IntroArticle />` — an unknown ID falls back to the intro article silently.

---

## `renderArticle()` — Article Switch

```ts
const renderArticle = () => {
  switch (activeArticle) {
    case 'intro':         return <IntroArticle />;
    case 'normalization': return <NormalizationArticle />;
    case 'canvas':        return <CanvasArticle />;
    case 'relationships': return <RelationshipsArticle />;
    case 'mcp':           return <MCPArticle />;
    case 'export':        return <ExportArticle />;
    default:              return <IntroArticle />;
  }
};
```

A simple imperative article switcher — no lazy loading, no code splitting. All six article components are imported statically and rendered synchronously. Large articles (with rich content, code blocks, etc.) are all bundled together.

---

## JSX Structure

```
<div style="background:var(--canvas-bg); minHeight:100vh; flex column">
  │
  ├── <PublicNav />         (top nav bar, auth-aware CTAs)
  │
  ├── <div style="flex:1; height:calc(100vh - 100px)">
  │     <DocsLayout currentArticle={activeArticle} onSelect={setActiveArticle}>
  │       {renderArticle()}     ← article content as children
  │     </DocsLayout>
  │   </div>
  │
  └── <Footer />            (marketing site footer)
```

**Layout math:** The middle content div uses `height: calc(100vh - 100px)` to fill available vertical space after the `PublicNav` (approximately 100px tall). This is a **fixed offset** — if `PublicNav`'s actual rendered height changes (e.g. due to content, responsive behavior, or font changes), the docs layout may overflow or leave a gap.

---

## Data Flow

```
Docs (page)
 │  useState: activeArticle = 'intro'
 │
 ├──► DocsLayout (currentArticle, onSelect)
 │       └── DocsLayout sidebar fires: onSelect(newArticleId)
 │               └──► setActiveArticle(newArticleId)
 │                         └──► renderArticle() returns new article
 │                                   └──► DocsLayout children update
 │
 └──► Articles.tsx
        ├── IntroArticle
        ├── NormalizationArticle
        ├── CanvasArticle
        ├── RelationshipsArticle
        ├── MCPArticle
        └── ExportArticle
```

---

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **No URL routing per article** | `activeArticle` is pure component state — navigating to `/docs#canvas` or `/docs/canvas` is not supported. Users cannot deep-link to a specific article or use browser Back/Forward to navigate between articles |
| **No loading states** | All articles load synchronously — large content bundles with the page. No lazy `import()` per article |
| **`height: calc(100vh - 100px)` hardcoded** | Brittle if `PublicNav` height changes — should use CSS `flex: 1` or a proper sticky-header approach |
| **`React` not imported** | Valid with auto-JSX transform — consistent with other public page components (`Footer`, `PublicNav`) |
| **`Docs.css` imported** | A page-level CSS file exists but the only styling is inline on the root `<div>` — `Docs.css` contents unknown but may handle responsive overrides |
| **`DocsLayout` receives `onSelect` as setter directly** | `setActiveArticle` is passed raw — `DocsLayout`'s internal sidebar calls `onSelect(articleId)` to switch articles. Tightly coupled but clear |
| **Default fallback is silent** | Unknown `activeArticle` values silently render `IntroArticle` — no error, no 404-style state |

---

## Relationship with `DocsLayout` and `Articles`

```
Docs.tsx  (manages "which article" — 1 state, 1 switch)
  │
  ├── DocsLayout.tsx  (manages layout: 2-col sidebar + content, handles nav rendering)
  │     └── passes active ID + setter between Docs and DocsLayout
  │
  └── Articles.tsx    (manages content: 6 standalone article components)
        └── all stateless — pure JSX content
```

This is a clean **three-layer separation** of concerns:
- `Docs.tsx` — routing/selection state
- `DocsLayout.tsx` — structural layout + sidebar nav
- `Articles.tsx` — content

The only coupling is the string-typed article ID — both `DocsLayout` (sidebar) and `Docs.tsx` (switch) must agree on the same set of valid ID strings. There is no shared constant for these IDs — they are independently duplicated in each file.

---

*Generated documentation for Modellr — `src/pages/Docs.tsx`*
