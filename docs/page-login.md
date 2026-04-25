# `Login.tsx` — Page Documentation

> **Location:** `src/pages/Login.tsx`  
> **Type:** React Page Component — TypeScript/TSX  
> **Route:** `/login`  
> **Purpose:** A combined login and signup page. A single 360px centered card provides GitHub OAuth and email/password authentication. Handles both sign-in and sign-up flows from the same form via two separate buttons. Redirects authenticated users to `/app`.

---

## File Overview

`Login` is the **sole authentication entry point** for the application. It is intentionally minimal — one component, no sub-components, no CSS file, no routing distinction between login and signup. The same UI serves both new and returning users.

---

## Dependencies & Imports

```tsx
import { supabase }      from '../lib/supabase';
import { Navigate }      from 'react-router-dom';
import { useAuthStore }  from '../store/authStore';
```

| Import | Role |
|---|---|
| `supabase` | `supabase.auth.signInWithPassword`, `supabase.auth.signUp`, `supabase.auth.signInWithOAuth` |
| `Navigate` | Declarative redirect to `/app` when already authenticated |
| `useAuthStore` | `session` — active Supabase session |

No stores mutated directly — authentication state is picked up automatically by `useAuthStore` via the Supabase `onAuthStateChange` listener wired in `App.tsx`.

---

## State

| State | Type | Initial | Description |
|---|---|---|---|
| `email` | `string` | `''` | Controlled email input |
| `password` | `string` | `''` | Controlled password input |
| `msg` | `{ text: string; isError: boolean }` | `{ text: '', isError: false }` | Status/error message displayed above the form |

---

## Auth Redirect Guard

```tsx
if (session) return <Navigate to="/app" replace />;
```

**Early return before the form renders** — authenticated users are immediately redirected to the dashboard. `replace` means the login page is not added to the browser history stack (native Back button won't return to login after redirect).

This guard runs on every render — if `session` becomes truthy after a successful sign-in, the component re-renders and navigates automatically.

---

## `handleEmailAuth(isSignUp)` — Combined Auth Handler

```ts
const handleEmailAuth = async (isSignUp: boolean) => {
  // Validation
  if (!email.trim() || !password.trim()) {
    setMsg({ text: 'Please enter your email and password.', isError: true });
    return;
  }
  if (isSignUp && password.length < 6) {
    setMsg({ text: 'Password must be at least 6 characters.', isError: true });
    return;
  }

  setMsg({ text: 'Processing...', isError: false });

  const { error } = isSignUp
    ? await supabase.auth.signUp({ email, password })
    : await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setMsg({ text: error.message, isError: true });
  } else {
    setMsg({
      text: isSignUp ? 'Check your email for confirmation!' : 'Logged in!',
      isError: false
    });
  }
};
```

### Validation

| Check | Applies to | Error |
|---|---|---|
| Empty email or password | Both | `"Please enter your email and password."` |
| Password < 6 chars | Sign up only | `"Password must be at least 6 characters."` |

Validation is client-side only — Supabase enforces its own password policy server-side (typically ≥6 chars, matching this guard).

### Supabase Auth Calls

| `isSignUp` | Supabase Method | Success Message |
|---|---|---|
| `true` | `supabase.auth.signUp({ email, password })` | `"Check your email for confirmation!"` |
| `false` | `supabase.auth.signInWithPassword({ email, password })` | `"Logged in!"` |

**On success with sign-up:** Supabase sends a confirmation email (if email confirmation is enabled in the Supabase project settings). The user is not immediately redirected — they see the "Check your email" message and must confirm before the session is established.

**On success with sign-in:** `session` in `useAuthStore` updates via `onAuthStateChange` → `Login` re-renders → `if (session)` is truthy → `<Navigate to="/app" />`.

**Error display:** `error.message` is Supabase's raw error string — e.g. `"Invalid login credentials"`, `"Email not confirmed"`, `"User already registered"`. These are real user-facing messages and are generally human-readable.

---

## `signInWithGithub()` — OAuth Flow

```ts
const signInWithGithub = async () => {
  await supabase.auth.signInWithOAuth({ provider: 'github' });
};
```

Triggers a browser redirect to GitHub's OAuth consent page. On return, Supabase handles the callback and establishes a session. Errors are caught and displayed in the banner.

---

## Message Banner

```tsx
{msg.text && (
  <div style={{
    background: msg.isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
    color:      msg.isError ? '#ef4444' : '#10b981',
    padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px'
  }}>
    {msg.text}
  </div>
)}
```

Single message area above the form. Used for both error (red tinted) and success (green tinted) states:

| `msg.isError` | Background | Text color | Use case |
|---|---|---|---|
| `true` | `rgba(239,68,68,0.1)` | `#ef4444` (red) | Validation errors, Supabase errors |
| `false` | `rgba(16,185,129,0.1)` | `#10b981` (green) | "Processing...", "Logged in!", "Check your email" |

Note that `"Processing..."` shows as green (success-styled) — a minor UX inconsistency since it's a neutral in-flight state rather than a success.

---

## Form Layout

```
360px centered card
│
├── "Log in to Modellr"      (h1, 20px)
├── "Welcome back! Access your cloud schemas."  (p, 14px, muted)
│
├── [message banner] (conditional)
│
├── [Continue with GitHub]       (#24292f = GitHub dark)
│
├── ──── Or with Email ────
│
├── [Email address input]        (type="email")
├── [Password input]             (type="password")
│
└── [Sign In]  [Sign Up]         (side-by-side, flex)
```

**"Sign In" and "Sign Up" are side-by-side buttons** — both always visible. There is no mode toggle (like "Don't have an account? Sign up"). This is an unusual but compact design — existing users click "Sign In", new users click "Sign Up."

---

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **`"Processing..."` styled green** | The in-flight state message uses success styling (`#10b981`) — should be neutral |
| **`"Geist"` font hardcoded** | `fontFamily: '"Geist", sans-serif'` — this is the only place `Geist` is referenced. If this font is not loaded globally, it falls back to `sans-serif` |
| **All CTAs from other pages → `/login`** | As noted in `Features.tsx`, `Home.tsx`, and `PublicNav.tsx` — all "Sign up free" / "Start building free" buttons land here. The form header says "Log in" not "Sign up", which creates a disconnect for new users arriving via a signup CTA |
| **GitHub icon missing** | The GitHub button has no logo/icon — just text "Continue with GitHub". A GitHub SVG or `lucide-react`'s `Github` icon would complete the appearance |

---

## Authentication Flow Summary

```
User arrives at /login
  │
  ├── if session → <Navigate to="/app" replace />
  │
  └── Renders login card

GitHub OAuth path:
  └── [Continue with GitHub]
        → supabase.auth.signInWithOAuth({ provider: 'github' })
        → Browser redirect to github.com/login/oauth/...
        → Callback → Supabase session established
        → onAuthStateChange → useAuthStore.session updated
        → Login re-renders → Navigate to /app

Email Sign In path:
  └── Enter email + password → [Sign In]
        → validate client-side
        → supabase.auth.signInWithPassword({ email, password })
        ├── success → "Logged in!" → session updates → Navigate to /app
        └── error   → show error.message in red banner

Email Sign Up path:
  └── Enter email + password → [Sign Up]
        → validate (empty check + length check)
        → supabase.auth.signUp({ email, password })
        ├── success → "Check your email for confirmation!"
        │             (session NOT established until email confirmed)
        └── error   → show error.message in red banner
```

---

*Generated documentation for Modellr — `src/pages/Login.tsx`*
