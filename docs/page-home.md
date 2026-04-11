# `Home.tsx` — Page Documentation

> **Location:** `src/pages/Home.tsx`  
> **Type:** React Page Component (default export) — TypeScript/TSX  
> **Route:** `/` (public landing page)  
> **Purpose:** The public marketing landing page. Hosts the hero section, a **live interactive sandbox** `Editor` instance embedded inline, a stats row, a features grid, a "How it Works" section, a mini pricing comparison, an FAQ section, and a bottom CTA. Only one piece of state: `isFullscreen` to toggle the sandbox between contained and full-viewport modes.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [State](#3-state)
4. [Sections Map](#4-sections-map)
5. [The Embedded Sandbox](#5-the-embedded-sandbox)
6. [Content Accuracy Notes](#6-content-accuracy-notes)
7. [Notable Patterns & Caveats](#7-notable-patterns--caveats)

---

## 1. File Overview

`Home` is the **primary user acquisition page**. Its headline feature — unique among marketing pages — is an **embedded live `Editor` component** (`isSandbox={true}`) that runs a fully functional canvas directly on the landing page. Visitors can create tables, draw relationships, and try AI generation before signing up.

This creates a tight coupling between the marketing page and the `Editor` component — changes to `Editor`'s boot behaviour, performance, or layout will surface on the public home page.

---

## 2. Dependencies & Imports

```tsx
import { useNavigate }   from 'react-router-dom';
import { Maximize2, Minimize2, ExternalLink, Database, History, Zap } from 'lucide-react';
import { Footer }        from '../components/layout/Footer';
import { PublicNav }     from '../components/layout/PublicNav';
import Editor            from './Editor';
```

| Import | Role |
|---|---|
| `useNavigate` | All CTA navigation buttons |
| Lucide icons | Feature grid icons (`Zap`, `Database`, `ExternalLink`, `History`) |
| `PublicNav` / `Footer` | Public layout chrome |
| `Editor` | The full editor page, rendered as a sandboxed inline component |

---

## 3. State

```ts
const [isFullscreen, setIsFullscreen] = useState(false);
```

Single state: controls whether the sandbox container is in embedded mode (`maxWidth: 1200px`, `height: 600px`) or full-viewport mode (`position: fixed`, `100vw × 100vh`, `z-index: 9999`).

---

## 4. Sections Map

The page is composed of seven distinct sections rendered sequentially:

| Section | Content |
|---|---|
| **Hero** | `<header>` — headline, sub-heading, two CTA buttons, social proof footnote |
| **Sandbox** | `<section id="sandbox-anchor">` — live `<Editor isSandbox={true} />` in a mock browser frame |
| **Stats Row** | `<section>` — four hardcoded metrics (2,400+ schemas, 120+ templates, 4.9/5, 12 dialects) |
| **Features Grid** | `<section>` — 3×2 grid of 6 feature cards with Lucide icons + emoji icons |
| **How It Works** | `<section>` — numbered 3-step process cards |
| **Mini Pricing** | `<section>` — 2-column Free vs Pro card, inline feature lists, link to `/pricing` |
| **FAQ** | `<section>` — 3 static Q&A items |
| **Bottom CTA** | `<section>` — full-width signup CTA |

---

## 5. The Embedded Sandbox

This is the architecturally significant feature of `Home.tsx`:

```tsx
<section id="sandbox-anchor">
  <div style={{
    ...(isFullscreen ? {
      position: 'fixed', top:0, left:0, right:0, bottom:0,
      height: '100vh', width: '100vw', zIndex: 9999, borderRadius: 0
    } : {
      maxWidth: '1200px', height: '600px', borderRadius: '16px'
    }),
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  }}>

    {/* Fake macOS window chrome */}
    <div style={{ height: '40px', ... }}>
      <div>  ⬤(red) ⬤(amber) ⬤(green)  "Live Sandbox — Try editing!"</div>
      <button onClick={() => setIsFullscreen(!isFullscreen)}>
        {isFullscreen ? <Minimize2 /> : <Maximize2 />}
      </button>
    </div>

    <div style={{ height: 'calc(100% - 40px)' }}>
      <Editor isSandbox={true} />
    </div>
  </div>
</section>
```

### Mock Browser Frame

The sandbox is wrapped in a decorative mock browser header:
- Three macOS-style traffic light dots (hard-coded `#EF4444`, `#F59E0B`, `#10B981`)
- Label: `"Live Sandbox — Try editing!"`
- Fullscreen toggle button (`Maximize2` / `Minimize2` icons)

### Fullscreen Mode

`isFullscreen = true` transitions the container to `position: fixed; inset: 0; z-index: 9999` via a CSS `transition: all 0.3s cubic-bezier(...)`. The `Editor` fills the full viewport, hiding the marketing page underneath.

> **Scroll behavior**: The "Try guest sandbox" hero CTA button uses:
> ```ts
> document.getElementById('sandbox-anchor')?.scrollIntoView({ behavior: 'smooth' })
> ```
> This relies on `id="sandbox-anchor"` being present — it is, on the `<section>` wrapping the sandbox.

### What the Sandbox Provides

`<Editor isSandbox={true} />` boots the **full** editor experience:
- `SandboxLimiter` (5 table cap for unauthenticated users)
- `localStorage.sandbox_schema` persistence
- First-visit e-commerce template load (async dynamic import)
- All keyboard shortcuts (`useKeyboardShortcuts`)
- All overlay components (AI drawer, command palette, import dialog, etc.)
- **No Yjs** (sandbox bypasses WebSocket join)
- **No cloud persistence** (localStorage only for guests)

### Performance Implications

The `Editor` component is a heavyweight boot:
- Mounts `SchemaCanvas` (React Flow + Yjs effects even if Yjs doesn't connect)
- Registers ~10 keyboard shortcut listeners
- Runs 5+ `useEffect` hooks
- Dynamically imports `templates.ts` on first visit

This all happens on the **public landing page**, on first load, for every visitor regardless of intent. The sandbox significantly increases the page's JavaScript bundle size and initial render time.

---

## 6. Content Accuracy Notes

| Section | Claim | Status |
|---|---|---|
| Stats Row | "12 dialects supported" | `DIALECTS` in `constants.ts` lists 4: postgres, mysql, sqlite, mssql |
| Stats Row | "120+ templates used", "2,400+ schemas created", "4.9/5 satisfaction" | Hardcoded, not fetched from a real data source |
| Free tier | "AI generation (10/day)" | No daily AI request rate limit is implemented in `useAI.ts` or the server routes |
| Pro | "MCP server access (Phase 5)" | MCP gateway is implemented in `server/routes/mcpGateway.js` — "Phase 5" label is a roadmap placeholder still in marketing copy |
| FAQ | "we immediately burn the TCP line" | Connection strings are passed to the server route and the DB connection is released after the query — accurate in spirit |
| Features grid | "TypeORM entity blocks" | No TypeORM exporter exists in the codebase (same issue as `Features.tsx`) |

---

## 7. Notable Patterns & Caveats

| | Detail |
|---|---|
| **`rgb(162, 107, 252)` count: ~20 instances** | The highest concentration in the codebase — hero glow, hero badge, hero `<h1>` accent, hero CTA button, features section header, features grid icons (4), pricing section header, pricing checkmarks (8×), pricing Pro card border + label + badge + CTA, bottom CTA `<span>` |
| **Full `Editor` on marketing page** | The landing page boots the entire editor stack. Heavy JS bundle, multiple effects, React Flow — all running on every public page load |
| **Hardcoded stats** | All four stats (schemas, templates, satisfaction, dialects) are static strings — not fetched from an API. "12 dialects supported" is factually wrong (4 dialects exist) |
| **All CTA buttons → `/login`** | "Start building free," "Start free," and "Start building free →" all navigate to `/login` — same issue as `Features.tsx`: signup intent is lost |
| **"Upgrade to Pro" navigates to `/pricing`** | Separate route for the pricing detail page — consistent with `Dashboard.tsx` |
| **Smooth scroll uses `getElementById`** | `document.getElementById('sandbox-anchor')?.scrollIntoView(...)` — DOM query rather than a React ref. Works but couples the button to the specific ID string |
| **Mock macOS chrome is decorative only** | The three colored dots are visual chrome — they have no click handlers (can't minimize/close the sandbox) |
| **FAQ is static JSX** | No accordion, no `useState` for expand/collapse — all three answers are always visible |
| **No `React` import** | Auto-JSX transform |
| **No CSS file** | 100% inline styles — 250 lines, 23KB raw |

---

## CTA Navigation Summary

| Location | Button Text | Destination |
|---|---|---|
| Hero | "Start building free" | `/login` |
| Hero | "Try guest sandbox" | Smooth scroll to `#sandbox-anchor` |
| Mini Pricing (Free) | "Start free" | `/login` |
| Mini Pricing (Pro) | "Upgrade to Pro" | `/pricing` |
| Mini Pricing | "See all pricing features →" | `/pricing` |
| Bottom CTA | "Start building free →" | `/login` |

---

## Page Sections Diagram

```
<div> (min-height:100vh, var(--canvas-bg))
  │
  ├── <PublicNav />
  │
  ├── <header> HERO
  │     ├── Glow div (blur:200px, opacity:0.1)
  │     ├── "Introducing SchemaForge 2.0" badge
  │     ├── <h1> "Architect databases at the speed of thought."
  │     ├── <p> subtitle
  │     ├── [Start building free] → /login
  │     ├── [Try guest sandbox] → smooth scroll
  │     └── "No credit card required"
  │
  ├── <section id="sandbox-anchor"> LIVE SANDBOX
  │     └── Mock browser frame
  │           ├── ⬤ ⬤ ⬤  "Live Sandbox — Try editing!"  [⛶/⛶]
  │           └── <Editor isSandbox={true} />
  │
  ├── <section> STATS ROW
  │     ├── 2,400+ Schemas created
  │     ├── 120+ Templates used
  │     ├── 4.9/5 Avg satisfaction
  │     └── 12 Dialects supported  ← (actually 4)
  │
  ├── <section> FEATURES GRID (3×2)
  │     ├── 🤖 AI schema generation
  │     ├── 👥 Real-time collaboration
  │     ├── [Zap] Instant export / Migrations
  │     ├── [Database] 1-click live introspection
  │     ├── [ExternalLink] Cross-domain ORM native
  │     └── [History] Time-travel snapshots
  │
  ├── <section> HOW IT WORKS (3 steps)
  │     ├── 1. Use AI to get a first draft
  │     ├── 2. Tweak visually & share
  │     └── 3. Export natively and deploy
  │
  ├── <section> MINI PRICING (2 columns)
  │     ├── FREE ($0/mo)   → [Start free] → /login
  │     └── PRO ($12/mo)   → [Upgrade to Pro] → /pricing
  │         + [See all pricing features →] → /pricing
  │
  ├── <section> FAQ (3 static Q&As)
  │     ├── "Is there a free tier?"
  │     ├── "Do you store connection strings?"
  │     └── "What is the MCP?"
  │
  ├── <section> BOTTOM CTA
  │     └── [Start building free →] → /login
  │
  └── <Footer />
```

---

*Generated documentation for SchemaForge — `src/pages/Home.tsx`*
