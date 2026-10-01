# Modellr — "Blueprint" design system

> Portable and self-contained. Implemented in `src/styles/blueprint.css` (tokens + components). Values are **authored** for this product;
> the *Evidence* column says what research informed each decision (live-measured = read with `getComputedStyle` from drawDB/ChartDB running locally;
> secondary = third-party DESIGN.md write-ups; none of the closed products could be inspected live, see `02-extraction/research-summary.md`).

## 1. Visual theme
A **drafting sheet for databases**. Warm paper (`#f5f2ea`) under a faint blue-grey grid, ink-navy line work, hard offset shadows (no blur), square
corners, an oversized high-contrast serif for statements, monospace for annotations and labels. One accent (blue) carries emphasis and links; a vermilion
red appears only as graphic highlight (shadows, leader lines, markers). Primary keys and foreign keys are drawn as real PK/FK badges, features are laid
out as a schema table, and the real product UI is framed like a sheet with callouts pointing at it. Calm, precise, confident; density is moderate on
marketing, high in docs and the app. Motion is physical: hover lifts, press pushes in. A **cyanotype** dark theme (navy paper, cream ink) mirrors it.

Why this and not the category default: drawDB (Inter, pill buttons, teal-blue, 12px cards) and ChartDB (system sans, 6px radius, pink accent)
are measured stock component-library looks; the Blueprint identity is unmistakable next to them. (live-measured)

## 2. Colour tokens
| Token | Light | Dark (cyanotype) | Role | Notes / Evidence |
|---|---|---|---|---|
| `--bp-paper` | `#f5f2ea` | `#0e1a36` | page background | warm, not white: reduces glare, carries the grid |
| `--bp-paper-2` | `#ece7d9` | `#0a1429` | sunken sections | |
| `--bp-card` | `#ffffff` | `#14234a` | raised surfaces | |
| `--bp-ink` | `#14213d` | `#efe9d8` | text + strong lines | contrast on paper 14.6:1 |
| `--bp-ink-2` | `#46526f` | `#b9bfd1` | secondary text | ≥ 6:1 |
| `--bp-ink-3` | `#5b6783` | `#98a1ba` | tertiary text | ≥ 4.5:1 |
| `--bp-grid` | `#c9cfe0` | `#2a3a66` | hairlines, drafting grid | |
| `--bp-blue` | `#2b59ff` | `#8aa8ff` | links, emphasis, focus ring | single chromatic accent (shared pattern: Linear/Supabase/Raycast, secondary) |
| `--bp-red` | `#ff4a2b` | `#ff7a5c` | graphic highlight only (shadows, leaders) | **never body text** (3.2:1) |
| `--bp-red-text` | `#c8321a` | `#ff8d72` | red when it must be text | ≥ 4.5:1 |
| `--bp-green` | `#1c7c47` | `#5fd08a` | success | |
| `--bp-amber-bg/ink` | `#fff1c9` / `#8a5a00` | `#3a3014` / `#f2c46b` | PK badge, warnings | |
Gradients: **none** on UI. The only gradient is the radial fade that dims the grid behind content.

## 3. Typography
| Role | Family | Weight | Size (desktop → mobile) | Line height | Tracking |
|---|---|---|---|---|---|
| Display | Fraunces Variable (opsz 144) | 600, italics 400 for emphasis | 92px → 48px (`clamp(3rem,7.4vw,5.75rem)`) | 0.95 | −0.04em |
| H1 | Fraunces | 600 | 64px → 40px | 1.0 | −0.035em |
| H2 | Fraunces | 600 | 54px → 32px | 1.02 | −0.03em |
| H3 | Fraunces (opsz 48) | 600 | 28px → 22px | 1.15 | −0.02em |
| Lead | Inter Variable | 400 | 20px → 17px | 1.6 | 0 |
| Body | Inter Variable | 400/500 | 17px → 16px | 1.6 (prose 1.75) | 0 |
| Label / code / buttons | JetBrains Mono | 600 | 12–13px (labels uppercase, +0.1em) | 1.5–1.75 | 0 / +0.1em |
Fonts are **self-hosted** (`@fontsource*`), no third-party font requests. Minimum UI text 12px (mono labels only); body never below 16px. Measured contrast:
drawDB/ChartDB use 14–16px body (live-measured); Blueprint raises prose to 17.5px for docs readability.

## 4. Spacing, layout, shape
- Spacing scale (4px base): 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Section padding 120 / 96 / 72px (≥1025 / ≤1024 / ≤768).
- Container 1240px, gutter 40 / 32 / 20px. Docs: 260px sticky nav + fluid article (max 42em prose).
- Radius: **0** for structure; 2px only for tiny controls; circles only for window dots. Borders: 2px ink (structure), 1.5px (inner), 1px grid (hairline).
- Shadows (hard, no blur): sm `3px 3px 0 ink`, md `6px 6px 0 ink`, lg `10px 10px 0 ink`; primary button `4px 4px 0 vermilion`.
- Breakpoints (tested): 320, 375, 390, 430, 768, 1024, 1280, 1440; layout shifts at 860 (nav → sheet, steps/CTA stack), 1024 (hero stacks), 768 (tables → stacked rows).

