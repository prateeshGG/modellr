# Modellr redesign: research, spec and verification

This folder documents how the public site and app shell were redesigned. The app itself already worked end to end; the work here is a
greenfield visual and interaction design, followed by implementation and checks.

## What happened, honestly
1. **Dark purple "Terminal Luxury"** (the pre-existing look): rejected by the owner as generic.
2. **"Blueprint"** (warm paper, serif, hard shadows): designed from my own taste after research that could only read two open-source
   competitors live; rejected by the owner as generic.
3. **"Night"** (current): built from screenshots of Linear, Vercel, Stripe, Resend and Raycast that the owner supplied, mocked up, approved, then implemented.

## Research
- Egress limit: every closed reference site (linear.app, vercel.com, stripe.com, dbdiagram.io, drawsql.app, ...) returns an egress block from this
  environment, and I did not try to work around it. Live computed styles were therefore read only from drawDB and ChartDB (run locally,
  open source): `02-extraction/fragments/`. Closed products are covered by third-party design write-ups (secondary evidence).
- The final direction rests on the owner's screenshots: `02-extraction/reference-screenshots.md` (visual evidence only; colours sampled from pixels).
- Summary and rejected directions: `02-extraction/research-summary.md`, `research-references.json`.

## Specification
- Requirements, IA and screen inventory: `01-recon/` (`product-requirements.md`, `information-architecture.md`, `user-flows.md`).
- Design system: `03-design-spec/DESIGN.md` (tokens, type, spacing, components, interaction, guardrails) and `assertions.json`
  (127 computed-style assertions; selector keys have the form `theme|width|route|css selector`).
- Mockups (11 screens x desktop/tablet/mobile) and review boards: `04-architecture/mockups-v2`, `boards-v2`. Generated from the real stylesheet
  by `mock-build2.mjs`. `file-tree.md` maps the implementation.

## Screens implemented
Home (light, dark, live-editor switch, mobile menu), Features, Templates, Docs (11 articles at `/docs/:slug`), Blog and 4 posts, 3 use-case pages,
About, Contact, Privacy, Terms, 404 (catch-all); app: Projects (loading, empty, populated, search-empty, storage-blocked), Templates + preview modal,
Settings; shared dialogs and toasts. The editor and embed were re-themed (neutral surfaces, orange brand, Geist) and their top-bar layout bugs fixed
earlier (container queries instead of viewport media queries, minimap sizing, readable zoom controls).

## Verification (all run against the production build served by `vite preview`)
| Check | Script | Result |
|---|---|---|
| Typecheck, lint, unit tests, build | `npm run typecheck && npm run lint && npm test && npm run build` | 0 type errors, 0 lint errors (70 pre-existing warnings), 289 tests pass, build ok |
| User flows F1-F9 + keyboard, theme, SEO titles | `05-verification/flows.mjs` | 23 / 23 pass |
| Computed styles vs spec | `extract-styles.mjs` then `assert-styles.mjs` | 127 / 127 pass, 0 failed (`06-qa/metrics.json`) |
| Contrast (WCAG AA) on every visible text element | `05-verification/contrast.mjs` | 3,552 elements, dark + light, desktop + mobile: no failures |
| Horizontal overflow at 320, 375, 390, 430, 768, 1024, 1280, 1440 | `05-verification/breakpoints.mjs` | 19 routes x 8 widths x 2 themes: none |

Running them: `npm run build && npx vite preview --port 4173 --strictPort &` then, from `05-verification/`,
`PLAYWRIGHT_CORE=/path/to/playwright-core/index.mjs node flows.mjs` (same for the other scripts; `CHROME=` overrides the browser path).
What the style gate does and does not prove: it pins the implementation to the written design spec (a regression gate). It cannot prove the
design is good or that it matches the reference sites; that was judged visually and by the owner.

## Bugs found by the flow tests and fixed on the way
- Toasts were only mounted inside the editor, so dashboard, settings and template errors were never shown. Now mounted once in `App`.
- Confirm dialogs used undefined colour variables (unstyled Confirm button) and focused the destructive button first. Now styled, focus starts on Cancel and returns to the trigger.
- The "CMS & Blogs" template filter matched nothing; the editor's warning banner used an undefined variable.

## Asset and font substitutions
| Before | Now | Why |
|---|---|---|
| Google Fonts: Geist, Geist Mono, Syne, Instrument Sans | Geist Variable and Geist Mono Variable via `@fontsource-variable` (OFL), self-hosted | no third-party request, privacy page can say so |
| Fraunces, Inter, JetBrains Mono (Blueprint attempt) | removed | design rejected |
| Purple brand `rgb(162,107,252)` | orange `#ff6a3d` (dark) / `#e24a1c` (light) | single accent from the Night direction |
| Hero video slot | cropped screenshot + optional live editor | smaller, works on phones, honest about what is live |
No brand assets, logos or screenshots of other products are used in the site. Product screenshots are captured from this app.

## Known limits
- GitHub star count is fetched in the browser; it is hidden when GitHub is unreachable or the repo name does not resolve (the repo must be renamed to `modellr` on GitHub).
- The live editor in the home hero is desktop-only (the editor needs room); phones get a cropped screenshot and a link.
- `scripts/postbuild-seo.mjs` needs Node 22.18+ (it loads the TypeScript route table directly). Set `SITE_URL` for canonical links and the sitemap.
