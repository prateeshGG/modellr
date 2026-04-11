# `TemplatesPage.tsx` — Page Documentation

> **Location:** `src/pages/TemplatesPage.tsx`  
> **Type:** React Page Component — TypeScript/TSX  
> **Route:** `/app/templates` (authenticated, rendered inside `AppLayout`)  
> **Purpose:** A gallery of pre-built schema templates. Renders a sidebar of filter categories and a card grid of all available templates from the `TEMPLATES` registry. Clicking a card opens `TemplatePreviewModal`; clicking "Use Template" creates a new Supabase schema row from the template and navigates to the editor. Enforces the free tier 3-schema limit with a Supabase count query (not just local state).

---

## File Overview

`TemplatesPage` is the authenticated **template gallery** — the dedicated route for browsing and deploying starter schemas. Unlike the quick-pick row on `Dashboard.tsx` (4 hardcoded tiles, no preview), this page exposes all templates in the `TEMPLATES` registry with:

- Category sidebar filtering
- Card thumbnails with table count
- Full `TemplatePreviewModal` preview (canvas view)
- Free tier limit enforcement via live Supabase count

---

## Dependencies & Imports

```tsx
import { TEMPLATES, getTemplate } from '../utils/templates';
import { useAuthStore }            from '../store/authStore';
import { supabase }                from '../lib/supabase';
import { useUIStore }              from '../store/ui';
import { TemplatePreviewModal }    from '../components/dashboard/TemplatePreviewModal';
import './TemplateGallery.css';
```

| Import | Role |
|---|---|
| `TEMPLATES` | The full template registry object (all templates keyed by ID) |
| `getTemplate` | Looks up a single template by ID |
| `useAuthStore` | `session` — current user ID for schema insert |
| `supabase` | Count query + schema insert |
| `useUIStore` | `showDialog` — upgrade-required alert |
| `TemplatePreviewModal` | Canvas preview + "Use Template" CTA |
| `TemplateGallery.css` | Grid + card styling (only CSS file in this component) |

---

## Constants — Category Definitions

```ts
const CATEGORIES = [
  { id: 'all',       label: 'All Templates' },
  { id: 'saas',      label: 'SaaS & Metrics' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'cms',       label: 'CMS & Blogs' },
  { id: 'auth',      label: 'Auth & Social' },
];
```

