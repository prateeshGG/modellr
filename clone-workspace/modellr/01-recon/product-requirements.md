# Stage 1 — Product understanding (from the repository, not assumptions)

## What the product is
Modellr is a free, open-source (MIT), local-first database schema designer. It is a static single-page app:
no backend, no accounts, no billing. Projects live in the browser's IndexedDB.

## Problem it solves
Developers need to see and reshape a database schema (tables, columns, relationships) and move it between
formats (SQL dialects, Prisma, Drizzle, DBML) without signing up for a SaaS or uploading their schema.

## Users and jobs
| User | Job to be done | Evidence in the product |
|---|---|---|
| Full-stack / backend developer | Turn an existing `pg_dump`/Prisma schema into a diagram, edit it, export migrations | SQL + Prisma importers, exporters, diff viewer |
| Indie hacker / student | Sketch a schema from scratch or from a template, share it | Templates, share links, embeds |
| Tech lead / reviewer | Review what a schema change does | Snapshots + diff + migration SQL |
| Privacy-conscious team | Keep schema off third-party servers | Local-first storage, no uploads |
| Maintainer / contributor | Understand, self-host, extend | MIT license, docs, tests |

## What users can do (actions that exist today)
Create/rename/duplicate/delete/export/import projects; draw tables, fields, relationships, notes, groups;
auto-layout; search; command palette; undo/redo; import SQL/Prisma/JSON; export SQL (4 dialects)/Prisma/Drizzle/DBML/JSON/PNG/SVG;
snapshots + diff + migration SQL; stateless share link + iframe embed; optional bring-your-own-key AI; backup/restore; light/dark.

## Content the public site needs (all already exist as copy in `src/pages` and `src/components/docs`)
Value proposition, feature explanations, real export samples, FAQ, docs articles, blog posts (4), templates (4), use-case pages (3),
about, contact (GitHub issues), privacy, terms.

## Constraints
- Static hosting only; no server, no analytics, fonts must be self-hosted (privacy page promises minimal third parties).
- No domain yet (no canonical URLs / sitemap until `VITE_SITE_URL` is set).
- Solo maintainer: the design system must be small, systematic and cheap to maintain.
- Existing editor is functional; known chrome layout defects (see IA doc, "Editor chrome fixes").
- Live reference inspection limited by egress policy (see 00-config.json).
