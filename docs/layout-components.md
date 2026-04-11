# Layout Components — Documentation

> **Location:** `src/components/layout/`  
> **Type:** React Components — TypeScript/TSX  
> **Purpose:** Three layout components that provide the structural chrome of the application — the authenticated app shell with sidebar (`AppLayout` + `AppSidebar`), the public marketing site footer (`Footer`), and the public marketing site navigation bar (`PublicNav`).

---

## Overview

| File | Export(s) | Used On | Role |
|---|---|---|---|
| `AppLayout.tsx` | `AppLayout`, `AppSidebar` | Authenticated app routes (`/app/*`) | Two-column layout shell: sidebar + `<Outlet>` content area |
| `Footer.tsx` | `Footer` | Public marketing pages | Site-wide footer with logo, link columns, and copyright |
| `PublicNav.tsx` | `PublicNav` | Public marketing pages | Top navigation bar with auth-aware CTA buttons |

---

---

# `AppLayout.tsx` — Component Documentation

> **Location:** `src/components/layout/AppLayout.tsx`

## File Overview

Exports two components:
- **`AppSidebar`** — the persistent left sidebar for all authenticated app routes, with navigation links, active-state detection, and sign-out.
- **`AppLayout`** — a thin layout wrapper that places `AppSidebar` next to a `<Outlet>` (React Router outlet for the current child route's content).

## Dependencies & Imports

```tsx
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
```

No Zustand schema or UI stores — purely navigation and auth state.

> **Note:** `React` is not imported. Uses the automatic JSX transform (Vite/React 17+). Valid but inconsistent with other components that do import React.

---

## `AppSidebar` Component

### Navigation Items

```ts
const navItems = [
  { label: 'My Projects',         path: '/app',           icon: null },
  { label: 'Community Templates', path: '/app/templates', icon: null },
  { label: 'Documentation',       path: '/docs',          icon: null },
];
```

Three nav links. `icon: null` on all — no icons rendered, field is unused.

> **Comparison with `DashboardSidebar`:** `AppSidebar` (this file) and `DashboardSidebar` (`src/components/dashboard/DashboardSidebar.tsx`) are **duplicated components** with nearly identical structure and purpose. `DashboardSidebar` has more items (Developer API, Team Workspace teaser) and is used on the `/app` dashboard page specifically, while `AppSidebar` appears to be a leaner variant. Both export a sidebar but are maintained separately.

### Active Link Detection

```ts
const isActive = location.pathname === item.path ||
  (location.pathname.startsWith(item.path) && item.path !== '/app' && item.path !== '/');
const isExactApp = location.pathname === '/app' && item.path === '/app';
const active = isActive || isExactApp;
```

Three-condition active logic:
1. **Exact match** — `location.pathname === item.path`
2. **Prefix match** (with exclusions) — `startsWith(item.path)` but NOT for `/app` or `/` to prevent them from matching every sub-route
3. **Special case for `/app`** — `isExactApp` handles the My Projects exact-path case

**Why separate `isExactApp`?** The exclusion `item.path !== '/app'` in condition 2 prevents "My Projects" from highlighting when on `/app/settings` (a sub-route). But then condition 1 handles the exact `/app` match, and `isExactApp` is a redundant re-assertion of condition 1 (`location.pathname === '/app' && item.path === '/app'`). It's equivalent to condition 1 already.

**Documentation vs `/docs`:** The "Documentation" tab uses path `/docs` — this routes outside the `/app/*` tree (to the public docs page). `startsWith('/docs')` would match, so if the user is on `/docs/...` (a sub-path), Documentation will show as active.

### Settings Active State

```tsx
<div
  className={`sidebar-link ${location.pathname.includes('/app/settings') ? 'sidebar-link--active' : ''}`}
  onClick={() => navigate('/app/settings')}
>
  Settings
</div>
```

Uses `includes('/app/settings')` rather than `===` or `startsWith` — matches any path containing `/app/settings` as a substring. Functionally correct for current routes but looser than the nav items approach.

### Sign Out

```tsx
{session && (
  <div className="sidebar-link" onClick={signOut} style={{ color: 'var(--alert-error)' }}>
    Sign Out
  </div>
)}
```

Only rendered when `session` is truthy. Calls `useAuthStore().signOut()` directly (unlike `DashboardSidebar` which delegates to the parent via `onSignOut` prop). A more direct approach but harder to test in isolation.

### `handleNav(item)` 

```ts
const handleNav = (item: any) => {
  navigate(item.path);
};
```

Unconditional `navigate` — no hash handling, no disabled check (unlike `DashboardSidebar`). Simpler because this sidebar has no disabled items.

---

## `AppLayout` Component

```tsx
export const AppLayout = () => (
  <div className="app-layout-container">
    <AppSidebar />
    <div className="app-layout-content">
      <Outlet />
    </div>
  </div>
);
```

A pure layout shell — renders `AppSidebar` on the left and the current child route via `<Outlet>` on the right. Used as the `element` for the `/app` route in `App.tsx`:

```tsx
// In App.tsx (inferred):
<Route path="/app" element={<AppLayout />}>
  <Route index element={<Dashboard />} />
  <Route path="settings" element={<Settings />} />
  <Route path=":schemaId" element={<Editor />} />
  ...
</Route>
```

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Duplicate of `DashboardSidebar`** | Nearly identical nav sidebar component exists in `components/dashboard/` — maintained separately with slightly different nav items and prop API |
| **`icon: null` on all items** | Icons were planned but not implemented — the field is unused |
| **`isExactApp` is redundant** | The `isExactApp` check is already covered by `location.pathname === item.path` in `isActive`. Dead logic |
| **`signOut` called directly** | `AppSidebar` calls `signOut()` from the store directly; `DashboardSidebar` delegates via `onSignOut` prop — inconsistent patterns |
| **`React` not imported** | Works with auto-JSX transform but inconsistent |

---

---

# `Footer.tsx` — Component Documentation

> **Location:** `src/components/layout/Footer.tsx`

## File Overview

A **marketing site footer** rendered on all public pages. Three-column layout with a brand block, "Product" links, and "Company" links. Navigation uses `react-router-dom`'s `useNavigate` for client-side routing. All styles are **inline** — no CSS file is imported.

## Dependencies & Imports

```tsx
import { useNavigate } from 'react-router-dom';
```

No stores — purely a navigation/content component.

## Structure

```
<footer>
  ├── Brand block (left)
  │     ├── Purple square logo + "SchemaForge" wordmark → navigate('/')
  │     └── Tagline paragraph
  │
  └── Link columns (right, flex row)
        ├── Product
        │     ├── Features  → navigate('/features')
        │     ├── Pricing   → navigate('/pricing')
        │     └── Templates → navigate('/templates')
        │
        └── Company
              ├── Terms of Service → navigate('/terms')
              └── Privacy Policy   → navigate('/privacy')
  │
  └── Bottom bar (full width, border-top)
        ├── © {year} SchemaForge Inc. All rights reserved.
        └── "Designed natively on the grid."
```

## Copyright Year

```tsx
<span>© {new Date().getFullYear()} SchemaForge Inc. All rights reserved.</span>
```

Dynamically computed at render time — always shows the current year without manual updates.

## All-Inline Styles

The entire `Footer` component uses inline `style={{ }}` — no CSS class names. Contrast with `PublicNav` (also inline) vs `AppLayout` (CSS file with class names). The marketing-facing components consistently use inline styles while app UI components use CSS files.

**Reasons this is worth noting:**
- Zero CSS specificity conflicts with the global stylesheet
- Theme-aware via CSS variables: `var(--border-subtle)`, `var(--text-secondary)`, `var(--canvas-bg)`, `var(--text-primary)` 
- But hardcodes the logo color: `rgb(162, 107, 252)` — same purple as the brand color but not a CSS variable

## Routes Used

| Label | Route |
|---|---|
| Logo click | `/` |
| Features | `/features` |
| Pricing | `/pricing` |
| Templates | `/templates` |
| Terms of Service | `/terms` |
| Privacy Policy | `/privacy` |

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **100% inline styles** | No CSS class names — styles are entirely in JSX `style={{}}` attributes |
| **Brand color hardcoded** | `rgb(162, 107, 252)` — not a CSS variable. If the brand color changes, must update here and in `PublicNav` |
| **`<span onClick>` for links** | Navigation links use `<span onClick={() => navigate(...)}>` rather than `<a href>` or React Router `<Link>` — no keyboard accessibility (no `tabIndex`, no `role="link"`), no right-click → open in new tab, no URL shown on hover |
| **No external links** | All links are internal SPA routes — no social media, GitHub, or external documentation links |
| **`flexWrap: 'wrap'`** | The main footer row wraps on narrow screens — basic responsive behavior without media queries |

---

---

# `PublicNav.tsx` — Component Documentation

> **Location:** `src/components/layout/PublicNav.tsx`

## File Overview

A **marketing site navigation bar** rendered at the top of all public-facing pages (Home, Features, Pricing, Templates, Docs). Contains the brand logo, four nav links, and auth-aware CTA buttons — either "Go to Dashboard" (for logged-in users) or "Log in" + "Sign up free" (for unauthenticated users).

## Dependencies & Imports

```tsx
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
```

Reads `session` from `useAuthStore` to determine auth state.

## Nav Links

```tsx
<span onClick={() => navigate('/pricing')}>Pricing</span>
<span onClick={() => navigate('/templates')}>Templates</span>
<span onClick={() => navigate('/features')}>Features</span>
<span onClick={() => navigate('/docs')}>Docs</span>
```

Four public nav links — all use `navigate()` for client-side routing. `<span>` elements rather than `<a>` or `<Link>` (same accessibility concern as `Footer`).

## Auth-Aware CTA Buttons

```tsx
{session ? (
  <button onClick={() => navigate('/app')}>Go to Dashboard</button>
) : (
  <>
    <button onClick={() => navigate('/login')}>Log in</button>
    <button onClick={() => navigate('/login')}>Sign up free</button>
  </>
)}
```

**Authenticated state:** Shows a single purple "Go to Dashboard" button → `/app`.

**Unauthenticated state:** Shows two buttons:
- "Log in" → `/login` (transparent/outline style)
- "Sign up free" → `/login` (filled purple style)

> ⚠️ **Bug:** Both "Log in" and "Sign up free" navigate to the same `/login` route. If the login page has separate login and signup flows (e.g. via tabs or query params), this routing distinction is lost. Both buttons are visually different (outline vs filled) but functionally identical.

## Brand Logo

```tsx
<div onClick={() => navigate('/')}
     style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
  <div style={{ width: '24px', height: '24px', background: 'rgb(162, 107, 252)', borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px' }}>
    SF
  </div>
  SchemaForge
</div>
```

A purple rounded square with "SF" text initials + wordmark. Clicks → `/`. Same logo pattern as `AppSidebar` and `Footer`, but slightly larger (`24×24` vs `20×20` in `Footer`).

## All-Inline Styles

Like `Footer`, `PublicNav` uses entirely inline styles. Same brand color hardcoded: `rgb(162, 107, 252)`.

## Layout at a Glance

```
<nav style="flex; justify-content: space-between; max-width: 1400px; margin: 0 auto">
  │
  ├── Left: Logo + Nav Links
  │     ├── [SF] SchemaForge (→ /)
  │     └── Pricing  Templates  Features  Docs
  │
  └── Right: Auth CTAs
        ├── [Go to Dashboard]         (when session exists)
        └── [Log in] [Sign up free]   (when no session)
```

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **"Log in" and "Sign up free" go to the same route** | Both navigate to `/login` — no `?mode=signup` or similar param to distinguish intent |
| **`<span>` nav links not accessible** | No `tabIndex`, no `role="link"`, no `href` — keyboard-only users cannot interact with nav links |
| **Brand color `rgb(162, 107, 252)` hardcoded** | Same value as in `Footer` and `AppSidebar.css` — should be a CSS variable like `var(--brand-primary)` |
| **No active/current page indicator** | Unlike `AppSidebar` or `DashboardSidebar`, `PublicNav` has no active state styling — the current page is not highlighted in the nav |
| **`session` from `useAuthStore`** | Nav reads auth state directly from the store — no need to pass session as a prop. Correct pattern |
| **Not sticky/fixed** | The nav scrolls with the page content — no `position: sticky` or `fixed` |

---

## Layout Architecture Overview

```
Public Marketing Pages              Authenticated App Pages
(/home, /pricing, /features, ...)   (/app/*, /docs)
──────────────────────────────────  ─────────────────────────────────────

PublicNav                           AppLayout
  ├── Logo                            ├── AppSidebar
  ├── Pricing / Templates /             │     ├── Logo
  │   Features / Docs                  │     ├── My Projects
  └── [Log in] [Sign up free]          │     ├── Community Templates
        or [Go to Dashboard]           │     ├── Documentation
                                       │     ├── Settings
{page content}                         │     └── Sign Out (if session)
                                       └── <div class="app-layout-content">
Footer                                       <Outlet /> ← current page
  ├── Brand + tagline                  </div>
  ├── Product links
  └── Company links
```

---

## Shared Brand Color Audit

All three layout components hardcode the same brand purple:

| Component | Value | Should Be |
|---|---|---|
| `AppSidebar` — `.app-logo-icon` | Via CSS file | — |
| `Footer` — logo square | `rgb(162, 107, 252)` | `var(--brand-primary)` |
| `PublicNav` — "SF" logo + CTA buttons | `rgb(162, 107, 252)` | `var(--brand-primary)` |
| `DashboardStats` | `rgb(162, 107, 252)` | `var(--brand-primary)` |
| `ProjectCard` | `rgb(162, 107, 252)` | `var(--brand-primary)` |

The value `rgb(162, 107, 252)` appears **5+ times** across the codebase as a raw color value. Centralizing it as a CSS custom property (`--brand-primary: rgb(162, 107, 252)`) would make future rebranding a single-line change.

---

*Generated documentation for SchemaForge — `src/components/layout/`*
