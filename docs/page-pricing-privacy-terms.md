# Static & Marketing Pages — Documentation

> **Files:** `Pricing.tsx`, `Privacy.tsx`, `Terms.tsx`  
> **Routes:** `/pricing`, `/privacy`, `/terms`  
> **Type:** React Page Components — TypeScript/TSX  
> **Access:** Public, no auth required

---

## Overview

Three public-facing pages with minimal application logic. All share the same structural shell — `PublicNav` + content + `Footer` — and use 100% inline styles with no CSS files.

| File | Route | Auth-aware? | State |
|---|---|---|---|
| `Pricing.tsx` | `/pricing` | ✅ (`session`) | `billingCycle` toggle |
| `Privacy.tsx` | `/privacy` | ❌ | None |
| `Terms.tsx` | `/terms` | ❌ | None |

---

---

# `Pricing.tsx` — Page Documentation

> **Route:** `/pricing`

## File Overview

A three-tier pricing page (`Free` / `Pro` / `Enterprise`) with a **monthly/annual billing toggle**. The toggle switches the Pro tier price between `$12/mo` and `$9/mo` and adjusts the subtitle accordingly. Auth state is read to determine CTA routing for the Free tier button.

## Dependencies

```tsx
import { useNavigate }  from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { PublicNav }    from '../components/layout/PublicNav';
import { Footer }       from '../components/layout/Footer';
```

## State

```ts
const { session } = useAuthStore();
const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
```

`billingCycle` — the only dynamic element on the page. Triggers:
- Pro price display: `$12` (monthly) / `$9` (annual)
- Pro subtitle: generic vs `"Billed $108 yearly."`
- Toggle knob CSS position (`left: 3px` → `left: 23px`)

## Billing Toggle

```tsx
<div onClick={() => setBillingCycle(b => b === 'monthly' ? 'annual' : 'monthly')}
     style={{ width:'44px', height:'24px', background: 'rgb(162,107,252)', borderRadius:'12px', ... }}>
  <div style={{ left: billingCycle === 'monthly' ? '3px' : '23px', transition: 'all 0.2s' }} />
</div>
```

A custom CSS toggle — no `<input type="checkbox">`. The knob position is driven by inline style rather than CSS class. No `role="switch"` or `aria-checked` — not accessible to screen readers.

## Pricing Tiers

### Free — `$0/mo`

| Feature | Status |
|---|---|
| 3 saved schemas | ✅ |
| Unlimited canvas editing | ✅ |
| SQL + DBML export | ✅ |
| AI generation (10/day) | ✅ |
| Guest sandbox | ✅ |
| AI Chat-to-Modify | — (greyed) |
| Prisma + Drizzle export | — (greyed) |
| MCP server access | — (greyed) |

**CTA:** `"Get started free"` → `navigate(session ? '/app' : '/login')`  
Auth-aware — authenticated users go directly to the dashboard; guests go to login.

### Pro — `$12/mo` (monthly) / `$9/mo` (annual, billed `$108/yr`)

| Feature | Status |
|---|---|
| Unlimited schemas | ✅ |
| Unlimited snapshots | ✅ |
| All exports incl. Prisma, Drizzle | ✅ |
| AI generation (200/day) | ✅ |
| AI Chat-to-Modify (unlimited) | ✅ |
| 10 collaborators/schema | ✅ |
| MCP server + API key | ✅ (bold) |

**CTA:** `"Upgrade to Pro"` → **no `onClick` handler**. The button has no navigation or action — clicking it does nothing.

> ⚠️ **Bug:** The Pro tier's CTA button is missing an `onClick`. There is no payment / Stripe integration in the codebase — the button is a visual placeholder. A user who wants to upgrade has no action path from the pricing page.

**Visual treatment:** Pro card uses `transform: scale(1.02)` to visually lift it above Free and Enterprise. A "✦ Most popular" badge in brand purple is positioned at the top center.

