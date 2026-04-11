# `Features.tsx` — Page Documentation

> **Location:** `src/pages/Features.tsx`  
> **Type:** React Page Component — TypeScript/TSX  
> **Route:** `/features`  
> **Purpose:** A public-facing marketing page listing SchemaForge's six core features as a grid of cards. Static content — no state, no data fetching. Includes a CTA button at the bottom that navigates to `/login`.

---

## File Overview

`Features` is a **pure marketing page** — zero application-level logic, no stores, no effects. It is entirely composed of static JSX with inline styles, rendered between `PublicNav` and `Footer`. The page content is a descriptive feature grid and a CTA section.

---

## Dependencies & Imports

```tsx
import { useNavigate } from 'react-router-dom';
import { PublicNav }   from '../components/layout/PublicNav';
import { Footer }      from '../components/layout/Footer';
import { Bot, Users, ExternalLink, Database, Shield, History } from 'lucide-react';
```

| Import | Role |
|---|---|
| `useNavigate` | CTA button → `navigate('/login')` |
| `PublicNav` | Top navigation bar |
| `Footer` | Site-wide marketing footer |
| Lucide icons | Feature card icons |

No stores, no hooks (beyond `useNavigate`), no CSS file imported.

---

## State & Effects

**None.** This is a fully static page — no `useState`, no `useEffect`.

---

## Page Structure

```
<div> (flex column, min-height 100vh, var(--canvas-bg))
  │
  ├── <PublicNav />
  │
  ├── <div> (max-width 1000px, centered, padding 64px 20px)
  │     │
  │     ├── Hero heading
  │     │     ├── <h1>Database Design, [Redefined.]</h1>
  │     │     └── <p> subtitle
  │     │
  │     ├── Feature grid  (auto-fit minmax(400px, 1fr), gap 32px)
  │     │     ├── [Bot]         AI Schema Generation
  │     │     ├── [Users]       Real-time Collaboration
  │     │     ├── [ExternalLink] Intelligent Exporting
  │     │     ├── [Database]    Live DB Introspection
  │     │     ├── [Shield]      Zero-Trust Auth & RBAC
  │     │     └── [History]     Unlimited Snapshots
  │     │
  │     └── CTA section
  │           ├── "Ready to optimize your workflow?"
  │           └── [Start building free] → navigate('/login')
  │
  └── <Footer />
```

---

## Feature Cards

All six cards are stateless — no props, no interactivity. Each has the same layout:

```
<div style="background:var(--surface-base); padding:40px; borderRadius:24px; border:1px solid var(--border-subtle)">
  <div style="color:rgb(162,107,252)"><{Icon} size={32} /></div>
  <h3>Feature Title</h3>
  <p>Feature description</p>
</div>
```

| Icon | Title | Key Claims |
|---|---|---|
| `Bot` | AI Schema Generation | Natural language → tables/PKs/FKs/relationships |
| `Users` | Real-time Collaboration | Yjs CRDTs, live cursors, zero merge conflicts |
| `ExternalLink` | Intelligent Exporting | SQL DDL, Prisma, TypeORM, Drizzle, ALTER TABLE diffs |
| `Database` | Live DB Introspection | Postgres `information_schema` reverse-engineer → visual canvas |
| `Shield` | Zero-Trust Auth & RBAC | Magic links, read-only guests, mutation prevention |
| `History` | Unlimited Snapshots | Zundo-backed, point-in-time restore |

**Grid layout:** `repeat(auto-fit, minmax(400px, 1fr))` — cards flow to 2 columns on wide screens, 1 column on narrow screens. The `400px` minimum means on screens narrower than ~800px the grid collapses to a single column.

---

## CTA Section

```tsx
<div style={{ textAlign: 'center', marginTop: '80px', padding: '64px',
              background: 'var(--surface-raised)', borderRadius: '24px' }}>
  <h2>Ready to optimize your workflow?</h2>
  <button onClick={() => navigate('/login')}
          style={{ background: 'rgb(162, 107, 252)', ... }}>
    Start building free
  </button>
</div>
```

Navigates to `/login` via React Router — correct SPA navigation (unlike `Editor.tsx`'s `window.location.href` for Home/Settings).

---

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **`rgb(162, 107, 252)` used 8 times** | Every feature card icon, the `<h1>` accent word "Redefined.", and the CTA button all use this hardcoded brand color. This page is the single largest contributor to the global hardcoding of the brand purple |
| **TypeORM mentioned in copy, not in exporter list** | The "Intelligent Exporting" card describes "TypeORM entity typescript blocks" but `TopBar`'s export menu has no TypeORM option — the exporter may not be implemented |
| **"Unlimited Snapshots" copy vs reality** | The card says "Unlimited Snapshots" but the history store's snapshot count is not externally capped — neither unlimited nor limited is enforced in code |
| **`lucide-react` used** | Same icon library as `TopBar` — these two files are the only consumers of `lucide-react` in the entire codebase. Other pages use Unicode glyphs |
| **No `React` import** | Relies on auto-JSX transform — consistent with other public pages |
| **100% inline styles, no CSS file** | Same pattern as `DialogModal` — no CSS class names, entire page styled inline |
| **CTA navigates to `/login` not `/signup`** | "Start building free" implies a new user flow, but the button goes to `/login`. A dedicated `/signup` route or `?mode=signup` query parameter would better track new user intent |
| **No SEO meta tags in component** | No `<title>` or `<meta description>` set — these would need to be added via a document `<head>` management library (e.g. `react-helmet`) |

---

*Generated documentation for SchemaForge — `src/pages/Features.tsx`*
