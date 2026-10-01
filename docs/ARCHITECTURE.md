# Architecture

Modellr is a static single-page app. There is no backend: build it and serve the files.

```
src/
  pages/            Route components (landing, dashboard, editor, docs, ...)
  components/       Canvas (React Flow), panels, dialogs, AI drawer, dashboard,
                    site/ (public-page shell: nav, footer, SEO), docs/
  styles/           night.css (public pages + app shell design system), tokens.css (editor tokens)
  store/            Zustand stores: schema (tables, relationships, undo via zundo), ui, history (snapshots)
  hooks/            useProjectPersistence (load + autosave), useShareLink, useUndoRedo, shortcuts, useAI
  lib/              projectStore (IndexedDB), sanitizeSchema (validation), aiClient/aiConfig/aiPrompts,
                    seo + routeMeta (per-route titles and descriptions)
  utils/
    importers/      SQL DDL and Prisma -> schema model
    exporters/      schema model -> SQL / Prisma / Drizzle / DBML / migrations / image
    autoLayout.ts   ELK layout in a Web Worker
tests/              vitest (importers, exporters, AI client, storage)
```

## Data model

`src/types/schema.ts`: `Table` -> `Field[]`, `Relationship` (field to field, with cardinality), `Note`,
`Group`, `Snapshot`. The model is plain JSON.

## Persistence

`lib/projectStore.ts` keeps projects in IndexedDB (falls back to memory when storage is blocked, and the UI
warns). `hooks/useProjectPersistence.ts` loads a project and autosaves only on real content changes,
flushing on tab hide / unload / project switch. It never saves before a successful load.

## Sharing

Stateless: the schema is compressed with lz-string into the URL hash (`/app/shared#/schema/...`,
`/embed#/schema/...`). Everything that comes from outside the app (links, imported files) goes through
`lib/sanitizeSchema.ts` before reaching the canvas.

## AI (optional, bring your own key)

`lib/aiClient.ts` talks to any OpenAI-compatible `/chat/completions` endpoint directly from the browser.
The key lives in this browser's localStorage and is only sent to the endpoint the user configured.
Model output is parsed defensively (`lib/aiPrompts.ts`) before it touches the schema.

## History

Earlier versions were a cloud product (accounts, Supabase, real-time collaboration, live DB import, an MCP
server, billing). That code was removed. It remains in git history; the last commit that contains it is
`60f5636`.

## Public site and design system

Public pages, the docs and the app shell (dashboard, templates, settings) use `styles/night.css` (class prefix `n-`).
The editor keeps its own component CSS but shares the same neutral surfaces and orange brand through `styles/tokens.css`.
Theme is the `data-theme` attribute on `<html>` (`dark` by default, saved as `sf-theme`); both style sheets key off it.
The design spec, the research behind it and the verification scripts live in `clone-workspace/modellr/`.

`npm run build` also runs `scripts/postbuild-seo.mjs`, which writes a static HTML file per public route (own title, description,
canonical), `robots.txt` and, when `SITE_URL` is set, `sitemap.xml`. Titles and descriptions come from `src/lib/routeMeta.ts`.
