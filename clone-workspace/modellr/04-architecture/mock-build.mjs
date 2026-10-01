// mock-build.mjs — generates the HTML mockups for every screen using the REAL stylesheet (src/styles/blueprint.css).
import fs from 'node:fs';
const OUT = new URL('./mockups/', import.meta.url).pathname;
const ROOT = '../../../../'; // mockups/ -> repo root

const head = (title, theme) => `<!doctype html><html lang="en" ${theme ? `data-theme="${theme}"` : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<link rel="stylesheet" href="${ROOT}node_modules/@fontsource-variable/fraunces/standard.css">
<link rel="stylesheet" href="${ROOT}node_modules/@fontsource-variable/fraunces/standard-italic.css">
<link rel="stylesheet" href="${ROOT}node_modules/@fontsource-variable/inter/index.css">
<link rel="stylesheet" href="${ROOT}node_modules/@fontsource/jetbrains-mono/400.css">
<link rel="stylesheet" href="${ROOT}node_modules/@fontsource/jetbrains-mono/600.css">
<link rel="stylesheet" href="${ROOT}node_modules/@fontsource/jetbrains-mono/700.css">
<link rel="stylesheet" href="${ROOT}src/styles/blueprint.css">
<style>body{margin:0}.mock-note{display:none}</style></head><body>`;

const GH = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;
const MENU = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>`;

const nav = (active = '', menuOpen = false) => `<a class="bp-skip" href="#main">Skip to content</a>
<header class="bp-nav is-scrolled"><div class="bp-wrap"><nav class="bp-nav__bar" aria-label="Main">
<a class="bp-logo" href="#"><span class="bp-logo__mark">M</span>modellr</a>
<ul class="bp-nav__links">${['Features', 'Templates', 'Docs', 'Blog'].map((l) => `<li><a class="bp-nav__link" href="#" ${active === l ? 'aria-current="page"' : ''}>${l}</a></li>`).join('')}</ul>
<span class="bp-nav__spacer"></span>
<a class="bp-gh" href="#">${GH}<span class="bp-gh__label">GitHub</span><span class="bp-gh__count">★ 1.2k</span></a>
<a class="bp-btn bp-nav__cta" href="#">Open editor →</a>
<button class="bp-nav__toggle" aria-label="Open menu" aria-expanded="${menuOpen}">${MENU}</button>
</nav></div>
<div class="bp-sheet" ${menuOpen ? '' : 'hidden'}>${['Features', 'Templates', 'Docs', 'Blog', 'About'].map((l) => `<a class="bp-sheet__link" href="#">${l}</a>`).join('')}<div class="bp-sheet__foot"><a class="bp-gh" href="#">${GH} GitHub <span class="bp-gh__count">★ 1.2k</span></a><a class="bp-btn bp-btn--lg bp-btn--block" href="#">Open editor →</a></div></div></header>`;

const footer = () => `<footer class="bp-footer"><div class="bp-wrap"><div class="bp-footer__grid">
<div><a class="bp-logo" href="#"><span class="bp-logo__mark">M</span>modellr</a><p>A free, open-source, local-first database schema designer. Runs in your browser; no account needed.</p><a class="bp-btn bp-btn--secondary" href="#">${GH} View on GitHub</a></div>
<div><h4>Product</h4><ul><li><a href="#">Features</a></li><li><a href="#">Templates</a></li><li><a href="#">Docs</a></li><li><a href="#">Open editor</a></li></ul></div>
<div><h4>Examples</h4><ul><li><a href="#">SaaS schema</a></li><li><a href="#">E-commerce schema</a></li><li><a href="#">Auth schema</a></li></ul></div>
<div><h4>Project</h4><ul><li><a href="#">About</a></li><li><a href="#">Blog</a></li><li><a href="#">Contact</a></li></ul></div>
<div><h4>Legal</h4><ul><li><a href="#">Privacy</a></li><li><a href="#">Terms</a></li></ul></div></div>
<div class="bp-footer__base"><span>MIT licensed. Your schemas stay in your browser.</span><a href="#" class="bp-link" style="font-size:12px">☕ Buy me a coffee</a></div></div></footer>`;

const page = (title, body, { active = '', menuOpen = false, theme = '' } = {}) => `${head(title, theme)}<div class="bp-root">${nav(active, menuOpen)}<main id="main">${body}</main>${footer()}</div></body></html>`;

// ── small illustrations ────────────────────────────────────────────────────────
const tbl = (x, y, name, rows, w = 112) => `<g transform="translate(${x} ${y})"><rect width="${w}" height="${30 + rows.length * 17}" fill="var(--bp-card)" stroke="var(--bp-ink)" stroke-width="2"/><rect width="${w}" height="20" fill="var(--bp-ink)"/><text x="8" y="14" fill="var(--bp-paper)" font-family="JetBrains Mono" font-size="10" font-weight="700">${name}</text>${rows.map(([n, k], i) => `<text x="8" y="${37 + i * 17}" fill="var(--bp-ink)" font-family="JetBrains Mono" font-size="9.5">${n}</text>${k ? `<text x="${w - 8}" y="${37 + i * 17}" text-anchor="end" fill="${k === 'PK' ? 'var(--bp-amber-ink)' : 'var(--bp-blue)'}" font-family="JetBrains Mono" font-size="8.5" font-weight="700">${k}</text>` : ''}`).join('')}</g>`;
const schemaSvg = (a, b, c) => `<svg class="bp-mini" viewBox="0 0 360 190" role="img" aria-label="Schema diagram"><path d="M130 62 C 170 62, 160 120, 200 120" fill="none" stroke="var(--bp-blue)" stroke-width="2"/><path d="M130 82 C 200 82, 200 40, 244 40" fill="none" stroke="var(--bp-blue)" stroke-width="2" stroke-dasharray="4 3"/>${tbl(14, 28, a[0], a[1])}${tbl(200, 90, b[0], b[1])}${tbl(244, 14, c[0], c[1], 100)}</svg>`;

// ── HOME ───────────────────────────────────────────────────────────────────────
const formatsCode = `// Generated by Modellr

