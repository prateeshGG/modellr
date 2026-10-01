# Stage 3 — Design research summary

## How the research was done (and what it could not do)
- **Egress policy:** the session's proxy returns **403 on CONNECT for every closed reference site** I tried (linear.app, vercel.com, stripe.com,
  supabase.com, raycast.com, dbdiagram.io, drawsql.app, figma.com, resend.com, posthog.com, cal.com, ...). Per the proxy's own documentation these
  denials are policy and must not be routed around, so **no closed product could be inspected live**.
- **Primary evidence (live CSSOM):** the two open-source *direct competitors* were cloned, run locally (Vite dev servers) and inspected with a real
  Chromium via `getComputedStyle` (`extract.mjs`): **drawDB** (landing desktop/mobile, editor) and **ChartDB** (app desktop/mobile).
  Raw data: `02-extraction/fragments/*.computed.json`; visual references: `01-recon/screenshots/`.
- **Secondary evidence (third-party extractions, not measured by me):** `VoltAgent/awesome-design-md` DESIGN.md write-ups for Linear, Vercel, Stripe,
  Supabase, Raycast, Cal.com, Notion, Mintlify. Used only for patterns/palette character, never as precise token values.
- **Search snippets** (WebSearch) for dbdiagram.io / DrawSQL / ChartDB / drawDB feature and pricing context (see `research-references.json`).

## References (10)
| # | Product | Why it is relevant | Evidence type |
|---|---|---|---|
| 1 | drawDB | direct competitor, OSS, same audience | **live CSSOM** + screenshots |
| 2 | ChartDB | direct competitor, OSS, onboarding flow | **live CSSOM** + screenshots |
| 3 | dbdiagram.io | category leader (code-first) | search snippets only (blocked) |
| 4 | DrawSQL | premium visual tool | search snippets only (blocked) |
| 5 | Supabase | DB platform; dense product mockups, single CTA colour | design-md (secondary) |
| 6 | Linear | benchmark for restrained dev-tool marketing | design-md (secondary) |
| 7 | Raycast | product chrome as hero (command-palette mockups) | design-md (secondary) |
| 8 | Vercel | stark black/white, strong typography | design-md (secondary) |
| 9 | Mintlify | docs surfaces + marketing duality | design-md (secondary) |
| 10 | Cal.com | OSS product, soft cards, product fragments | design-md (secondary) |

## Measured findings (live)
| | drawDB | ChartDB |
|---|---|---|
| Type | Inter (marketing + app) | `ui-sans-serif` system stack; Raleway for one logo word |
| Scale seen | 16/18/20/24/42/48 | 10/12/14/16/18 (14px UI default) |
| Radii | pill (9999px) buttons, 12px cards | 6px everywhere (shadcn default) |
| Colour | teal-blue `oklch(.5 .134 242)`, near-black text, light grey surfaces | slate neutrals, **pink `#db2777`** accent |
| Buttons | 48–50px high, pill, 16/600 | 36px high, 6px radius, 14/500; icon rail buttons 47×51 |
| Breakpoints | 576/768/992/1200/1600 (Bootstrap-like) | 640/768/1024/1280/1400 (Tailwind) |
| Landing | decorative **non-interactive** diagram beside headline | none: opens straight into an onboarding modal ("What is your Database?") |
| Mobile | **horizontal overflow at 390px** (scrollWidth > innerWidth) | no overflow; app reflows |
| Dark mode | follows `prefers-color-scheme` | toggle |

## Patterns
### Shared across references
1. One chromatic accent, everything else neutral. 2. Hairline borders define structure more than shadows. 3. The *product UI itself* is the hero
asset (Raycast, Supabase, Linear, Cal.com). 4. Sticky top nav with 4–5 links + one primary CTA. 5. Docs are dense and left-nav driven; marketing is airy.
6. Generous section rhythm (≥96px desktop). 7. 12px-ish soft cards or pill buttons (the "modern SaaS" default).

### Particularly suited to Modellr
- Show the **real working editor** at first paint (neither direct competitor does).
- Prove claims with real output (the live exporter panel); a schema tool's credibility is correctness.
- Make the *domain metaphor* (tables, keys, relationships) the visual language, not decoration.
- Honest trust signals: MIT, "nothing uploaded", real star count, no fake logos/testimonials.

### Avoid
- Purple/green neon gradients and glow (generic "AI SaaS" look — the owner rejected it); gradient-mesh heroes (Vercel/Stripe signature, not ours).
- Decorative non-interactive diagrams (drawDB) and modal-first onboarding (ChartDB) as the first impression.
- Pill-everything and 6px-radius-everything defaults: they make the three tools indistinguishable.
- Horizontal overflow on mobile (drawDB defect) and tiny 10–12px UI text.

### Direction history
1. First attempt (dark purple "Terminal Luxury") was rejected by the owner as generic.
2. Second attempt, "Blueprint" (warm paper, serif display, hard shadows), was built from my own taste on thin evidence and was rejected as generic too.
3. Final direction, **Night**, is built from screenshots of Linear, Vercel, Stripe, Resend and Raycast supplied by the owner (see `reference-screenshots.md`),
   because every closed reference site is blocked from this environment. What differentiates it from those sites: the product is a diagram tool, so the
   editor is the hero object and the only colour on the page is the orange relationship line (callout rings, illustration strokes, focus, active marker);
   illustrations are isometric line drawings of tables and keys; the "works with" row lists real formats instead of customer logos.

### Interaction patterns worth adapting
Hover = border/fill step up one level, small card lift; press = 1px down. Command-palette idea (Raycast) is already real in the editor (Ctrl/Cmd+K).
Dashboard empty state that teaches (ChartDB onboarding, but inline not modal). Sticky docs sidebar becomes a toggle panel on mobile (Mintlify).

### Information-architecture patterns worth adapting
4-link nav + CTA (Linear/Supabase); docs with persistent left nav (Mintlify); templates gallery with category filter (drawDB `/templates`).

### Visual patterns worth adapting
Near-black neutral canvas; product UI as the hero with a soft floor glow; title-left / copy-right feature rows; thin isometric line art; a changelog row; a centred closing CTA; hairline borders; generous negative space.
