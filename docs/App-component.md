# `App.tsx` — Component Documentation

> **Location:** `src/App.tsx`  
> **Type:** React Root Component — TypeScript/TSX  
> **Purpose:** Application entry point and top-level routing configuration. Bootstraps authentication, renders the global `DialogModal`, and defines the full client-side route tree using React Router v7 — covering marketing pages, auth-gated app routes, the schema editor canvas, and public/embed views.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Code Structure & Organization](#3-code-structure--organization)
4. [Component — `App`](#4-component--app)
5. [Authentication Bootstrap](#5-authentication-bootstrap)
6. [Loading State](#6-loading-state)
7. [Route Tree — Complete Reference](#7-route-tree--complete-reference)
8. [Route Groups](#8-route-groups)
9. [Auth Guard Pattern](#9-auth-guard-pattern)
10. [Global UI — `DialogModal`](#10-global-ui--dialogmodal)
11. [Notable Patterns & Conventions](#11-notable-patterns--conventions)
12. [Known Caveats & Limitations](#12-known-caveats--limitations)

---

## 1. File Overview

`App.tsx` is the **root of the React component tree**. It is the component mounted by the application entry point (likely `src/main.tsx`). It has two primary responsibilities:

1. **Auth initialization** — calls `useAuthStore().initialize()` on mount to restore or validate the Supabase session from localStorage/cookies.
2. **Routing** — defines the complete client-side route map using `BrowserRouter` and `Routes` from React Router DOM.

The component itself renders no visible UI of its own (beyond a loading placeholder) — it acts purely as an orchestrator, delegating rendering to page-level components.

---

## 2. Dependencies & Imports

```ts
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Editor from './pages/Editor';
import Home from './pages/Home';
import EmbedViewer from './pages/EmbedViewer';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Pricing } from './pages/Pricing';
import { Settings } from './pages/Settings';
import { Docs } from './pages/Docs';
import { TemplatesPage } from './pages/TemplatesPage';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { Features } from './pages/Features';
import { PublicTemplates } from './pages/PublicTemplates';
import { AppLayout } from './components/layout/AppLayout';
import { DialogModal } from './components/shared/DialogModal';
```

### External Packages

| Package | Imports | Role |
|---|---|---|
| `react` | `useEffect` | Side-effect hook for auth initialization |
| `react-router-dom` | `BrowserRouter`, `Routes`, `Route`, `Navigate` | Client-side routing (v7) |

### Internal — Store

| Import | Source | Role |
|---|---|---|
| `useAuthStore` | `./store/authStore` | Zustand auth store — provides `initialize`, `isLoading`, `session` |

### Internal — Pages

| Component | Route | Description |
|---|---|---|
| `Home` | `/` | Landing/marketing homepage |
| `Login` | `/login` | Authentication page |
| `Dashboard` | `/app` | User's schema dashboard |
| `Editor` | `/app/:id`, `/app/shared` | Schema canvas editor |
| `EmbedViewer` | `/embed/:id` | Embeddable read-only schema viewer |
| `Pricing` | `/pricing` | Pricing/plans page |
| `Features` | `/features` | Feature showcase page |
| `PublicTemplates` | `/templates` | Public template gallery |
| `Privacy` | `/privacy` | Privacy policy page |
| `Terms` | `/terms` | Terms of service page |
| `Docs` | `/docs` | Documentation page |
| `TemplatesPage` | `/app/templates` | Authenticated templates management page |
| `Settings` | `/app/settings` | User settings page |

### Internal — Components

| Component | Source | Role |
|---|---|---|
| `AppLayout` | `./components/layout/AppLayout` | Shell layout wrapper (sidebar, navbar) for authenticated app routes |
| `DialogModal` | `./components/shared/DialogModal` | Global modal rendered at root level — accessible from anywhere in the tree |

---

## 3. Code Structure & Organization

```
App.tsx
├── Imports                          (lines 1–19)
└── App() component                  (lines 21–71)
    ├── useAuthStore() destructure   (line 22)
    ├── useEffect → initialize()     (lines 24–26)
    ├── Loading guard                (lines 28–30)
    └── JSX render                   (lines 32–70)
        ├── <BrowserRouter>
        │   ├── <DialogModal />      — Global modal (outside Routes)
        │   └── <Routes>
        │       ├── Marketing routes (lines 37–45)
        │       ├── AppLayout shell routes (lines 47–51)
        │       ├── Editor route (lines 54–60)
        │       └── Shared view route (lines 63–67)
```

---

## 4. Component — `App`

**Lines:** 21–71  
**Type:** `default export` — React functional component  
**Signature:** `function App(): JSX.Element`

Reads three values from the auth store:

```ts
const { initialize, isLoading, session } = useAuthStore();
```

| Value | Type | Usage |
|---|---|---|
| `initialize` | `() => void` | Called once on mount to bootstrap the Supabase session |
| `isLoading` | `boolean` | If `true`, renders a full-page loading placeholder instead of routes |
| `session` | `Session \| null` | Used in auth guards — truthy = logged in, null = not logged in |

---

## 5. Authentication Bootstrap

```tsx
useEffect(() => {
  initialize();
}, [initialize]);
```

- **`initialize()`** is expected to be a stable function reference (memoized in the store) — safe to use as a dependency without causing infinite re-renders.
- It likely calls Supabase's `auth.getSession()` or sets up `auth.onAuthStateChange()` to hydrate the `session` state from the stored token.
- This runs **once on mount** (when `App` first renders), before any route-level components mount.
- Until `initialize()` completes and sets `isLoading = false`, the app renders the loading placeholder — preventing routes from rendering with an indeterminate auth state.

---

## 6. Loading State

```tsx
if (isLoading) {
  return <div style={{ color: '#fff', padding: '50px' }}>Loading session...</div>;
}
```

- Renders a plain white-text div while the auth session is being restored.
- This is a **minimal placeholder** — no spinner, no branding, no animation.
- The entire route tree is gated behind this check — no page renders until auth state is known.

---

## 7. Route Tree — Complete Reference

```
/                      → <Home />
/pricing               → <Pricing />
/features              → <Features />
/templates             → <PublicTemplates />
/privacy               → <Privacy />
/terms                 → <Terms />
/docs                  → <Docs />
/login                 → <Login />
/embed/:id             → <EmbedViewer />

<AppLayout>  (authenticated shell with sidebar/nav)
  /app                 → <Dashboard />         [auth guard]
  /app/templates       → <TemplatesPage />     [auth guard]
  /app/settings        → <Settings />          [auth guard]

/app/:id               → <Editor />            [auth guard, fullscreen]
/app/shared            → <Editor isSharedView> [no auth guard, fullscreen]
```

---

## 8. Route Groups

### Marketing Routes (Public)
**Lines:** 37–45

```tsx
<Route path="/"          element={<Home />} />
<Route path="/pricing"   element={<Pricing />} />
<Route path="/features"  element={<Features />} />
<Route path="/templates" element={<PublicTemplates />} />
<Route path="/privacy"   element={<Privacy />} />
<Route path="/terms"     element={<Terms />} />
<Route path="/docs"      element={<Docs />} />
<Route path="/embed/:id" element={<EmbedViewer />} />
<Route path="/login"     element={<Login />} />
```

- All publicly accessible without authentication.
- No layout wrapper — each page manages its own layout.
- `/embed/:id` — renders a minimal embeddable view of a schema (for iframe embedding).
- `/login` — the auth page; likely redirects to `/app` if already logged in (handled within the `Login` component itself).

---

### AppLayout Shell Routes (Authenticated)
**Lines:** 47–51

```tsx
<Route element={<AppLayout />}>
  <Route path="/app"           element={session ? <Dashboard />    : <Navigate to="/login" replace />} />
  <Route path="/app/templates" element={session ? <TemplatesPage /> : <Navigate to="/login" replace />} />
  <Route path="/app/settings"  element={session ? <Settings />      : <Navigate to="/login" replace />} />
</Route>
```

- Wrapped in `<AppLayout>` — a layout route that renders a persistent chrome (sidebar, top bar) around the page content via React Router's `<Outlet />`.
- Each child route applies an inline auth guard — unauthenticated users are redirected to `/login`.
- `replace` on `<Navigate>` ensures the login redirect doesn't add to the browser history stack (back button goes to the page before the guarded route, not back to the redirect loop).

---

### Editor Route (Fullscreen, Authenticated)
**Lines:** 54–60

```tsx
<Route path="/app/:id" element={
  session ? (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Editor />
    </div>
  ) : <Navigate to="/login" replace />
} />
```

- The `:id` param is the schema UUID — passed to the `Editor` component which uses it to load the correct schema from Supabase.
- **Not wrapped in `<AppLayout>`** — the editor is truly fullscreen with no sidebar.
- The wrapping `<div>` enforces `100vh × 100vw` with `overflow: hidden` — prevents scrollbars on the canvas.
- Auth-gated — unauthenticated users are redirected to `/login`.

---

### Shared View Route (Fullscreen, Public)
**Lines:** 63–67

```tsx
<Route path="/app/shared" element={
  <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--canvas-bg)' }}>
    <Editor isSharedView={true} />
  </div>
} />
```

- **No auth guard** — shared schemas are publicly viewable without logging in.
- Passes `isSharedView={true}` to `Editor` — this prop signals read-only mode (no edit toolbar, no save, etc.).
- The background is set to `var(--canvas-bg)` — a CSS custom property from the design system — for consistent visual appearance even before the canvas renders.
- Fixed path `/app/shared` — no dynamic `:id`. The shared schema data is likely loaded via a query parameter or a global store set by a share link handler.

> **⚠️ Route order caveat:** `/app/shared` conflicts with `/app/:id` — React Router will match `/app/:id` first if it's declared before `/app/shared`. In this file, `/app/:id` is declared on line 54 and `/app/shared` on line 63. React Router v6+ uses specificity-based matching (exact static paths win over dynamic `:param` paths), so `/app/shared` should match correctly regardless of declaration order. Worth confirming in React Router v7.

---

## 9. Auth Guard Pattern

All authenticated routes use an **inline conditional redirect**:

```tsx
element={session ? <ProtectedPage /> : <Navigate to="/login" replace />}
```

This is the simplest possible auth guard pattern — no higher-order component, no custom `PrivateRoute` wrapper. Pros and cons:

| Aspect | Detail |
|---|---|
| **Simple** | No extra abstraction needed — logic is immediately visible |
| **Co-located** | Guard condition is right next to the route definition |
| **Repetitive** | The same pattern is repeated for every protected route — a `ProtectedRoute` component would be DRYer |
| **Relies on `session` truthiness** | `session` is the Supabase `Session` object — truthy when logged in, `null` when not |

---

## 10. Global UI — `DialogModal`

```tsx
<BrowserRouter>
  <DialogModal />   {/* ← Outside <Routes>, always mounted */}
  <Routes>
    ...
  </Routes>
</BrowserRouter>
```

- `<DialogModal />` is rendered **outside** `<Routes>` — it is always mounted regardless of the current route.
- Placement at the root level means it can be triggered from any page or component in the tree via the modal store (likely a Zustand store or React context).
- By being inside `<BrowserRouter>` but outside `<Routes>`, it has access to Router context (can use `useNavigate`, `useLocation`, etc.) but won't unmount during route transitions.

---

## 11. Notable Patterns & Conventions

- **Default export:** `App` is a `default export` with no named export — consistent with React convention for root-level components.
- **`useEffect` with stable `initialize` reference:** Using `initialize` as a dependency instead of `[]` is the correct ESLint-compliant approach; assumes the store memoizes the function.
- **Layout route pattern:** `<Route element={<AppLayout />}>` with nested `<Route>` children is the React Router v6+ way to share a layout across multiple routes — clean and composable.
- **Inline auth guards over `PrivateRoute`:** Keeps the route config readable without an extra abstraction.
- **`overflow: hidden` on editor wrapper:** Prevents the infinite-canvas from causing page scrollbars.
- **`var(--canvas-bg)` on shared view:** Uses a CSS custom property instead of a hardcoded color — theme-consistent and easy to change globally.
- **`replace` on all `<Navigate>`:** Prevents redirect loops from polluting browser history.

---

## 12. Known Caveats & Limitations

| Issue | Description |
|---|---|
| **Plain loading placeholder** | `"Loading session..."` is an unstyled white div — no spinner, no branding. Visible briefly on every page load. |
| **Repeated auth guard boilerplate** | The `session ? <Page /> : <Navigate to="/login" replace />` pattern is repeated three times in the layout routes and once more for the editor. A `<ProtectedRoute>` component would be cleaner. |
| **`/app/shared` — no schema ID in path** | The shared view route has no `:id` — unclear how the schema to display is communicated (query param? global store?). May require reading the implementation of `Editor` to fully understand. |
| **No 404 route** | There's no catch-all `<Route path="*">` for unrecognized URLs. Users who navigate to an unknown path see a blank page. |
| **`isLoading` blocks full render** | During auth initialization, the entire app renders a plain div. If `initialize()` is slow (e.g. network timeout), users see a blank screen for a noticeable period. |
| **No error boundary** | If any page component throws an unhandled error, it will bubble up and crash the entire app. No `<ErrorBoundary>` wrapper is present. |

---

*Generated documentation for SchemaForge — `src/App.tsx`*