generator client {
  provider = "prisma-client-js"
}

model Users {
  id         String   @id @default(uuid()) @db.Uuid
  email      String   @unique
  created_at DateTime? @default(now())
  posts      Posts[]
  @@map("users")
}`;
const sqlIn = `CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE posts (
  id serial PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL
);`;
const faq = [
  ['Is Modellr really free?', 'Yes. It is MIT-licensed open-source software with no paid plan, no ads and no account. If it saved you time you can optionally buy the author a coffee; that unlocks nothing.'],
  ['Where are my schemas stored?', 'Only in your browser (IndexedDB). Nothing is uploaded. Clearing browser data deletes them, so use Backup to keep a JSON copy.'],
  ['Does it connect to my database?', 'No. You paste a SQL dump or a Prisma schema, or start from a template. That is also why your data never leaves your device.'],
  ['What can I export?', 'SQL for PostgreSQL, MySQL, SQLite and SQL Server, plus Prisma, Drizzle, DBML, JSON, PNG and SVG. Always review generated SQL before running it.'],
  ['How does the AI assistant work?', 'Optional and bring-your-own-key. Requests go straight from your browser to the OpenAI-compatible endpoint you choose, including a local model such as Ollama.'],
];
const home = (opts = {}) => page('Modellr — free, open-source database schema designer', `
<section class="bp-hero"><div class="bp-wrap">
 <p class="bp-eyebrow">Free · open source · MIT</p>
 <h1 class="bp-display">Draw your database.<br><em>Keep it yours.</em></h1>
 <div class="bp-hero__grid"><div>
  <p class="bp-lead" style="margin-top:0">Modellr is a free database schema designer that runs entirely in your browser. Import the SQL or Prisma you already have, shape it on a canvas, export what your stack needs. No account. Nothing uploaded.</p>
  <div class="bp-actions" style="margin-top:32px"><a class="bp-btn bp-btn--lg" href="#">Open the editor →</a><a class="bp-link" href="#">★ Star on GitHub</a></div>
  <ul class="bp-facts"><li>no sign-up</li><li>7 export formats</li><li>Postgres · MySQL · SQLite · SQL Server</li></ul>
 </div><div class="bp-sheetnote"><b>SHEET 01 / 04</b><br>Subject: orders schema<br>Source: the real editor, running live<br>Storage: your browser (IndexedDB)</div></div>
 <div class="bp-frame" style="margin-top:40px"><div class="bp-frame__bar"><i></i><i></i><i></i><span class="bp-frame__label">modellr / e-commerce — live sandbox: try editing, nothing is saved</span></div>
  <div style="position:relative"><img class="bp-frame__shot" src="assets/editor-light.png" alt="The Modellr editor showing four related tables" style="display:block;width:100%">
  <svg viewBox="0 0 1000 565" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none" aria-hidden="true"><g stroke="#ff4a2b" stroke-width="2" fill="none"><path d="M236 84 L395 140"/><path d="M742 84 L668 168"/><path d="M360 316 L466 184"/></g><g fill="none" stroke="#ff4a2b" stroke-width="2"><circle cx="406" cy="149" r="13"/><circle cx="661" cy="177" r="13"/><circle cx="466" cy="177" r="7"/></g></svg>
  <span class="bp-callout" style="left:19%;top:11%">PRIMARY KEY</span><span class="bp-callout" style="right:21%;top:11%">FOREIGN KEY</span><span class="bp-callout" style="left:26%;top:55%">relationships are drawn, not typed</span></div></div>