Five categories. Category IDs double as filter values matched against template IDs and labels — see [Filtering Logic](#filtering-logic) below.

---

## State

| State | Type | Initial | Description |
|---|---|---|---|
| `activeCategory` | `string` | `'all'` | Active category filter |
| `selectedTemplateId` | `string \| null` | `null` | ID of the template opened in `TemplatePreviewModal` |

---

## `handleUseTemplate(templateId)`

```ts
const handleUseTemplate = async (templateId: string) => {
  if (!session?.user?.id) return;

  // 1. Live count check — not local state
  const { count } = await supabase
    .from('schemas')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', session.user.id);

  if (count !== null && count >= 3) {
    showDialog({
      title:   'Upgrade Required',
      message: 'Free tier limit reached (3 schemas). Upgrade to Pro to use more templates.',
      type:    'alert'
    });
    return;
  }

  // 2. Template lookup
  const tpl = getTemplate(templateId);
  if (!tpl) return;

  // 3. Insert new schema row
  const { data } = await supabase
    .from('schemas')
    .insert([{
      owner_id:     session.user.id,
      name:         tpl.label + ' Starter',
      canvas_state: { tables: tpl.tables, relationships: tpl.relationships, viewport: { x:0, y:0, zoom:1 } }
    }])
    .select().single();

  if (data) navigate(`/app/${data.id}`);
};
```

### Three-step flow:

1. **Live Supabase count** — `SELECT COUNT(*) WHERE owner_id = ...` with `head: true` (no rows returned, only count). This is a **real-time check** unlike `Dashboard.tsx` where `schemas.length` is local state and can be stale.

2. **Limit exceeded** → `showDialog('alert')` — `type: 'alert'` shows a non-destructive message with a single "OK" button (no confirmation pattern). The message mentions "Pro" but has no navigation link to `/pricing`.

3. **Insert** — Creates a schema named `"{Template Label} Starter"` (e.g. `"E-Commerce Starter"`) with full `canvas_state`. On success, navigates to the new schema editor.

### Naming convention comparison:
| Entry point | Schema name |
|---|---|
| `Dashboard.handleCreateNew(templateId)` | `"{Template Label} Template"` |
| `TemplatesPage.handleUseTemplate(templateId)` | `"{Template Label} Starter"` |

Two different suffixes for the same operation (`" Template"` vs `" Starter"`) — inconsistent.

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

**Two-condition filter** for non-`'all'` categories:
1. `t.id === activeCategory` — exact ID match (e.g. `'saas'`, `'ecommerce'`)
2. `t.label.toLowerCase().includes(activeCategory.toLowerCase())` — substring label match

This means category IDs must either exactly match a template ID or appear as a substring of a template label. The current categories (`'saas'`, `'ecommerce'`, `'cms'`, `'auth'`) are designed to match template IDs directly.

**Gaps:**
- Category `'cms'` — none of the standard template IDs from `templates.ts` (`'ecommerce'`, `'saas'`, `'blog'`, `'auth'`) match `'cms'` by ID. The label check would catch `'Blog + CMS'` if the template's label contains "cms" — it does contain "CMS" (case-insensitive). Works but fragile.
- Category `'saas'` — matches template ID `'saas'` by exact ID. ✅
- Category `'ecommerce'` — matches template ID `'ecommerce'` by exact ID. ✅
- Category `'auth'` — matches template ID `'auth'` by exact ID. ✅
- All four templates appear under `'all'`. ✅

If a new template is added to `TEMPLATES` without a matching category ID or a category-matching label substring, it will only appear under `'all'`.

---

## Template Card Anatomy

```tsx
<div className="template-card" onClick={() => setSelectedTemplateId(tpl.id)}>
  {/* Thumbnail area */}
  <div className="template-thumb">
    <div>
      <div>{tpl.label}</div>
      <div>{tpl.tables.length} tables rendered</div>
    </div>
  </div>

  {/* Card content */}
  <div className="template-content">
    <h3 className="template-name">{tpl.label}</h3>
    <p className="template-desc">{tpl.description}</p>
    <div className="template-footer">
      <span className="template-badge">Starter</span>
      <button
        className="btn-primary"
        style={{ padding: '6px 12px', fontSize: '12px' }}
        onClick={(e) => { e.stopPropagation(); handleUseTemplate(tpl.id); }}
      >
        Use Template
      </button>
    </div>
  </div>
</div>
```

**Two click targets:**
- **Card click** → `setSelectedTemplateId(tpl.id)` → opens `TemplatePreviewModal`
- **"Use Template" button** → `e.stopPropagation()` + `handleUseTemplate(tpl.id)` → skips preview, creates schema directly

`e.stopPropagation()` on the button prevents the card's outer `onClick` from also firing (which would open the preview modal while also starting the create flow).

**Thumbnail area:** Currently just text (`label` + `"N tables rendered"`). No actual canvas preview in the thumbnail — that's only available in `TemplatePreviewModal`. The `className="template-thumb"` div is intended for a visual preview (perhaps a static image or a mini-canvas render), but currently renders a text fallback.

---

## `TemplatePreviewModal` Integration

```tsx
{selectedTemplateId && (
  <TemplatePreviewModal
    templateId={selectedTemplateId}
    onClose={() => setSelectedTemplateId(null)}
    onUse={() => handleUseTemplate(selectedTemplateId)}
  />
)}
```

`onUse` passes `selectedTemplateId` as a closure — if `selectedTemplateId` somehow changes between modal open and "Use" click (it can't in practice since it's set before the modal renders), the wrong template would be used. In practice this is safe.

As documented in the `TemplatePreviewModal` docs — this modal has a known bug: the preview canvas renders `SchemaCanvas` without `ReactFlowProvider`, causing hook violations when templates are preselected. The `onUse` callback here feeds into `handleUseTemplate`, which does a fresh `getTemplate(templateId)` call — so even if the modal preview is broken, the create flow itself is independent.

---

## JSX Structure

```
<div> (flex, full width/height)
  │
  ├── <div class="templates-sidebar">
  │     ├── "Categories" header
  │     └── {CATEGORIES.map → div.category-item [--active if selected]}
  │           ├── All Templates
  │           ├── SaaS & Metrics
  │           ├── E-commerce
  │           ├── CMS & Blogs
  │           └── Auth & Social
  │
  └── <main class="templates-main">
        ├── <header>
        │     ├── <h1>Template Gallery</h1>
        │     └── <p>"Start with a battle-tested database architecture."</p>
        │
        └── <div class="gallery-grid">
              {filteredTemplates.map → div.template-card}
                ├── div.template-thumb (text fallback, no actual preview)
                │     ├── {tpl.label}
                │     └── "{N} tables rendered"
                └── div.template-content
                      ├── <h3>{tpl.label}</h3>
                      ├── <p>{tpl.description}</p>
                      └── div.template-footer
                            ├── <span.template-badge>Starter</span>
                            └── <button>"Use Template"</button>

{selectedTemplateId && <TemplatePreviewModal ... />}
```

---

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Live Supabase count check** | Better than `Dashboard.tsx` — queries current DB count rather than relying on stale local `schemas[]` state. However, still no server-side enforcement |
| **Inconsistent schema name suffix** | `TemplatesPage` creates `"{Label} Starter"`, `Dashboard` creates `"{Label} Template"` — same operation, two different naming conventions |
| **Category filter is fragile** | Relies on template ID or label substring matching category ID strings. Adding templates without updating categories breaks filtering |
| **No unauthenticated state** | `if (!session?.user?.id) return;` in `handleUseTemplate` silently does nothing — guests can view the gallery but "Use Template" silently no-ops. No "Log in to use" prompt |
| **`TemplatePreviewModal` known bug** | The modal renders `SchemaCanvas` without `ReactFlowProvider` — causes a hook violation on initial render. Documented in `dashboard-components.md` |
| **Thumbnail is text-only** | `template-thumb` renders label + table count text, not an actual visual preview. CSS class suggests an image/canvas was planned |
| **No search/filter input** | Only category sidebar — no text search across template names or descriptions |
| **`count` can be `null`** | `count !== null && count >= 3` — explicitly handles Supabase `count` being `null` (e.g. RLS error). Safe check |
| **Alert dialog has no upgrade CTA** | The `showDialog` alert says "Upgrade to Pro" but has no link/button to `/pricing` — user must navigate there manually |
| **All templates badge: "Starter"** | The `template-badge` always shows "Starter" regardless of template complexity or tier |

---

## Free Tier Limit Comparison — `Dashboard` vs `TemplatesPage`

| | `Dashboard.handleCreateNew()` | `TemplatesPage.handleUseTemplate()` |
|---|---|---|
| Check source | `schemas.length` (local state) | Live Supabase `COUNT(*)` |
| Can be stale? | ✅ Yes (other tab adds schemas) | ❌ No (real-time DB query) |
| Exceeded action | Silent early return | `showDialog('alert')` with message |
| Schema name suffix | `" Template"` | `" Starter"` |
| Notes/groups included | No (not in template data) | No (same) |

---

*Generated documentation for SchemaForge — `src/pages/TemplatesPage.tsx`*
