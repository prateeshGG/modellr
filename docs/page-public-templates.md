# `PublicTemplates.tsx` — Page Documentation

> **Location:** `src/pages/PublicTemplates.tsx`  
> **Type:** React Page Component — TypeScript/TSX  
> **Route:** `/templates` (public, no auth required)  
> **Purpose:** The unauthenticated public-facing template gallery. Shows the same `TEMPLATES` registry and `CATEGORIES` filter as `TemplatesPage.tsx`, but with no create/preview actions — every card's CTA is a "Log In to Use" button that navigates to `/login`. Wraps in `PublicNav` + `Footer` public layout chrome.

---

## File Overview

`PublicTemplates` is the **marketing twin** of `TemplatesPage` (`/app/templates`). It is a read-only showcase — designed to attract unauthenticated visitors by demonstrating the available starter schemas, then converting them to sign up. The core template card structure is nearly identical to `TemplatesPage`, with two significant differences:

| | `PublicTemplates` | `TemplatesPage` |
|---|---|---|
| Route | `/templates` (public) | `/app/templates` (auth) |
| Layout chrome | `PublicNav` + `Footer` | `AppLayout` |
| Auth required | ❌ No | ✅ Yes |
| Category UI | Pill buttons (inline, `<button>`) | Sidebar `<div>` items |
| Card CTA | "Log In to Use" → `/login` | "Use Template" → creates schema |
| Preview modal | ❌ None | ✅ `TemplatePreviewModal` |
| `TemplatePreviewModal` | ❌ Not available | ✅ On card click |
| Entire card clickable | ❌ No (no onClick on card) | ✅ (opens preview) |

---

## Dependencies & Imports

```tsx
import { TEMPLATES }  from '../utils/templates';
import { PublicNav }  from '../components/layout/PublicNav';
import { Footer }     from '../components/layout/Footer';
import './TemplateGallery.css';
```

| Import | Role |
|---|---|
| `TEMPLATES` | Full template registry — same source as `TemplatesPage` |
| `PublicNav` | Public top nav with auth-aware CTAs |
| `Footer` | Marketing site footer |
| `TemplateGallery.css` | Shared CSS for card layout (`gallery-grid`, `template-card`, etc.) |

No `supabase`, no stores, no `useAuthStore` — this page is entirely decoupled from the application state layer.

---

## State

```ts
const [activeCategory, setActiveCategory] = useState('all');
```

One piece of state — the active category filter. Identical to `TemplatesPage`.

---

## Constants — Categories

```ts
const CATEGORIES = [
  { id: 'all',       label: 'All Templates' },
  { id: 'saas',      label: 'SaaS & Metrics' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'cms',       label: 'CMS & Blogs' },
  { id: 'auth',      label: 'Auth & Social' },
];
```

**Exact duplicate** of `CATEGORIES` in `TemplatesPage.tsx` — the same constant defined in two separate files. There is no shared `constants` export for this. Any category change must be applied in both places.

---

## Filtering Logic

```ts
const templateList = Object.entries(TEMPLATES).map(([id, tpl]) => ({ id, ...tpl }));

const filteredTemplates = activeCategory === 'all'
  ? templateList
  : templateList.filter(t =>
      t.id === activeCategory ||
      t.label.toLowerCase().includes(activeCategory.toLowerCase())
    );
```

**Exact duplicate** of the filter logic in `TemplatesPage.tsx` — same two-condition filter (ID match || label substring match), same fragility around the `'cms'` category. See `page-templates.md` for detailed analysis.

---

## Category Filter UI — Pill Buttons

Unlike `TemplatesPage`'s sidebar `<div>` items, `PublicTemplates` uses inline pill `<button>` elements centered horizontally:

```tsx
<div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
  {CATEGORIES.map(cat => (
    <button
      key={cat.id}
      style={{
        background: activeCategory === cat.id ? 'var(--surface-raised)' : 'transparent',
        border:     activeCategory === cat.id ? '1px solid var(--border-hi)' : '1px solid var(--border-subtle)',
        color:      activeCategory === cat.id ? 'var(--text-primary)' : 'var(--text-secondary)',
        padding: '8px 16px', borderRadius: '20px',
        cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
      }}
      onClick={() => setActiveCategory(cat.id)}
    >
      {cat.label}
    </button>
  ))}
</div>
```

Pill buttons (border-radius `20px`) with `all 0.2s` transition on active/inactive styles. Uses `<button>` elements — better semantics than `TemplatesPage`'s `<div onClick>` sidebar items. `flexWrap: 'wrap'` handles narrow viewports.

---

## Template Card