</div></section>
<section class="bp-section"><div class="bp-wrap"><p class="bp-eyebrow">Index</p><h2 class="bp-h2">What's in the box.</h2>
 <table class="bp-spec" style="margin-top:36px"><thead><tr><th>FEATURE</th><th>WHAT IT DOES</th><th>KEY</th></tr></thead><tbody>
 <tr><td>canvas <span class="bp-badge bp-badge--pk">PK</span></td><td>Tables, typed fields, drag-to-connect relationships, notes, groups, auto-layout. Smooth to a few hundred tables.</td><td>core</td></tr>
 <tr><td>import <span class="bp-badge bp-badge--fk">FK</span></td><td>Paste a pg_dump, a mysqldump or a Prisma schema. Foreign keys, composite keys and defaults come along.</td><td>→ canvas</td></tr>
 <tr><td>export <span class="bp-badge bp-badge--fk">FK</span></td><td>SQL for four dialects, Prisma, Drizzle, DBML, JSON, PNG and SVG.</td><td>← canvas</td></tr>
 <tr><td>snapshots <span class="bp-badge bp-badge--fk">FK</span></td><td>Save versions, diff against any of them, generate migration SQL to review.</td><td>→ canvas</td></tr>
 <tr><td>share <span class="bp-badge bp-badge--fk">FK</span></td><td>The schema is compressed into the link: a read-only snapshot, or an iframe embed. No server.</td><td>← canvas</td></tr>
 <tr><td>ai <span class="bp-badge bp-badge--fk">FK</span></td><td>Optional. Bring your own key (OpenAI, OpenRouter, local Ollama). Proposals are reviewed before they touch your schema.</td><td>→ canvas</td></tr></tbody></table></div></section>
<section class="bp-section bp-section--sunken"><div class="bp-wrap"><p class="bp-eyebrow">One schema, every format</p><h2 class="bp-h2">Paste SQL. Get Prisma, Drizzle, SQL or DBML.</h2><p class="bp-lead">The panel on the right is real exporter output, generated live in your browser from the SQL on the left.</p>
 <div class="bp-formats" style="margin-top:44px"><div class="bp-panel"><div class="bp-panel__head"><span>schema.sql</span><span>input</span></div><pre class="bp-code">${sqlIn}</pre></div><div class="bp-formats__arrow" aria-hidden="true">→</div>
 <div class="bp-panel"><div class="bp-panel__head"><div class="bp-tabs" role="tablist"><button class="bp-tab" role="tab" aria-selected="true">Prisma</button><button class="bp-tab" role="tab" aria-selected="false">Drizzle</button><button class="bp-tab" role="tab" aria-selected="false">SQL</button><button class="bp-tab" role="tab" aria-selected="false">DBML</button></div><span>schema.prisma</span></div><pre class="bp-code">${formatsCode}</pre></div></div></div></section>
<section class="bp-section"><div class="bp-wrap"><p class="bp-eyebrow">How it works</p><h2 class="bp-h2">From a dump to a diagram in three steps.</h2>
 <ol class="bp-steps"><li><h3>Bring your schema</h3><p>Paste SQL or a Prisma schema, start from a template, or draw tables from scratch.</p></li><li><h3>Refine on the canvas</h3><p>Connect relationships, tidy with auto-layout, add notes, save snapshots as you go.</p></li><li><h3>Export or share</h3><p>Copy SQL, Prisma, Drizzle or DBML, save PNG/SVG, or send a read-only link.</p></li></ol></div></section>
<section class="bp-section bp-section--sunken"><div class="bp-wrap" style="max-width:900px"><p class="bp-eyebrow">FAQ</p><h2 class="bp-h2" style="margin-bottom:36px">Questions, answered plainly.</h2><div class="bp-faq">${faq.map((f, i) => `<details ${i === 0 ? 'open' : ''}><summary>${f[0]}</summary><p>${f[1]}</p></details>`).join('')}</div></div></section>
<section class="bp-section bp-cta"><div class="bp-wrap"><div class="bp-cta__box"><div><h2 class="bp-h2">Start designing. <em>It's free.</em></h2><p>Open source under the MIT license. No sign-up, no install.</p></div><div class="bp-actions"><a class="bp-btn bp-btn--lg" href="#">Open the editor →</a><a class="bp-link" href="#">View on GitHub</a></div></div></div></section>`, { menuOpen: opts.menuOpen, theme: opts.theme });

