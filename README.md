# Modellr

**A free, open-source database schema designer that runs entirely in your browser.** No sign-up, no server,
no tracking. Draw tables and relationships, import the SQL or Prisma schema you already have, and export
SQL, Prisma, Drizzle or DBML.

MIT licensed.

## What it does

- **Visual canvas**: tables, fields (types, PK/FK, unique, nullable, defaults, checks, comments),
  drag-to-connect relationships, notes, groups, auto-layout, search, command palette (`Ctrl/Cmd+K`),
  undo/redo, light and dark themes, canvas/split/code views.
- **Import**: SQL DDL (PostgreSQL, MySQL, SQLite, SQL Server syntax; `pg_dump` and `mysqldump` files work),
  Prisma schemas. Saved projects and backups can be re-imported as JSON from the dashboard. The previous
  schema is saved as a snapshot before a SQL/Prisma import replaces it.
- **Export**: SQL (PostgreSQL, MySQL, SQLite, SQL Server), Prisma, Drizzle ORM, DBML, JSON, PNG, SVG.
- **Snapshots and diff**: save versions of a schema, compare with a snapshot, generate migration SQL.
  Always read generated migrations before running them: a rename shows up as drop + add.
- **Share**: stateless links and iframe embeds. The schema is compressed into the URL; recipients get a
  read-only snapshot. Nothing is uploaded.
- **Optional AI assistant (bring your own key)**: generate or modify a schema from a description. Calls an
  OpenAI-compatible endpoint you choose (OpenAI, OpenRouter, or a local model such as Ollama) directly from
  your browser. Your key stays in your browser. Review AI output before using it.

## What it does not do

No accounts, cloud sync, real-time collaboration, live database connections, billing, or hosted AI. Earlier
versions had some of these as a cloud product; that code was removed (see [History](#history)).

## Your data

Projects are stored in your browser (IndexedDB). Clearing site data deletes them. Use **Backup all**
(dashboard or Settings) or per-project **Export** now and then. If your browser blocks storage the app warns
you and falls back to memory for that session.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run build      # static files in dist/
```

Self-hosting is serving `dist/` from any static host. The app uses client-side routing, so configure the
host to fall back to `index.html` (a `vercel.json` rewrite and a Netlify/Cloudflare `_redirects` file are included).
Node 22.18 or newer is needed for the build.

### Deploying and search engines

`npm run build` also writes one static HTML file per public page (own title, description, canonical link), `robots.txt`
(the editor, dashboard and embeds are disallowed) and, when you tell it where the site lives, `sitemap.xml`:

```bash
SITE_URL=https://your-domain.example npm run build
```

Without `SITE_URL` the pages still get titles and descriptions but no canonical links or sitemap. Do not add a
top-level `404.html`: on Cloudflare Pages that turns off the single-page-app fallback and breaks `/app/<id>` links.

## Design and verification

The public pages and the app shell use the "Night" design system (`src/styles/night.css`). The research behind it, the written spec,
the mockups and the verification scripts (user flows, computed-style assertions, contrast, overflow at 8 widths) are in
[clone-workspace/modellr](clone-workspace/modellr/README.md).

## Performance

Measured on a 4-vCPU container with software rendering: dragging stays at about 60 fps and a single edit
takes under 0.3 s at 1,000 tables. Initial import/render of 500+ tables still takes a few seconds. Method,
numbers and limits are in [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

## AI setup

Settings, then **Set up AI**. Pick a provider preset (OpenAI, OpenRouter, local Ollama or custom), paste a
key if the provider needs one, and use **Test connection**. Notes:

- The request includes your schema as context, and goes to the endpoint you configured.
- Some providers block direct browser calls (CORS). If a provider fails with a network error, try
  OpenRouter or a local model.
- For a local model: `ollama serve`, set the base URL to `http://localhost:11434/v1`, leave the key empty.

## Project layout

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Stack: React, TypeScript, Vite, React Flow, Zustand.

## Contributing

Issues and pull requests are welcome. Please run `npm run typecheck`, `npm test` and `npm run lint` first.
Importers and exporters have fixture-based tests in `tests/`; add a fixture when you fix a parsing bug.

## History

This repository began as a cloud product (accounts, Supabase, real-time collaboration, live DB import, an MCP
server, paid plans). It was converted to a free local-first app. The last commit that contains the backend is
[`60f5636`](https://github.com/prateesh7777/modellr/commit/60f5636).

## License

[MIT](LICENSE)
