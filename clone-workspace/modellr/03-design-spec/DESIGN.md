# Modellr "Night" design system

Implemented in `src/styles/night.css` (tokens + components, class prefix `n-`). Values are authored for this product from the
reference screenshots the owner supplied (Linear, Vercel, Stripe, Resend, Raycast: visual evidence only, colours sampled from pixels;
their live CSS could not be read, see `02-extraction/research-summary.md` and `reference-screenshots.md`).
`assertions.json` pins the values below to the built app; `05-verification/` holds the checks.

## 1. Visual theme
A near-black, neutral canvas with hairline borders and one accent. Product UI is the hero: the real editor sits directly under a
left-aligned, medium-weight headline. Colour is almost absent from the chrome; the single orange accent is "the relationship line"
(callout rings, link strokes in illustrations, active tab marker, focus ring, the mark in the logo). Illustrations are thin isometric
line drawings. Light theme mirrors the structure on warm-white. Motion is small: 150ms colour/border changes, 2px card lift, 1px button press.

Patterns taken from the references: dark neutral canvas; one hero object (here: the editor); text-only "works with" row instead of
logos (only real formats listed, no fake customers); title-left / copy-right feature rows with the product below; changelog row;
centred closing CTA; dense, quiet footer; white pill primary button on dark.
Deliberately not used: gradients on UI, glass cards, multi-colour accents, stock imagery, fake testimonials or metrics.

## 2. Colour tokens
| Token | Dark | Light | Role |
|---|---|---|---|
| `--n-bg` | `#08090a` | `#fbfbfa` | page |
| `--n-bg-2` | `#0b0c0e` | `#f4f4f2` | sunken areas, illustration wells |
| `--n-surface` / `-2` | `#0f1113` / `#15181b` | `#ffffff` / `#f6f6f4` | cards, hover/active fills |
| `--n-line` / `-2` / `-3` | white 7% / 13% / 22% | ink 9% / 16% / 28% | hairlines, borders, hover borders |
| `--n-text` | `#f5f6f7` | `#0b0c0e` | primary text |
| `--n-text-2` | `#a3a8af` | `#4a4f57` | secondary text |
| `--n-text-3` | `#7d838b` | `#656b74` | tertiary text, labels |
| `--n-accent` | `#ff6a3d` | `#e24a1c` | graphic accent, focus ring |
| `--n-accent-text` | `#ff8a63` | `#c63a12` | accent when used as text |
| `--n-blue` / `--n-amber` / `--n-green` / `--n-danger` | `#8ab0ff` / `#f2c46b` / `#5fd08a` / `#ff8080` | `#2f5fe0` / `#9a6700` / `#15803d` / `#c42b2b` | FK, PK, status |
Code panels are dark in both themes (`#0b0d0f`). Contrast is measured, not assumed: `05-verification/contrast.mjs` checks every visible
text element on every route in both themes and two widths (3,552 elements, all >= 4.5:1, or 3:1 for large text).

## 3. Typography
Geist Variable (UI) and Geist Mono Variable (labels, code), self-hosted via `@fontsource-variable`; no third-party font request.
| Role | Size (1440 → 390) | Weight | Line height | Tracking |
|---|---|---|---|---|
| H1 `.n-h1` | 68px → 40px (`clamp(2.5rem, 5.4vw, 4.25rem)`) | 500 | 1.04 | -0.045em |
| H2 `.n-h2` | 44px → 30px | 500 | 1.08 | -0.04em |
| H3 `.n-h3` / H4 `.n-h4` | 20px / 15px | 500 | 1.3 / 1.4 | -0.02em / -0.005em |
| Statement | 32px | 500 | 1.3 | -0.03em |
| Lead | 18px | 400 | 1.6 | 0 |
| Body | 16px (prose 17px / 1.75) | 400 | 1.6 | 0 |
| Eyebrow / badges / code | 12px mono uppercase (+0.06em) / 11px / 13px | 400-600 | 1.5 / 1 / 1.75 | |
Minimum text size is 11px (mono badges and callouts only); body is never below 14px.