// ── FEATURES ───────────────────────────────────────────────────────────────────
const feat = [
  ['Visual canvas', 'Tables, typed fields, PK/FK, unique, nullable, defaults, checks and comments. Drag between fields to create relationships; add notes and groups; auto-layout, search and undo.', ['users', [['id', 'PK'], ['email', ''], ['org_id', 'FK']]], ['orgs', [['id', 'PK'], ['name', '']]], ['plans', [['id', 'PK'], ['tier', '']]]],
  ['Import', 'Paste SQL DDL (PostgreSQL, MySQL, SQLite, SQL Server syntax; pg_dump and mysqldump work) or a Prisma schema. Foreign keys and composite keys come along; unsupported statements are reported, not fatal.', ['orders', [['id', 'PK'], ['user_id', 'FK'], ['total', '']]], ['users', [['id', 'PK'], ['email', '']]], ['items', [['id', 'PK'], ['order_id', 'FK']]]],
  ['Export', 'SQL for four dialects, Prisma, Drizzle ORM, DBML and JSON; PNG and SVG for docs. Real output, covered by round-trip tests. Always review before running on a real database.', ['posts', [['id', 'PK'], ['author_id', 'FK']]], ['authors', [['id', 'PK'], ['name', '']]], ['tags', [['id', 'PK'], ['label', '']]]],
  ['Snapshots and diff', 'Save versions as you go, restore one, or compare the current schema with a snapshot. The diff viewer generates migration SQL with destructive-change warnings.', ['v1', [['users', ''], ['posts', '']]], ['v2', [['users', ''], ['posts', ''], ['tags', 'PK']]], ['diff', [['+ tags', ''], ['- legacy', '']]]],
  ['Share links and embeds', 'The schema is compressed into the URL. Anyone with the link sees a read-only snapshot and can save a copy; an iframe embed works the same way. No server involved.', ['link', [['/app/shared#', '']]], ['viewer', [['read-only', '']]], ['copy', [['save a copy', '']]]],
  ['Local-first storage', 'No accounts. Projects live in your browser (IndexedDB). Back everything up as one JSON file and restore it on any machine.', ['project', [['id', 'PK'], ['name', '']]], ['backup', [['json', '']]], ['restore', [['json', '']]]],
];
const features = () => page('Features — Modellr', `<section class="bp-hero"><div class="bp-wrap"><p class="bp-eyebrow">Features</p><h1 class="bp-h1">What Modellr <em>does.</em></h1><p class="bp-lead">A free, open-source, local-first schema designer. It runs entirely in your browser, with no account.</p></div></section>
<section class="bp-section--tight"><div class="bp-wrap"><div class="bp-grid-3">${feat.map((f, i) => `<article class="bp-card"><span class="bp-card__meta">0${i + 1} / ${f[0].split(' ')[0].toLowerCase()}</span>${schemaSvg(f[2], f[3], f[4])}<h3>${f[0]}</h3><p>${f[1]}</p></article>`).join('')}</div></div></section>
<section class="bp-section bp-cta"><div class="bp-wrap"><div class="bp-cta__box"><div><h2 class="bp-h2">Try it in your <em>browser.</em></h2><p>Free and open source under the MIT license. No sign-up.</p></div><div class="bp-actions"><a class="bp-btn bp-btn--lg" href="#">Open the editor →</a><a class="bp-link" href="#">View on GitHub</a></div></div></div></section>`, { active: 'Features' });

// ── TEMPLATES ──────────────────────────────────────────────────────────────────
const tpls = [['E-commerce', '4 tables · 19 fields', ['users', [['id', 'PK'], ['email', '']]], ['orders', [['id', 'PK'], ['user_id', 'FK']]], ['products', [['id', 'PK'], ['price', '']]]], ['Multi-tenant SaaS', '9 tables · 52 fields', ['orgs', [['id', 'PK'], ['name', '']]], ['members', [['org_id', 'FK'], ['user_id', 'FK']]], ['users', [['id', 'PK'], ['email', '']]]], ['Blog + CMS', '6 tables · 31 fields', ['posts', [['id', 'PK'], ['author_id', 'FK']]], ['authors', [['id', 'PK'], ['name', '']]], ['tags', [['id', 'PK'], ['label', '']]]], ['Auth & Users', '5 tables · 24 fields', ['users', [['id', 'PK'], ['email', '']]], ['sessions', [['id', 'PK'], ['user_id', 'FK']]], ['roles', [['id', 'PK'], ['name', '']]]]];
const templates = (modal = false, empty = false) => page('Templates — Modellr', `<section class="bp-hero"><div class="bp-wrap"><p class="bp-eyebrow">Templates</p><h1 class="bp-h1">Start from a <em>real</em> schema.</h1><p class="bp-lead">Four starting points. Pick one and it opens as a new project in your browser. Change anything.</p>
<div class="bp-chips" style="margin-top:32px" role="group" aria-label="Filter by category"><button class="bp-chip" aria-pressed="${!empty}">All</button><button class="bp-chip" aria-pressed="false">SaaS</button><button class="bp-chip" aria-pressed="false">Commerce</button><button class="bp-chip" aria-pressed="false">Content</button><button class="bp-chip" aria-pressed="${empty}">Auth</button></div></div></section>
<section class="bp-section--tight"><div class="bp-wrap">${empty ? `<div class="bp-empty"><h3>No templates in that category yet.</h3><p>Try another filter, or start from a blank schema and import your own SQL.</p><a class="bp-btn" href="#">Show all templates</a></div>` : `<div class="bp-grid-2">${tpls.map((t) => `<a class="bp-card" href="#">${schemaSvg(t[2], t[3], t[4])}<span class="bp-card__meta">${t[1]}</span><h3>${t[0]}</h3><div class="bp-actions"><span class="bp-btn">Use template →</span><span class="bp-link">Preview</span></div></a>`).join('')}</div>`}</div></section>
${modal ? `<div class="bp-scrim" role="dialog" aria-modal="true" aria-label="E-commerce template preview"><div class="bp-modal"><div class="bp-modal__head"><h3>E-commerce</h3><button class="bp-chip" aria-label="Close">Esc ✕</button></div><div class="bp-modal__body">${schemaSvg(tpls[0][2], tpls[0][3], tpls[0][4])}<p class="bp-text" style="margin:0">Users, orders, products and order items with foreign keys already wired. Opens as a new project you can edit.</p></div><div class="bp-modal__foot"><button class="bp-btn bp-btn--secondary">Cancel</button><button class="bp-btn">Use template →</button></div></div></div>` : ''}`, { active: 'Templates' });