```tsx
<div key={tpl.id} className="template-card">       {/* No onClick — not clickable */}
  <div className="template-thumb">
    <div style={{ padding:'20px', textAlign:'center' }}>
      <div>{tpl.label}</div>
      <div>{tpl.tables.length} tables rendered</div>
    </div>
  </div>
  <div className="template-content">
    <h3 className="template-name">{tpl.label}</h3>
    <p className="template-desc">{tpl.description}</p>
    <div className="template-footer">
      <span className="template-badge">Starter</span>
      <button
        onClick={() => navigate('/login')}
        style={{ background: 'rgb(162,107,252)', color:'#fff', ... }}
      >
        Log In to Use
      </button>
    </div>
  </div>
</div>
```

**No `onClick` on the card container** — unlike `TemplatesPage` where clicking the card opens a preview, here the entire card is inert except for the CTA button. There is no preview modal on the public page.

**CTA: "Log In to Use"** → `navigate('/login')` — every template card has an identical CTA with no template state passed. Navigating to login and then back does not pre-select the template.

---

## JSX Structure

```
<div> (flex column, min-height 100vh, var(--canvas-bg))
  │
  ├── <PublicNav />
  │
  ├── <div class="template-gallery"> (max-width:1200px, centered)
  │     │
  │     ├── Hero heading
  │     │     ├── <h1>Template Gallery</h1>
  │     │     └── <p>Jumpstart your architecture...</p>
  │     │
  │     ├── Category pill buttons (flex, centered, wrap)
  │     │     ├── [All Templates]
  │     │     ├── [SaaS & Metrics]
  │     │     ├── [E-commerce]
  │     │     ├── [CMS & Blogs]
  │     │     └── [Auth & Social]
  │     │
  │     └── <div class="gallery-grid">
  │           {filteredTemplates.map → div.template-card}
  │             ├── div.template-thumb (text fallback: label + table count)
  │             └── div.template-content
  │                   ├── <h3>{label}</h3>
  │                   ├── <p>{description}</p>
  │                   └── div.template-footer
  │                         ├── <span.template-badge>Starter</span>
  │                         └── [Log In to Use] → navigate('/login')
  │
  └── <Footer />
```

---

## Duplication vs `TemplatesPage`

`PublicTemplates` and `TemplatesPage` share:

| Shared Element | Status |
|---|---|
| `CATEGORIES` array | Duplicated verbatim in both files |
| `templateList` derivation | Duplicated verbatim |
| `filteredTemplates` filter logic | Duplicated verbatim |
| `template-thumb` JSX (label + table count) | Duplicated verbatim |
| `gallery-grid` class usage | Shared via `TemplateGallery.css` |
| Template badge: "Starter" | Identical in both |

The only meaningful differences are the layout chrome, the CTA action, and the absence of `TemplatePreviewModal` and card click interaction.

This represents a **significant code duplication** — a shared `TemplateGrid` component accepting a `renderAction(tpl)` render prop or `onSelect/onUse` callbacks would eliminate the duplication.

---

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **`CATEGORIES` duplicated** | Exact copy in `PublicTemplates.tsx` and `TemplatesPage.tsx` — must be updated in two places |
| **Filter logic duplicated** | Same two-condition filter copied verbatim — same fragility (see `page-templates.md`) |
| **No preview modal** | Public users see only the card text — no interactive canvas preview. `TemplatePreviewModal` is auth-gated indirectly by living only in `TemplatesPage` |
| **"Log In to Use" loses template context** | Navigation to `/login` carries no template ID — after login, user lands on `/app` dashboard with no template pre-selected |
| **Card container has no click handler** | Unlike `TemplatesPage`, clicking the card body does nothing — only the CTA button is interactive |
| **`rgb(162,107,252)` on CTA button** | Same hardcoded brand purple |
| **`TemplateGallery.css` shared** | Both pages import the same `TemplateGallery.css` — layout CSS is shared, which is the correct pattern |
| **No `TemplatePreviewModal` on public page** | Could be offered as a pure read-only preview (no "Use" action) to increase engagement before login conversion |
| **Thumbnail is still text-only** | Same as `TemplatesPage` — `template-thumb` renders label text, not an actual schema visualization |

---

## Conversion Flow

```
User visits /templates (public)
  │
  ├── Browses template cards
  │     └── Sees: label, description, table count, "Starter" badge
  │
  └── Clicks "Log In to Use"
        → navigate('/login')
        → User authenticates
        → Redirected to /app (dashboard)
        → Must navigate to /app/templates MANUALLY to find the template again
        → No template pre-selection preserved
```

The ideal flow would pass a `?template={id}` query parameter to `/login`, then after auth redirect to `/app/templates?use={id}` or directly create the schema.

---

*Generated documentation for SchemaForge — `src/pages/PublicTemplates.tsx`*