### Enterprise — Custom

| Feature | Claimed |
|---|---|
| Everything in Pro | ✅ |
| SSO / SAML | ✅ |
| Unlimited collaborators | ✅ |
| Audit logs | ✅ |
| SLA + dedicated support | ✅ |
| Custom export formats | ✅ |
| On-prem / self-hosted option | ✅ |

**CTA:** `"Contact us"` → **no `onClick` handler**. No email, no form, no link. Same dead-button issue as Pro.

## Content Accuracy Notes

| Claim | Reality |
|---|---|
| Free: AI generation (10/day) | No daily rate limiter exists in `useAI.ts` or server routes |
| Pro: AI generation (200/day) | Same — no implementation |
| Free: SQL + DBML export | Correct — both exporters implemented |
| Free: Prisma + Drizzle greyed-out | Both exporters exist and work for all users — no tier check in code |
| Pro: MCP server + API key | MCP gateway is implemented; API key system exists in `apikeys.js` |
| Enterprise: Custom export formats | No custom format plugin system exists |
| Enterprise: On-prem / self-hosted | No self-hosted deployment documentation or configuration exists |

> **Critical content gap:** Free tier features marked as "greyed out" (`—`) include Prisma + Drizzle export — but the actual code has no tier check. Any user, free or otherwise, can export Prisma and Drizzle from the `TopBar` export menu. The feature gating shown on the pricing page is **not enforced**.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Pro + Enterprise CTAs have no `onClick`** | Both upgrade buttons are non-functional — no payment flow, no contact form |
| **No Stripe integration** | No payment processing of any kind in the codebase |
| **Feature gating not enforced in code** | Free tier's "greyed out" features (Prisma, Drizzle, Chat-to-Modify) are accessible to all users |
| **`rgb(162,107,252)` count: ~20 instances** | All checkmarks, Pro card border/label/price/badge, toggle background, "Save 30%" label |
| **Toggle is inaccessible** | Custom `<div onClick>` toggle — no `role="switch"`, no `aria-checked`, no keyboard support |
| **Annual pricing math** | `$9/mo × 12 = $108/yr` matches the subtitle "Billed $108 yearly" — correct |
| **`CRLF` line endings** | `Pricing.tsx` uses `\r\n` (Windows CRLF) — other files use `\n` (LF). Inconsistent across the repo |

---

---

# `Privacy.tsx` — Page Documentation

> **Route:** `/privacy`

## File Overview

A five-section privacy policy page. Static content — no state, no effects. Renders between `PublicNav` and `Footer`.

## State & Effects

**None.** Fully static.

## "Last Updated" Date

```tsx
<p>Last updated: {new Date().toLocaleDateString()}</p>
```

> ⚠️ **Bug:** Uses `new Date()` at render time — the "Last updated" date is dynamically set to **today's date on every page load**, regardless of when the policy was actually last changed. If the privacy policy was written months ago, it will always show today's date, giving users a false impression that it was just updated.

## Sections

| Section | Key Content |
|---|---|
| 1. Information We Collect | Profile data (name, email) from GitHub/Google/Email via Supabase Auth; schema configurations |
| 2. Database Connection Strings | **Explicitly not stored** — transient server-memory usage only; connection closed after `information_schema` query |
| 3. How We Use Information | Service provision; AI queries passed anonymously to OpenAI with no PII in system prompts |
| 4. Data Security | RLS + zero-trust; magic link + token authentication |
| 5. Contact Us | `privacy@schemaforge.com` |

## Content Accuracy Notes