// ── DOCS ───────────────────────────────────────────────────────────────────────
const docsNav = ['Getting started', 'Importing SQL and Prisma', 'Exporting', 'Snapshots and diff', 'Sharing and embeds', 'AI setup (your own key)', 'Backup and restore', 'Keyboard shortcuts', 'Self-hosting', 'What Modellr does not do'];
const docs = (open = false) => page('Docs — Modellr', `<div class="bp-wrap"><div class="bp-docs"><div><button class="bp-btn bp-btn--secondary bp-docs__toggle" aria-expanded="${open}" style="margin-bottom:12px">☰ Docs menu</button><nav class="bp-docs__nav ${open ? 'is-open' : ''}" aria-label="Docs"><h4>Guide</h4>${docsNav.slice(0, 7).map((d, i) => `<a href="#" ${i === 0 ? 'aria-current="page"' : ''}>${d}</a>`).join('')}<h4>Reference</h4>${docsNav.slice(7).map((d) => `<a href="#">${d}</a>`).join('')}</nav></div>
<article class="bp-prose"><p class="bp-eyebrow">Guide</p><h1 class="bp-h1">Getting started</h1><p class="bp-lead" style="margin-top:0">Modellr is a free schema designer that runs in your browser. This takes about a minute.</p>
<h2>1. Open the editor</h2><p>Go to <a href="#">/app</a> and choose <strong>New schema</strong>, or start from a <a href="#">template</a>. Nothing to install and no account.</p>
<h2>2. Bring your schema</h2><p>Choose <strong>Import</strong>, paste SQL or a Prisma schema, then <strong>Import schema</strong>. Your previous schema is saved as a snapshot first.</p><pre class="bp-code">CREATE TABLE posts (
  id serial PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES users(id)
);</pre>
<blockquote><p>Everything is stored in this browser. Use <strong>Backup</strong> on the dashboard to keep a JSON copy.</p></blockquote>
<h2>3. Export</h2><p>Use <strong>Export</strong> to copy SQL, Prisma, Drizzle or DBML, or save PNG/SVG. Read generated SQL before running it on a real database.</p><div class="bp-actions" style="margin-top:32px"><a class="bp-btn" href="#">Open the editor →</a><a class="bp-link" href="#">Next: Importing →</a></div></article></div></div>`, { active: 'Docs' });

// ── BLOG ───────────────────────────────────────────────────────────────────────
const posts = [['How to review migration SQL before you run it', 'A short checklist: destructive statements, NOT NULL without defaults, lock-heavy changes.', '2026-10-01 · 6 min'], ['Modelling many-to-many relationships with join tables', 'Composite keys, extra columns on the relationship, and when to promote a join table to an entity.', '2026-10-01 · 5 min'], ['Designing a multi-tenant SaaS schema', 'Tenant keys, row ownership and the indexes that keep tenant queries fast.', '2026-10-01 · 7 min'], ['Choosing primary keys: serial, uuid or ulid?', 'Trade-offs between sequential and random identifiers in real workloads.', '2026-10-01 · 5 min']];
const blog = () => page('Blog — Modellr', `<section class="bp-hero"><div class="bp-wrap"><p class="bp-eyebrow">Blog</p><h1 class="bp-h1">Notes on <em>schema design.</em></h1><p class="bp-lead">Practical, short, no hype.</p></div></section><section class="bp-section--tight"><div class="bp-wrap"><div class="bp-grid-2">${posts.map((p, i) => `<a class="bp-card" href="#"><span class="bp-card__meta">${String(i + 1).padStart(2, '0')} · ${p[2]}</span><h3>${p[0]}</h3><p>${p[1]}</p><span class="bp-link" style="align-self:flex-start">Read →</span></a>`).join('')}</div></div></section>`, { active: 'Blog' });
const post = () => page('How to review migration SQL — Modellr', `<section class="bp-hero"><div class="bp-wrap"><div class="bp-prose"><p class="bp-meta">← <a href="#">Blog</a> · 2026-10-01 · 6 min read</p><h1 class="bp-h1" style="margin-top:16px">How to review migration SQL <em>before you run it.</em></h1><p class="bp-lead">A short checklist for the five things that cause outages.</p>
<h2>1. Look for destructive statements</h2><p>Every <code>DROP TABLE</code> and <code>DROP COLUMN</code> deserves a second look. Modellr's diff viewer puts a warning line above each one.</p><pre class="bp-code">-- WARNING: destructive - drops column "posts"."legacy_id"
ALTER TABLE "posts" DROP COLUMN "legacy_id";</pre><h2>2. NOT NULL without a default</h2><p>Adding a <code>NOT NULL</code> column without a default fails on a table that already has rows.</p><div class="bp-alert" style="margin-top:24px"><span>⚠</span><span>Renames show up as drop + add. Check them by hand.</span></div>
<div class="bp-actions" style="margin-top:40px"><a class="bp-btn" href="#">Open the editor →</a><a class="bp-link" href="#">More posts</a></div></div></div></section>`, { active: 'Blog' });