## 4. Spacing, layout, shape
- Container 1160px, gutters 40 / 32 / 20px (>1024 / <=1024 / <=768). Section padding 128 / 96 / 72px. Docs: 240px nav + prose (44em).
- Radius: 6 (tabs, small), 8 (nav controls, small buttons), 10 (buttons, inputs), 12 (cards, panels), 14 (product frame), 16 (modals), 999 (filter chips).
- Borders 1px hairline everywhere; shadows only on the product frame and modals (`0 40px 120px -24px #000d`).
- Breakpoints tested: 320, 375, 390, 430, 768, 1024, 1280, 1440. Layout shifts at 1024 (hero stacks, 3-col grids to 2), 860 (nav to full-screen sheet, app rail to bottom tab bar), 640 (single column, modals become bottom sheets).

## 5. Components
Buttons `.n-btn` (44px; `--sm` 34, `--lg` 48; primary = text colour on page colour, `--secondary` = hairline, `--danger`, `--accent`); links `.n-link` (underline in hairline, accent on hover) and `.n-arrow`; nav `.n-nav` (60px sticky, blur, hairline after 8px scroll) with star pill `.n-gh` and theme toggle; full-screen sheet `.n-sheet`; product frame `.n-shot` (bar, screenshot or live editor, callouts, bottom fade, accent floor glow); cards `.n-card` (+ `.n-bento` grid, `.n-card__art` wells); code `.n-panel` + `.n-tabs`; `.n-faq` accordion; `.n-changelog`; `.n-oss` stat strip; `.n-chip` filters; form fields `.n-input/.n-select/.n-textarea` (focus ring in accent, invalid in danger); `.n-alert`, `.n-toast`, `.n-empty`, `.n-skeleton`; modal `.n-scrim/.n-modal` (bottom sheet <= 640px); docs layout `.n-docs` + `.n-prose`; app shell `.n-app/.n-rail/.n-tabbar/.n-main/.n-stats/.n-project`.

## 6. Interaction language
Hover: border and fill step up one level (card also lifts 2px). Active: buttons move 1px down. Focus: `outline: 2px solid var(--n-accent); offset 3px` on every interactive element, never removed; skip link first in DOM. Disabled: 45% opacity, no pointer events. Loading: skeleton shimmer. Errors: inline text in danger colour or an assertive toast. Destructive confirms start with focus on Cancel and return focus to the trigger. Escape closes menus, sheets and dialogs. Reduced motion: all transitions off.

## 7. Screens
Marketing: Home, Features, Templates, Docs (11 articles, `/docs/:slug`), Blog (+ posts), 3 use-case pages, About, Contact, Privacy, Terms, 404.
App: Projects dashboard (loading / empty / populated / search-empty / storage-blocked), Templates gallery + preview modal, Settings. Editor and embed keep their own chrome (re-themed with the same tokens: neutral near-black surfaces, orange brand, Geist).

## 8. Assets
No copied brand assets. Product screenshots are captured from this app (`src/assets/editor-*.webp`). Illustrations are original inline SVG. The GitHub mark is the Octicons mark (MIT). Fonts: Geist and Geist Mono (SIL OFL) replace the former Google-hosted Geist/Syne/Instrument Sans.

## 9. Guardrails
Do: one accent, hairlines, real data in examples, product UI as the visual, left-aligned text. Don't: gradients on UI, extra colours, rounded-pill buttons (except chips), blur shadows on cards, text under 11px, red body text, centred-everything layouts, fake logos or metrics.

## 10. Agent prompt guide
"Build UI with the `n-*` classes in `src/styles/night.css`. Page = `<SiteShell route=...>` (nav, main, footer, SEO) with `.n-section > .n-wrap` blocks. One `h1` per page. Cards are `.n-card`; code is `.n-panel > .n-code`; actions are `.n-btn` and `.n-arrow`. Never hard-code colours: use the `--n-*` tokens so both themes work. Every interactive element needs a visible focus ring and a 44px target on touch widths."