| Claim | Status |
|---|---|
| "Google" OAuth mentioned | Only GitHub OAuth appears in `Login.tsx` — no Google OAuth visible in the codebase |
| Connection strings not stored | Accurate — `postgres.js` / `mysql.js` routes use transient connections |
| "Schema canvas states stored using Yjs awareness engines mapped to Supabase Storage" | Inaccurate — schemas are stored in the `schemas` table (`canvas_state` column), **not** Supabase Storage. Yjs awareness is only for live cursor positions, not persisted data |
| AI queries anonymous, no PII | Broadly accurate — the OpenAI route passes schema prompts, not user identity |

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **`new Date()` for "Last updated"** | Always shows today — misleading versioning |
| **"Google" sign-in mentioned** | Not implemented in `Login.tsx` — only GitHub OAuth and email/password |
| **Supabase Storage claim inaccurate** | Schemas stored in Postgres table, not Supabase Storage bucket |
| **Contact email hardcoded** | `privacy@schemaforge.com` — must be kept in sync if contact channels change |
| **No legal review indicator** | No version number, no attorney sign-off note — standard best practice for privacy policies |

---

---

# `Terms.tsx` — Page Documentation

> **Route:** `/terms`

## File Overview

A five-section Terms of Service page. Fully static — no state, no effects. Same shell pattern as `Privacy.tsx`.

## State & Effects

**None.** Fully static.

## "Last Updated" Date

```tsx
<p>Last updated: {new Date().toLocaleDateString()}</p>
```

Same dynamic date issue as `Privacy.tsx` — always shows today's date.

## Sections

| Section | Key Content |
|---|---|
| 1. Agreement to Terms | Standard acceptance clause — accessing the service implies agreement |
| 2. Accounts | Accurate information requirement; user responsibility for credentials |
| 3. Acceptable Use | No illegal schemas; no reverse-engineering canvas protocol; no AI API abuse; no WebSocket spam |
| 4. Intellectual Property | **User owns all schemas/exports they create** — SchemaForge claims no ownership over user-generated data |
| 5. Limitation of Liability | Standard no-consequential-damages disclaimer |

## Notable Content

**Section 4 — IP ownership** is a meaningful user-facing commitment:
> *"Any database schemas, exported files (SQL, Prisma, DBML), and data structures you architect and export using SchemaForge are entirely your intellectual property. We claim no ownership over the database designs you create."*

This is clear and legally significant — user data is user-owned. No license grant to SchemaForge for the schema data.

**Section 3 — Acceptable Use** is product-specific rather than generic:
> *"You agree not to reverse engineer the canvas drawing protocol, abuse the AI API limits, or spam the collaboration WebSocket channels."*

References concrete technical features (canvas protocol, AI limits, WebSocket) — indicates the ToS was written by someone with product knowledge, not boilerplate-copied.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **`new Date()` for "Last updated"** | Same issue as `Privacy.tsx` — always shows today |
| **"SchemaForge Inc." referenced** | Section 5 mentions "SchemaForge Inc." — may not reflect the actual legal entity name |
| **No version number** | No ToS version tracked — users can't tell if terms changed since they accepted |
| **No acceptance flow** | No "I agree to Terms" checkbox during sign-up — purely a display page |

---

---

## Shared Patterns Across All Three Pages

```tsx
// Identical page shell (all three files):
<div style={{ background: 'var(--canvas-bg)', minHeight: '100vh',
              color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
  <PublicNav />
  <div style={{ maxWidth: '800px|1000px', margin: '0 auto', padding: '64px 20px', flex: 1 }}>
    {/* page content */}
  </div>
  <Footer />
</div>
```

| Trait | `Pricing` | `Privacy` | `Terms` |
|---|---|---|---|
| State | `billingCycle` | None | None |
| Effects | None | None | None |
| CSS file | None | None | None |
| `React` import | ❌ | ❌ | ❌ |
| Dynamic date | No | ✅ (bug) | ✅ (bug) |
| All inline styles | ✅ | ✅ | ✅ |
| Auth-aware | ✅ (`session`) | ❌ | ❌ |
| CRLF line endings | ✅ (inconsistent) | ❌ | ❌ |

---

*Generated documentation for SchemaForge — `src/pages/Pricing.tsx`, `Privacy.tsx`, `Terms.tsx`*