// ── USE CASE / ABOUT / CONTACT / PRIVACY / 404 ────────────────────────────────
const usecase = () => page('SaaS database schema example — Modellr', `<section class="bp-hero"><div class="bp-wrap"><p class="bp-eyebrow">Example · SaaS</p><h1 class="bp-h1">A multi-tenant SaaS <em>database schema.</em></h1><p class="bp-lead">Organisations, members, users and plans, with the foreign keys already wired. Open it, change it, export it.</p><div class="bp-actions" style="margin-top:28px"><a class="bp-btn bp-btn--lg" href="#">Use this template →</a><a class="bp-link" href="#">All templates</a></div></div></section>
<section class="bp-section--tight"><div class="bp-wrap bp-grid-2"><div>${schemaSvg(['orgs', [['id', 'PK'], ['name', ''], ['plan_id', 'FK']]], ['members', [['org_id', 'FK'], ['user_id', 'FK'], ['role', '']]], ['users', [['id', 'PK'], ['email', '']]])}</div><div class="bp-prose"><h2 style="margin-top:0">Why tenant keys matter</h2><p>Every tenant-owned table carries an <code>org_id</code>, and every query filters on it. Index it first.</p><pre class="bp-code">CREATE TABLE members (
  org_id  uuid REFERENCES orgs(id),
  user_id uuid REFERENCES users(id),
  role    text NOT NULL,
  PRIMARY KEY (org_id, user_id)
);</pre></div></div></section>`);
const about = () => page('About — Modellr', `<section class="bp-hero"><div class="bp-wrap"><div class="bp-prose"><p class="bp-eyebrow">About</p><h1 class="bp-h1">Why this <em>exists.</em></h1><p class="bp-lead">Designing a database should not require an account, an upload or a subscription.</p><h2>Open source, MIT</h2><p>Modellr is built by one developer (<a href="#">@prateesh7777</a>) and developed in the open. The whole app is static files you can host yourself.</p><h2>How it is built</h2><p>React, TypeScript, Vite, React Flow and Zustand. Importers and exporters are covered by fixture-based tests, and performance numbers are published, not promised.</p><div class="bp-actions" style="margin-top:32px"><a class="bp-btn" href="#">View on GitHub →</a><a class="bp-link" href="#">Read the docs</a></div></div></div></section>`);
const contact = () => page('Contact — Modellr', `<section class="bp-hero"><div class="bp-wrap"><p class="bp-eyebrow">Contact</p><h1 class="bp-h1">Found a bug? <em>Tell us.</em></h1><p class="bp-lead">Everything happens in public, on GitHub.</p></div></section><section class="bp-section--tight"><div class="bp-wrap bp-grid-3"><a class="bp-card" href="#"><span class="bp-card__meta">01 / bug</span><h3>Report a bug</h3><p>Include the SQL or steps that trigger it. A screenshot helps.</p><span class="bp-link" style="align-self:flex-start">Open an issue →</span></a><a class="bp-card" href="#"><span class="bp-card__meta">02 / idea</span><h3>Suggest a feature</h3><p>Describe the problem first; the solution can come second.</p><span class="bp-link" style="align-self:flex-start">Start a discussion →</span></a><a class="bp-card" href="#"><span class="bp-card__meta">03 / support</span><h3>Support the project</h3><p>Optional. It does not unlock anything; it just helps keep it maintained.</p><span class="bp-link" style="align-self:flex-start">☕ Buy me a coffee →</span></a></div></section>`);
const privacy = () => page('Privacy — Modellr', `<section class="bp-hero"><div class="bp-wrap"><div class="bp-prose"><p class="bp-eyebrow">Legal</p><h1 class="bp-h1">Privacy <em>policy.</em></h1><p class="bp-meta">Last updated 2026-10-01</p><h2>1. The short version</h2><p>Modellr is a static, local-first web app. There are no accounts. The app does not collect personal data, and your schemas stay in your browser.</p><h2>2. Your schemas</h2><p>Projects, snapshots and settings are stored in your browser. They are not uploaded to any server operated by this project.</p><h2>3. Third parties</h2><p>The site header may request the repository's star count from api.github.com. Fonts are served from this site.</p></div></div></section>`);
const notFound = () => page('Page not found — Modellr', `<section class="bp-section--tight"><div class="bp-wrap"><div class="bp-404"><div class="bp-404__code">4<span>0</span>4</div><h1 class="bp-h2">This table <em>doesn't exist.</em></h1><p class="bp-lead" style="margin:0">The page you asked for isn't here. Maybe the link is old, or the address has a typo.</p><div class="bp-actions"><a class="bp-btn bp-btn--lg" href="#">Go home →</a><a class="bp-link" href="#">Open the editor</a></div></div></div></section>`);