## 5. Components (visual + behaviour)
- **Button**: min-height 44 (52 large), mono 13/600, 2px ink border, ink fill, vermilion hard shadow. Hover lifts (−1,−1; shadow 6px), active pushes in (+3,+3; shadow 1px), focus ring 3px blue offset 3px, disabled 45% no shadow. Secondary = white fill, ink shadow. Danger = red-text outline.
- **Link**: mono 13/600 with 2px underline that turns blue on hover. **Chip** (filter): 32px, 1.5px border, pressed = ink fill.
- **Card**: white, 2px ink border, shadow md; as link: hover translate(−2,−2) + shadow 9px, active pushes in.
- **Spec table**: ink header row (mono 12 caps), hairline rows, first column mono bold (feature name + PK/FK badge); below 768px rows become stacked blocks.
- **Frame**: window-like sheet (3 outline dots, mono caption) with lg shadow, holds the real editor or a screenshot; callouts = mono labels with vermilion border.
- **Inputs/selects/textarea**: 44px, 2px ink border, white fill, invalid = red-text border + hard red shadow + message below; label = mono 12 caps.
- **Tabs**: mono 12/600, selected = ink fill. **Accordion (FAQ)**: serif 22px summary, 2px rules, `+` rotates 45° when open.
- **Modal**: centered on desktop (560px, lg shadow), becomes a bottom sheet ≤640px; scrim ink 55%; Escape + scrim click close; focus trapped, returns to trigger.
- **Drawer (docs nav)**: ≤900px a bordered panel toggled by a button; **Sheet (site nav)** ≤860px full-screen, large serif links, CTA pinned bottom.
- **Toast**: ink fill, vermilion shadow, bottom-right (full-width bottom ≤640px). **Alert**: amber (warning) or white (info), 2px ink border.
- **Empty state**: dashed 2px ink box, serif heading, one primary action. **Loading**: paper shimmer skeleton (disabled under reduced motion).
- **Badges**: PK = amber fill/ink-amber border; FK = blue outline; mono 10/700.
- **App shell**: 232px left rail (active item = bordered white tile with hard shadow); ≤860px becomes a 4-item bottom tab bar with a red top rule on the active tab.

## 6. Interaction language
| State | Behaviour |
|---|---|
| Hover | physical lift: translate(−1…−2px), hard shadow grows, 120–220ms `cubic-bezier(.2,.7,.2,1)` |
| Active | push-in: translate(+2…+3px), shadow collapses |
| Focus | `outline: 3px solid blue; offset 3px` on every interactive element, never removed; skip link first in DOM |
| Disabled | 45% opacity, no shadow/lift, `cursor: not-allowed`, `aria-disabled` |
| Loading | skeleton shimmer; buttons keep width and show mono "…" |
| Success / Error | toast (3.5s) for actions; inline mono message under fields; destructive actions confirm with focus on Cancel |
| Entrance | `bp-reveal` 16px rise + fade, 600ms, once per element via IntersectionObserver; no layout shift |
| Reduced motion | all transitions/animations/reveals off; hover shows shadow change only |
| Scroll | nav sticky, gains a 1.5px ink bottom rule after 8px; anchors offset by nav height |

## 7. Layout rules per screen family
Marketing: single column 1240 wrap, one oversized serif statement per section, product UI (never decoration) as visual evidence, ≤ 3 columns.
Docs: sticky left nav + prose, code blocks dark navy, "Open the editor" CTA at article end. App: rail + 12-col fluid main, cards grid auto-fill 300px.

## 8. Assets
No copied brand assets. Product screenshots are captured from this app. Illustrations are original inline SVG (mini schema diagrams). Icons: `lucide-react` (ISC) + the Octicons GitHub mark (MIT).
Substitutions: Google Fonts (Syne/Geist/Instrument Sans) → self-hosted Fraunces/Inter/JetBrains Mono (OFL).

## 9. Design guardrails
Do: keep one accent; draw structure with 2px ink lines; use real data in examples; annotate screenshots; keep italics for one phrase per heading; let paper breathe.
Don't: add gradients, glows, blur shadows, rounded pills, purple/green neon, stock imagery, fake logos/testimonials/metrics, text under 12px, red body text, centered-everything layouts.

## 10. Agent prompt guide
"Build UI using `src/styles/blueprint.css` classes (`bp-*`). Page = `.bp-root` > `.bp-nav` + `<main id="main">` sections (`.bp-section` > `.bp-wrap`) + `.bp-footer`.
Headlines use `.bp-display/.bp-h1/.bp-h2` with one `<em>`; eyebrow `.bp-eyebrow`; actions `.bp-btn` (+`--secondary`), links `.bp-link`. Group content in `.bp-card`,
`.bp-spec`, `.bp-panel`. Never add colours, radii or blur shadows outside the tokens. Every interactive element needs a visible focus ring and a 44px target."