// ── APP SHELL: dashboard / settings ───────────────────────────────────────────
const rail = (active) => `<aside class="bp-rail"><a class="bp-logo" href="#"><span class="bp-logo__mark">M</span>modellr</a><nav class="bp-rail__nav" aria-label="App">${[['Projects', '▦'], ['Templates', '◫'], ['Settings', '⚙'], ['Docs', '?']].map(([l, i]) => `<a href="#" ${l === active ? 'aria-current="page"' : ''}><span aria-hidden="true">${i}</span>${l}</a>`).join('')}</nav><div class="bp-rail__foot"><a href="#"><span aria-hidden="true">☕</span>Support</a><a href="#"><span aria-hidden="true">↗</span>GitHub</a></div></aside>`;
const tabbar = (active) => `<nav class="bp-tabbar" aria-label="App">${[['Projects', '▦'], ['Templates', '◫'], ['Settings', '⚙'], ['Docs', '?']].map(([l, i]) => `<a href="#" ${l === active ? 'aria-current="page"' : ''}><span aria-hidden="true">${i}</span>${l}</a>`).join('')}</nav>`;
const shell = (title, active, body) => `${head(title)}<div class="bp-root"><a class="bp-skip" href="#main">Skip to content</a><div class="bp-app">${rail(active)}<main id="main" class="bp-appmain">${body}</main></div>${tabbar(active)}</div></body></html>`;
const proj = (name, meta, a, b, c) => `<article class="bp-card bp-project"><div class="bp-project__thumb">${schemaSvg(a, b, c).replace('class="bp-mini"', 'style="width:70%;border:0;background:none"')}</div><div class="bp-project__body"><h3>${name}</h3><span class="bp-card__meta">${meta}</span><div class="bp-project__actions"><a class="bp-btn bp-btn--secondary" href="#" style="min-height:36px;padding:0 12px">Open</a><button class="bp-chip">Copy</button><button class="bp-chip">Export</button><button class="bp-chip" style="color:var(--bp-red-text)">Delete</button></div></div></article>`;
const dashboard = (state = 'full') => shell('Projects — Modellr', 'Projects', `<div class="bp-appbar"><div><p class="bp-eyebrow">Projects</p><h1 class="bp-h1" style="font-size:clamp(2rem,4vw,3rem)">My <em>projects.</em></h1><p class="bp-text" style="margin:8px 0 0">Everything stays in this browser.</p></div><div class="bp-appbar__tools"><div class="bp-search"><input class="bp-input" placeholder="Search projects" aria-label="Search projects"></div><button class="bp-btn bp-btn--secondary">Import JSON</button><button class="bp-btn bp-btn--secondary">Backup all</button><button class="bp-btn">+ New schema</button></div></div>
${state === 'blocked' ? `<div class="bp-alert" style="margin-bottom:24px"><span>⚠</span><span>Your browser is blocking local storage. Projects will be lost when you close this tab. Use Export to keep your work.</span></div>` : ''}
${state === 'empty' ? `<div class="bp-empty"><h3>No projects yet.</h3><p>Start from a blank schema, a template, or paste the SQL you already have. Everything you make is saved in this browser only.</p><div class="bp-actions"><button class="bp-btn">+ New schema</button><a class="bp-link" href="#">Browse templates</a></div></div><div class="bp-chips" style="margin-top:32px">${['E-commerce', 'Multi-tenant SaaS', 'Blog + CMS', 'Auth & Users'].map((t) => `<button class="bp-chip">${t}</button>`).join('')}</div>` : `<div class="bp-stats"><div class="bp-stat"><span class="bp-caption">SCHEMAS</span><b>3</b></div><div class="bp-stat"><span class="bp-caption">TOTAL TABLES</span><b>17</b></div><div class="bp-stat"><span class="bp-caption">LAST ACTIVITY</span><b>2h ago</b></div></div>
<div class="bp-cards-auto">${proj('Shop backend', '4 tables · edited 2h ago', ['users', [['id', 'PK'], ['email', '']]], ['orders', [['id', 'PK'], ['user_id', 'FK']]], ['items', [['id', 'PK'], ['order_id', 'FK']]])}${proj('Blog + CMS', '6 tables · edited yesterday', ['posts', [['id', 'PK'], ['author_id', 'FK']]], ['authors', [['id', 'PK'], ['name', '']]], ['tags', [['id', 'PK'], ['label', '']]])}${proj('Auth service', '7 tables · edited 3 days ago', ['users', [['id', 'PK'], ['email', '']]], ['sessions', [['id', 'PK'], ['user_id', 'FK']]], ['roles', [['id', 'PK'], ['name', '']]])}<a class="bp-empty" href="#" style="text-decoration:none;color:inherit;align-content:center"><h3>+ New schema</h3><p>Start from scratch</p></a></div>`}`);
const settings = (configured = false) => shell('Settings — Modellr', 'Settings', `<div class="bp-appbar"><div><p class="bp-eyebrow">Settings</p><h1 class="bp-h1" style="font-size:clamp(2rem,4vw,3rem)">Your <em>settings.</em></h1><p class="bp-text" style="margin:8px 0 0">Stored in this browser only.</p></div></div>
<div class="bp-cards-fit"><section class="bp-card"><span class="bp-card__meta">01 / ai</span><h3>AI assistant (your own key)</h3><p>Optional. Requests go from your browser straight to the provider you choose, including a local model such as Ollama.</p><p style="margin:4px 0"><span class="bp-caption">STATUS</span> &nbsp;<span class="bp-badge ${configured ? 'bp-badge--pk' : 'bp-badge--fk'}">${configured ? 'CONFIGURED' : 'NOT CONFIGURED'}</span></p><div class="bp-actions"><button class="bp-btn">${configured ? 'Edit AI settings' : 'Set up AI'}</button>${configured ? '<button class="bp-btn bp-btn--secondary">Remove key</button>' : ''}</div></section>
<section class="bp-card"><span class="bp-card__meta">02 / data</span><h3>Your data</h3><p>Schemas live in your browser's IndexedDB. Clearing site data deletes them, so keep a backup.</p><div class="bp-actions"><button class="bp-btn bp-btn--secondary">Download backup</button><button class="bp-btn bp-btn--secondary">Restore from file</button><button class="bp-btn bp-btn--danger">Delete all data</button></div></section>
<section class="bp-card"><span class="bp-card__meta">03 / about</span><h3>About</h3><p>Modellr is free, open-source software (MIT). Source, issues and contributions on GitHub.</p><a class="bp-link" style="align-self:flex-start" href="#">github.com/prateesh7777/modellr ↗</a></section></div>`);

// ── EDITOR CHROME: before / after ─────────────────────────────────────────────
const editorChrome = () => `${head('Editor chrome — before/after')}<div class="bp-root" style="padding:32px"><div class="bp-wrap" style="max-width:1280px"><p class="bp-eyebrow">Editor chrome fixes</p><h1 class="bp-h2">Same editor, <em>no clipped controls.</em></h1>
<div class="bp-grid-2" style="margin-top:32px"><div><p class="bp-caption">BEFORE (embedded, 1180px wide)</p><div class="bp-frame"><div style="background:#f6f5f2;padding:10px 12px;font-family:system-ui;font-size:12px;display:flex;gap:10px;align-items:center;border-bottom:1px solid #ccc"><span>☰ ⌂ ↶ ↷</span><b style="width:14px;overflow:hidden">Untitled schema</b><span style="border:1px solid #ccc;padding:4px 8px;width:92px;line-height:1.1">Search commands…</span><span>AI</span><span style="margin-left:auto">PostgreSQL ▾ + Import Diff Share Export</span></div><div style="height:120px;background:#ece9e2;position:relative"><div style="position:absolute;right:8px;bottom:8px;width:120px;height:80px;background:#fff;border:1px solid #bbb;font-size:10px;padding:4px">minimap covers the table</div></div></div><ul class="bp-facts" style="flex-direction:column"><li>project name collapses to “U”</li><li>search label wraps onto two lines</li><li>minimap sits on top of tables</li><li>zoom buttons almost invisible</li></ul></div>
<div><p class="bp-caption">AFTER (already fixed in the app)</p><div class="bp-frame"><img src="assets/editor-light.png" alt="Fixed editor top bar" style="display:block;width:100%"></div><ul class="bp-facts" style="flex-direction:column"><li>responsive rules now follow the editor's own width (container queries)</li><li>project name keeps a readable minimum and ellipsizes</li><li>search label never wraps; actions collapse to icons</li><li>minimap smaller, hidden below 960px; controls readable</li></ul></div></div></div></div></body></html>`;

const files = {
  'home': home(), 'home-menu': home({ menuOpen: true }), 'home-dark': home({ theme: 'dark' }),
  'features': features(), 'templates': templates(), 'templates-preview': templates(true), 'templates-empty': templates(false, true),
  'docs': docs(), 'docs-menu': docs(true), 'blog': blog(), 'blog-post': post(), 'use-case': usecase(), 'about': about(), 'contact': contact(), 'privacy': privacy(), '404': notFound(),
  'dashboard': dashboard(), 'dashboard-empty': dashboard('empty'), 'dashboard-blocked': dashboard('blocked'), 'settings': settings(), 'settings-configured': settings(true), 'editor-chrome': editorChrome(),
};
fs.mkdirSync(OUT, { recursive: true });
for (const [n, html] of Object.entries(files)) fs.writeFileSync(`${OUT}${n}.html`, html);
console.log('wrote', Object.keys(files).length, 'mockups');
