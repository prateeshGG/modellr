// mock-build2.mjs — "Night" mockups, rendered with the REAL stylesheet src/styles/night.css.
import fs from 'node:fs';
const OUT = new URL('./mockups-v2/', import.meta.url).pathname;
const ROOT = '../../../../';

const head = (title) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<link rel="stylesheet" href="${ROOT}node_modules/@fontsource-variable/geist/index.css">
<link rel="stylesheet" href="${ROOT}node_modules/@fontsource-variable/geist-mono/index.css">
<link rel="stylesheet" href="${ROOT}src/styles/night.css">
<style>body{margin:0;background:#08090a}body.light{background:#fbfbfa}</style></head>`;

const GH = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>`;
const MENU = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg>`;
const MARK = `<svg class="n-logo__mark" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="1.5" y="1.5" width="9" height="9" rx="2.6" fill="currentColor"/><rect x="13.5" y="13.5" width="9" height="9" rx="2.6" stroke="currentColor" stroke-width="1.8"/><path d="M10.5 6H14a3 3 0 0 1 3 3v4.5" stroke="var(--n-accent)" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const ico = (d) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  grid: ico('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  tpl: ico('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>'),
  gear: ico('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'),
  book: ico('<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M4 16a4 4 0 0 1 4-4h12"/>'),
  coffee: ico('<path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M7 2v3M11 2v3"/>'),
  plus: ico('<path d="M12 5v14M5 12h14"/>'),
  x: ico('<path d="M6 6l12 12M18 6L6 18"/>'),
};

const nav = (active = '', menuOpen = false) => `<a class="n-skip" href="#main">Skip to content</a>
<header class="n-nav is-scrolled"><div class="n-wrap"><nav class="n-nav__bar" aria-label="Main">
<a class="n-logo" href="#">${MARK}modellr</a>
<ul class="n-nav__links">${['Features', 'Templates', 'Docs', 'Blog'].map((l) => `<li><a class="n-nav__link" href="#" ${active === l ? 'aria-current="page"' : ''}>${l}</a></li>`).join('')}</ul>
<span class="n-nav__spacer"></span>
<a class="n-gh" href="#">${GH}<span class="n-gh__label">Star</span><span class="n-gh__count">★ 1.2k</span></a>
<a class="n-btn n-nav__cta" href="#">Open editor</a>
<button class="n-nav__toggle" aria-label="${menuOpen ? 'Close' : 'Open'} menu" aria-expanded="${menuOpen}">${menuOpen ? I.x : MENU}</button>
</nav></div>
<div class="n-sheet" ${menuOpen ? '' : 'hidden'}>${['Features', 'Templates', 'Docs', 'Blog', 'About'].map((l) => `<a class="n-sheet__link" href="#">${l}</a>`).join('')}<div class="n-sheet__foot"><a class="n-btn n-btn--lg n-btn--block" href="#">Open editor</a><a class="n-btn n-btn--secondary n-btn--lg n-btn--block" href="#">${GH} Star on GitHub · 1.2k</a></div></div></header>`;

const footer = () => `<footer class="n-footer"><div class="n-wrap"><div class="n-footer__grid">
<div><a class="n-logo" href="#">${MARK}modellr</a><p>A free, open-source, local-first database schema designer. Runs in your browser; no account needed.</p><a class="n-btn n-btn--secondary n-btn--sm" href="#">${GH} GitHub</a></div>
<div><h4>Product</h4><ul><li><a href="#">Features</a></li><li><a href="#">Templates</a></li><li><a href="#">Docs</a></li><li><a href="#">Open editor</a></li></ul></div>
<div><h4>Examples</h4><ul><li><a href="#">SaaS schema</a></li><li><a href="#">E-commerce schema</a></li><li><a href="#">Auth schema</a></li></ul></div>
<div><h4>Project</h4><ul><li><a href="#">About</a></li><li><a href="#">Blog</a></li><li><a href="#">Contact</a></li><li><a href="#">Buy me a coffee</a></li></ul></div>
<div><h4>Legal</h4><ul><li><a href="#">Privacy</a></li><li><a href="#">Terms</a></li><li><a href="#">MIT license</a></li></ul></div></div>
<div class="n-footer__base"><span>MIT licensed. Your schemas stay in your browser.</span><span>© Modellr</span></div></div></footer>`;

const page = (title, body, { active = '', menuOpen = false, light = false } = {}) => `${head(title)}<body class="${light ? 'light' : ''}"><div class="n-root" ${light ? 'data-n-theme="light"' : ''}>${nav(active, menuOpen)}<main id="main">${body}</main>${footer()}</div></body></html>`;

// ── isometric line art ─────────────────────────────────────────────────────────
const plate = (cx, cy, w, h, t = 8, extra = '') => `<g ${extra}><path d="M${cx} ${cy - h}L${cx + w} ${cy}L${cx} ${cy + h}L${cx - w} ${cy}Z"/><path d="M${cx - w} ${cy}v${t}l${w} ${h}l${w} -${h}v-${t}M${cx} ${cy + h}v${t}"/></g>`;
const cube = (cx, cy, s) => `<path d="M${cx} ${cy - s}L${cx + s * 0.87} ${cy - s / 2}V${cy + s / 2}L${cx} ${cy + s}L${cx - s * 0.87} ${cy + s / 2}V${cy - s / 2}Z M${cx} ${cy}V${cy + s}M${cx} ${cy}L${cx - s * 0.87} ${cy - s / 2}M${cx} ${cy}L${cx + s * 0.87} ${cy - s / 2}"/>`;
const artStack = () => `<svg viewBox="0 0 320 200" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round" role="img" aria-label="Stacked layers drawing"><g opacity=".9">${plate(160, 128, 78, 39, 8)}${plate(160, 100, 78, 39, 8)}${plate(160, 72, 78, 39, 8)}</g><path d="M138 60 L160 71 L182 60 M160 71 V112" stroke="var(--n-accent)" stroke-width="1.5"/><circle cx="160" cy="71" r="3" fill="var(--n-accent)" stroke="none"/></svg>`;
const artCubes = () => `<svg viewBox="0 0 320 200" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round" role="img" aria-label="Linked cubes drawing"><g>${cube(110, 118, 34)}${cube(190, 92, 34)}${cube(214, 150, 30)}${cube(104, 62, 22)}</g><path d="M128 100 L172 108 M196 120 L206 128 M120 76 L170 86" stroke="var(--n-accent)" stroke-width="1.5" stroke-dasharray="3 3"/></svg>`;
const artBars = () => { const cells = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = 160 + (c - r) * 34, y = 60 + (c + r) * 17, h = 6 + ((r * 7 + c * 5) % 5) * 7; cells.push(`<path d="M${x} ${y - h - 16}L${x + 30} ${y - h}L${x} ${y - h + 16}L${x - 30} ${y - h}Z M${x - 30} ${y - h}V${y}L${x} ${y + 16}L${x + 30} ${y}V${y - h}M${x} ${y + 16}V${y - h + 16}" ${r === 1 && c === 2 ? 'stroke="var(--n-accent)" stroke-width="1.5"' : ''}/>`); } return `<svg viewBox="0 0 320 200" fill="none" stroke="currentColor" stroke-width=".9" stroke-linejoin="round" role="img" aria-label="Isometric bars drawing"><g opacity=".85">${cells.join('')}</g></svg>`; };

// ── mini schema (cards/thumbs) ─────────────────────────────────────────────────
const tbl = (x, y, name, rows, w = 112) => `<g transform="translate(${x} ${y})"><rect width="${w}" height="${30 + rows.length * 17}" rx="6" fill="var(--n-surface-2)" stroke="var(--n-line-3)"/><path d="M0 22H${w}" stroke="var(--n-line-2)"/><text x="9" y="15" fill="var(--n-text)" font-family="Geist Mono Variable, monospace" font-size="10" font-weight="600">${name}</text>${rows.map(([n, k], i) => `<text x="9" y="${39 + i * 17}" fill="var(--n-text-2)" font-family="Geist Mono Variable, monospace" font-size="9.5">${n}</text>${k ? `<text x="${w - 9}" y="${39 + i * 17}" text-anchor="end" fill="${k === 'PK' ? 'var(--n-amber)' : 'var(--n-blue)'}" font-family="Geist Mono Variable, monospace" font-size="8.5" font-weight="600">${k}</text>` : ''}`).join('')}</g>`;
const schemaSvg = (a, b, c, attrs = '') => `<svg viewBox="0 0 360 190" role="img" aria-label="Schema diagram" ${attrs}><path d="M126 62 C 170 62, 160 124, 200 124" fill="none" stroke="var(--n-accent)" stroke-width="1.5"/><path d="M126 84 C 200 84, 200 40, 244 40" fill="none" stroke="var(--n-text-3)" stroke-width="1.2" stroke-dasharray="4 3"/>${tbl(14, 28, a[0], a[1])}${tbl(200, 92, b[0], b[1])}${tbl(244, 14, c[0], c[1], 100)}</svg>`;

// ── HOME ───────────────────────────────────────────────────────────────────────
const prismaCode = `<span class="c">// Generated by Modellr</span>
<span class="k">generator</span> client {
  provider = <span class="s">"prisma-client-js"</span>
}

<span class="k">model</span> <span class="t">User</span> {
  id         <span class="t">String</span>   <span class="k">@id</span> <span class="k">@default</span>(cuid())
  email      <span class="t">String</span>   <span class="k">@unique</span>
  created_at <span class="t">DateTime</span> <span class="k">@default</span>(now())
  posts      <span class="t">Post</span>[]
}`;
const sqlCode = `<span class="k">CREATE TABLE</span> users (
  id <span class="t">uuid</span> <span class="k">PRIMARY KEY</span>,
  email <span class="t">text</span> <span class="k">NOT NULL UNIQUE</span>,
  created_at <span class="t">timestamptz</span> <span class="k">DEFAULT</span> now()
);

<span class="k">CREATE TABLE</span> posts (
  id <span class="t">serial</span> <span class="k">PRIMARY KEY</span>,
  author_id <span class="t">uuid</span> <span class="k">NOT NULL REFERENCES</span> users(id),
  title <span class="t">text</span> <span class="k">NOT NULL</span>
);`;
const faq = [
  ['Is Modellr really free?', 'Yes. It is MIT-licensed open-source software with no paid plan, no ads and no account. If it saved you time you can optionally buy the author a coffee; that unlocks nothing.'],
  ['Where are my schemas stored?', 'In your browser (IndexedDB). Nothing is uploaded. Clearing site data deletes them, so use Backup now and then.'],
  ['Does it connect to my database?', 'No. It works from SQL or Prisma text you paste in, and exports text. It never touches a live database.'],
  ['What can I export?', 'SQL for PostgreSQL, MySQL, SQLite and SQL Server, plus Prisma, Drizzle, DBML, JSON, PNG and SVG.'],
  ['How does the AI assistant work?', 'Optional and bring-your-own-key. Your browser calls the provider you choose (OpenAI, OpenRouter or a local Ollama) directly. Proposals are reviewed before they touch your schema.'],
];
const shotHero = (img) => `<div class="n-shot" style="margin-top:72px"><div class="n-shot__glow"></div><div class="n-shot__frame"><div class="n-shot__bar"><span class="n-shot__dots"><i></i><i></i><i></i></span><span>modellr / e-commerce — live sandbox in the real editor</span></div>
<div class="n-shot__stage"><img class="n-shot__img n-shot__img--wide" src="mockups-v2/assets/${img}" alt="The Modellr editor showing four linked tables" width="2360" height="1334">
<svg class="n-shot__rings" viewBox="0 0 2000 1131" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none" aria-hidden="true"><g fill="none" stroke="var(--n-accent)" stroke-width="3"><circle cx="815" cy="299" r="26"/><circle cx="1322" cy="353" r="26"/><path d="M752 168 L752 190 L800 280"/><path d="M1420 168 L1420 190 L1340 335"/></g></svg>
<span class="n-callout" style="left:27.5%;top:9.5%">Primary key</span><span class="n-callout" style="left:62%;top:9.5%">Foreign key — draws the line</span></div></div></div>`;

const home = ({ light = false, menuOpen = false } = {}) => page('Modellr — free, local-first database schema designer', `
<section class="n-hero"><div class="n-dots"></div><div class="n-wrap">
<div class="n-hero__grid"><div class="n-hero__copy"><span class="n-eyebrow">Free · open source · MIT</span>
<h1 class="n-h1">The database designer that never leaves your browser.</h1>
<p class="n-lead">Draw tables and relationships, import the SQL or Prisma you already have, and export what your stack needs. No account. Nothing uploaded.</p>
<div class="n-hero__actions"><a class="n-btn n-btn--lg" href="#">Open the editor</a><a class="n-btn n-btn--secondary n-btn--lg" href="#">${GH} Star on GitHub</a></div></div>
<ul class="n-hero__meta"><li>No sign-up, no server</li><li>PostgreSQL · MySQL · SQLite · SQL Server</li><li>SQL, Prisma, Drizzle, DBML, PNG, SVG</li><li>Smooth at 1,000 tables</li></ul></div>
${shotHero(light ? 'editor-light.png' : 'editor-dark.png')}</div></section>

<section class="n-works"><div class="n-wrap"><p class="n-works__label">Imports and exports the formats you already use</p><div class="n-works__row">${['PostgreSQL', 'MySQL', 'SQLite', 'SQL Server', 'Prisma', 'Drizzle', 'DBML'].map((x) => `<span class="n-works__item">${x}</span>`).join('')}</div></div></section>

<section class="n-section"><div class="n-wrap"><p class="n-statement">A schema tool that stays out of your way. <span>Modellr runs entirely in your browser: your tables, relationships and snapshots live in IndexedDB on your machine. No account, no server, nothing to sync.</span></p>
<div class="n-trio"><div><div class="n-trio__art">${artStack()}</div><h3 class="n-h4">Local-first by design</h3><p class="n-small">Projects are stored in your browser. Back everything up as one JSON file and restore it on any machine.</p></div>
<div><div class="n-trio__art">${artCubes()}</div><h3 class="n-h4">Real formats, tested</h3><p class="n-small">Importers and exporters are covered by round-trip tests, so what you paste in is what comes back out.</p></div>
<div><div class="n-trio__art">${artBars()}</div><h3 class="n-h4">Built for big schemas</h3><p class="n-small">Virtualised canvas and a layout worker keep dragging near 60 fps at a thousand tables.</p></div></div></div></section>

<section class="n-section n-section--tight"><div class="n-wrap"><div class="n-feature__head"><h2 class="n-h2">Import what you have.<br>Export what you ship.</h2><div class="n-feature__copy"><p class="n-lead" style="font-size:1rem">Paste a <span class="n-mono" style="font-size:.9em">pg_dump</span>, a <span class="n-mono" style="font-size:.9em">mysqldump</span> or a Prisma schema and get a diagram. Change it on the canvas, then copy SQL, Prisma, Drizzle or DBML. Generated live from the schema in the editor.</p><a class="n-arrow" href="#">Read the import docs</a></div></div>
<div class="n-formats"><div class="n-panel"><div class="n-panel__head"><span>schema.sql</span><span>input</span></div><pre class="n-code">${sqlCode}</pre></div><div class="n-formats__arrow" aria-hidden="true">→</div><div class="n-panel"><div class="n-panel__head"><div class="n-tabs" role="tablist"><button class="n-tab" role="tab" aria-selected="true">Prisma</button><button class="n-tab" role="tab" aria-selected="false">Drizzle</button><button class="n-tab" role="tab" aria-selected="false">SQL</button><button class="n-tab" role="tab" aria-selected="false">DBML</button></div><span>schema.prisma</span></div><pre class="n-code">${prismaCode}</pre></div></div></div></section>

<section class="n-section n-section--tight"><div class="n-wrap"><div class="n-feature__head"><h2 class="n-h2">Snapshots, diff<br>and share links.</h2><div class="n-feature__copy"><p class="n-lead" style="font-size:1rem">Save versions as you go, compare against any of them and generate migration SQL with destructive-change warnings. Share a read-only link that carries the whole schema in the URL.</p><a class="n-arrow" href="#">See all features</a></div></div>
<div class="n-bento"><article class="n-card span-3"><div class="n-card__art">${schemaSvg(['v1', [['users', ''], ['posts', '']]], ['v2', [['users', ''], ['posts', ''], ['tags', 'PK']]], ['diff', [['+ tags', ''], ['- legacy', '']]])}</div><h3 class="n-h4">Snapshots and diff</h3><p class="n-small">Restore any version, or diff it against the current schema. Renames show as drop + add, so read migrations before running them.</p></article>
<article class="n-card span-3"><div class="n-card__art">${schemaSvg(['link', [['/app/shared#', '']]], ['viewer', [['read-only', '']]], ['copy', [['save a copy', '']]])}</div><h3 class="n-h4">Stateless share links</h3><p class="n-small">The schema is compressed into the URL. Nothing is uploaded; recipients get a read-only snapshot they can save as their own.</p></article>
<article class="n-card span-2"><span class="n-card__meta">AI · optional</span><h3 class="n-h4">Bring your own key</h3><p class="n-small">OpenAI, OpenRouter or a local Ollama, called straight from your browser.</p></article>
<article class="n-card span-2"><span class="n-card__meta">Export</span><h3 class="n-h4">PNG and SVG for docs</h3><p class="n-small">Drop the diagram into a README or a design doc.</p></article>
<article class="n-card span-2"><span class="n-card__meta">⌘K</span><h3 class="n-h4">Command palette</h3><p class="n-small">Search tables, jump anywhere, run any action from the keyboard.</p></article></div></div></section>

<section class="n-section n-section--tight"><div class="n-wrap"><h2 class="n-h2">Changelog</h2>
<div class="n-changelog"><div class="n-changelog__item"><span class="n-card__meta">Oct 01</span><h3 class="n-h4">Free and local-first</h3><p class="n-small">Accounts, cloud sync and billing removed. Everything runs in the browser under the MIT license.</p></div><div class="n-changelog__item"><span class="n-card__meta">Oct 01</span><h3 class="n-h4">New importers and exporters</h3><p class="n-small">SQL and Prisma importers rewritten; SQL, Prisma, Drizzle and DBML exporters covered by round-trip tests.</p></div><div class="n-changelog__item"><span class="n-card__meta">Oct 01</span><h3 class="n-h4">Bring-your-own-key AI</h3><p class="n-small">Browser-direct client for OpenAI-compatible endpoints, including local models.</p></div><div class="n-changelog__item"><span class="n-card__meta">Oct 01</span><h3 class="n-h4">1,000-table performance</h3><p class="n-small">Selector-based store, virtualised rendering and a layout worker.</p></div></div>
<div class="n-oss"><div><b>MIT</b><span class="n-small">License. Fork it, host it, change it.</span></div><div><b>0</b><span class="n-small">Accounts, servers or trackers.</span></div><div><b>1.2k</b><span class="n-small">GitHub stars (live count in the app).</span></div></div></div></section>

<section class="n-section n-section--tight"><div class="n-wrap"><h2 class="n-h2">Questions, answered plainly.</h2><div class="n-faq">${faq.map((f, i) => `<details ${i === 0 ? 'open' : ''}><summary>${f[0]}</summary><p>${f[1]}</p></details>`).join('')}</div></div></section>

<section class="n-section n-cta"><div class="n-wrap"><h2 class="n-h1">Draw it. Export it.<br>Keep it.</h2><p class="n-lead">Free and open source. No sign-up, no install.</p><div class="n-cta__actions"><a class="n-btn n-btn--lg" href="#">Open the editor</a><a class="n-btn n-btn--secondary n-btn--lg" href="#">${GH} Star on GitHub</a></div></div></section>`, { menuOpen, light });

// ── FEATURES ───────────────────────────────────────────────────────────────────
const feat = [
  ['Visual canvas', 'Tables, typed fields, PK/FK, unique, nullable, defaults, checks and comments. Drag between fields to create relationships; add notes and groups; auto-layout, search and undo.', ['users', [['id', 'PK'], ['email', ''], ['org_id', 'FK']]], ['orgs', [['id', 'PK'], ['name', '']]], ['plans', [['id', 'PK'], ['tier', '']]]],
  ['Import', 'Paste SQL DDL (PostgreSQL, MySQL, SQLite, SQL Server syntax; pg_dump and mysqldump work) or a Prisma schema. Foreign keys and composite keys come along; unsupported statements are reported, not fatal.', ['orders', [['id', 'PK'], ['user_id', 'FK'], ['total', '']]], ['users', [['id', 'PK'], ['email', '']]], ['items', [['id', 'PK'], ['order_id', 'FK']]]],
  ['Export', 'SQL for four dialects, Prisma, Drizzle ORM, DBML and JSON; PNG and SVG for docs. Real output, covered by round-trip tests. Always review before running on a real database.', ['posts', [['id', 'PK'], ['author_id', 'FK']]], ['authors', [['id', 'PK'], ['name', '']]], ['tags', [['id', 'PK'], ['label', '']]]],
  ['Snapshots and diff', 'Save versions as you go, restore one, or compare the current schema with a snapshot. The diff viewer generates migration SQL with destructive-change warnings.', ['v1', [['users', ''], ['posts', '']]], ['v2', [['users', ''], ['posts', ''], ['tags', 'PK']]], ['diff', [['+ tags', ''], ['- legacy', '']]]],
  ['Share links and embeds', 'The schema is compressed into the URL. Anyone with the link sees a read-only snapshot and can save a copy; an iframe embed works the same way. No server involved.', ['link', [['/app/shared#', '']]], ['viewer', [['read-only', '']]], ['copy', [['save a copy', '']]]],
  ['Local-first storage', 'No accounts. Projects live in your browser (IndexedDB). Back everything up as one JSON file and restore it on any machine.', ['project', [['id', 'PK'], ['name', '']]], ['backup', [['json', '']]], ['restore', [['json', '']]]],
];
const chips = (xs) => `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">${xs.map((x) => `<span class="n-badge" style="height:26px;padding:0 10px;font-size:.75rem">${x}</span>`).join('')}</div>`;
const features = () => page('Features — Modellr', `<section class="n-pagehead"><div class="n-dots"></div><div class="n-wrap"><span class="n-eyebrow">Features</span><h1 class="n-h1">Everything a schema designer needs. Nothing it doesn't.</h1><p class="n-lead">A free, open-source, local-first designer. It runs entirely in your browser, with no account.</p></div></section>
<section class="n-section n-section--tight" style="padding-top:24px"><div class="n-wrap"><div class="n-bento" style="margin-top:0">
<article class="n-card span-4"><div class="n-card__art" style="aspect-ratio:16/8;display:block;position:relative"><img src="assets/editor-dark.png" alt="Canvas with linked tables" style="position:absolute;width:150%;max-width:none;left:-28%;top:-18%"></div><h3 class="n-h4">Visual canvas</h3><p class="n-small">Tables, typed fields, PK/FK, unique, nullable, defaults, checks and comments. Drag between fields to create relationships; add notes and groups; auto-layout, search and undo.</p></article>
<article class="n-card span-2"><div class="n-panel" style="margin-bottom:6px"><pre class="n-code" style="font-size:.72rem;padding:14px 16px;line-height:1.7"><span class="k">CREATE TABLE</span> posts (\n  id <span class="t">serial</span> <span class="k">PRIMARY KEY</span>,\n  author_id <span class="t">uuid</span>\n    <span class="k">REFERENCES</span> users(id)\n);</pre></div><div class="n-panel" style="margin-bottom:6px"><pre class="n-code" style="font-size:.72rem;padding:14px 16px;line-height:1.7"><span class="k">model</span> <span class="t">Post</span> {\n  id       <span class="t">Int</span>  <span class="k">@id</span>\n  author   <span class="t">User</span> <span class="k">@relation</span>(...)\n}</pre></div><h3 class="n-h4">Import</h3><p class="n-small">Paste SQL DDL (pg_dump and mysqldump work) or a Prisma schema. Unsupported statements are reported, not fatal.</p></article>
<article class="n-card span-2"><div style="min-height:96px">${chips(['PostgreSQL', 'MySQL', 'SQLite', 'SQL Server', 'Prisma', 'Drizzle', 'DBML', 'JSON', 'PNG', 'SVG'])}</div><h3 class="n-h4">Export</h3><p class="n-small">Real output, covered by round-trip tests. Always review before running on a real database.</p></article>
<article class="n-card span-2"><div class="n-panel" style="margin-bottom:6px"><pre class="n-code" style="font-size:.78rem;padding:14px 16px;line-height:1.8"><span class="c">-- WARNING: destructive</span>\n<span style="color:#ff8080">- DROP COLUMN legacy_id</span>\n<span style="color:#8fd7a8">+ ADD COLUMN tags jsonb</span></pre></div><h3 class="n-h4">Snapshots and diff</h3><p class="n-small">Save versions, restore one, or diff against the current schema and generate migration SQL.</p></article>
<article class="n-card span-2"><div class="n-panel" style="margin-bottom:6px"><div class="n-panel__head"><span>/app/shared#N4Ig3gzg…</span><span class="n-badge n-badge--ok">read-only</span></div><div style="padding:14px 16px;font-family:var(--n-mono);font-size:.75rem;color:#8b929b">schema in the URL · 0 bytes uploaded</div></div><h3 class="n-h4">Share links and embeds</h3><p class="n-small">The schema is compressed into the URL. Recipients can save a copy; an iframe embed works the same way.</p></article>
<article class="n-card span-3"><div class="n-card__art" style="aspect-ratio:16/6">${artStack()}</div><h3 class="n-h4">Local-first storage</h3><p class="n-small">No accounts. Projects live in your browser (IndexedDB). Back everything up as one JSON file and restore it anywhere.</p></article>
<article class="n-card span-3"><div class="n-card__art" style="aspect-ratio:16/6;padding:18px"><div style="display:grid;gap:8px;width:100%;font-family:var(--n-mono);font-size:.75rem;color:var(--n-text-2)"><span>→ OpenAI</span><span>→ OpenRouter</span><span>→ Ollama · localhost:11434</span><span class="n-dim">your key stays in this browser</span></div></div><h3 class="n-h4">AI assistant, bring your own key</h3><p class="n-small">Optional. The request goes from your browser straight to the provider you choose. Proposals are reviewed before they touch your schema.</p></article>
</div></div></section>
<section class="n-section n-cta"><div class="n-wrap"><h2 class="n-h1">Try it in your browser.</h2><div class="n-cta__actions"><a class="n-btn n-btn--lg" href="#">Open the editor</a><a class="n-btn n-btn--secondary n-btn--lg" href="#">${GH} Star on GitHub</a></div></div></section>`, { active: 'Features' });

// ── TEMPLATES ──────────────────────────────────────────────────────────────────
const tpls = [
  ['E-commerce', '4 tables · 19 fields', ['users', [['id', 'PK'], ['email', '']]], ['orders', [['id', 'PK'], ['user_id', 'FK']]], ['products', [['id', 'PK'], ['price', '']]]],
  ['Multi-tenant SaaS', '9 tables · 52 fields', ['orgs', [['id', 'PK'], ['name', '']]], ['members', [['org_id', 'FK'], ['user_id', 'FK']]], ['users', [['id', 'PK'], ['email', '']]]],
  ['Blog + CMS', '6 tables · 31 fields', ['posts', [['id', 'PK'], ['author_id', 'FK']]], ['authors', [['id', 'PK'], ['name', '']]], ['tags', [['id', 'PK'], ['label', '']]]],
  ['Auth + profiles', '5 tables · 24 fields', ['users', [['id', 'PK'], ['email', '']]], ['sessions', [['id', 'PK'], ['user_id', 'FK']]], ['profiles', [['user_id', 'FK'], ['bio', '']]]],
];
const templates = (modal = false) => page('Templates — Modellr', `<section class="n-pagehead"><div class="n-dots"></div><div class="n-wrap"><span class="n-eyebrow">Templates</span><h1 class="n-h1">Start from a real schema.</h1><p class="n-lead">Four starting points. Pick one and it opens as a new project in your browser. Change anything.</p></div></section>
<section class="n-section n-section--tight" style="padding-top:8px"><div class="n-wrap"><div class="n-toolbar" role="group" aria-label="Filter by category">${['All', 'SaaS', 'Commerce', 'Content', 'Auth'].map((c, i) => `<button class="n-chip" aria-pressed="${i === 0}">${c}</button>`).join('')}</div>
<div class="n-grid-2">${tpls.map((t) => `<a class="n-card" href="#"><div class="n-card__art">${schemaSvg(t[2], t[3], t[4])}</div><span class="n-card__meta">${t[1]}</span><h3 class="n-h3">${t[0]}</h3><span class="n-arrow">Preview</span></a>`).join('')}</div></div></section>
${modal ? `<div class="n-scrim" role="dialog" aria-modal="true" aria-label="E-commerce template preview"><div class="n-modal"><div class="n-modal__head"><div><h3 class="n-h3">E-commerce</h3><span class="n-card__meta">4 tables · 19 fields</span></div><button class="n-icon-btn" aria-label="Close">${I.x}</button></div><div class="n-modal__body"><div class="n-card__art" style="margin:0">${schemaSvg(tpls[0][2], tpls[0][3], tpls[0][4])}</div><p class="n-small">Users, orders, products and order items with foreign keys wired. Opens as a new project; your other projects are untouched.</p></div><div class="n-modal__foot"><button class="n-btn n-btn--secondary">Cancel</button><button class="n-btn">Use this template</button></div></div></div>` : ''}`, { active: 'Templates' });

// ── DOCS ───────────────────────────────────────────────────────────────────────
const docsNav = ['Getting started', 'Importing SQL and Prisma', 'Exporting', 'Snapshots and diff', 'Sharing and embeds', 'AI setup (your own key)', 'Backup and restore', 'Keyboard shortcuts', 'Self-hosting', 'What Modellr does not do'];
const docs = (open = false) => page('Docs — Modellr', `<div class="n-wrap"><div class="n-docs"><div><button class="n-btn n-btn--secondary n-btn--sm n-docs__toggle" aria-expanded="${open}" style="margin-bottom:12px">${MENU} Docs menu</button><nav class="n-docs__nav ${open ? 'is-open' : ''}" aria-label="Docs"><div><h4>Guide</h4>${docsNav.slice(0, 7).map((d, i) => `<a href="#" ${i === 0 ? 'aria-current="page"' : ''}>${d}</a>`).join('')}</div><div><h4>Reference</h4>${docsNav.slice(7).map((d) => `<a href="#">${d}</a>`).join('')}</div></nav></div>
<article class="n-prose"><span class="n-eyebrow">Guide</span><h1>Getting started</h1><p>Modellr is a free schema designer that runs in your browser. This takes about a minute.</p>
<h2>1. Open the editor</h2><p>Go to <a href="#">/app</a> and choose <strong>New schema</strong>, or start from a <a href="#">template</a>. Nothing to install and no account.</p>
<h2>2. Bring your schema</h2><p>Choose <strong>Import</strong>, paste SQL or a Prisma schema, then <strong>Import schema</strong>. Your previous schema is saved as a snapshot first.</p><div class="n-panel"><div class="n-panel__head"><span>schema.sql</span><span>PostgreSQL</span></div><pre class="n-code">${sqlCode.split('\n').slice(5).join('\n')}</pre></div>
<div class="n-alert" style="margin-top:1.3em"><span>Everything is stored in this browser. Use <strong>Backup</strong> on the dashboard to keep a JSON copy.</span></div>
<h2>3. Export</h2><p>Use <strong>Export</strong> to copy SQL, Prisma, Drizzle or DBML, or save PNG/SVG. Read generated SQL before running it on a real database.</p><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:2em"><a class="n-btn" href="#">Open the editor</a><a class="n-arrow" href="#">Next: Importing</a></div></article></div></div>`, { active: 'Docs' });

// ── APP SHELL ──────────────────────────────────────────────────────────────────
const railItems = [['Projects', I.grid], ['Templates', I.tpl], ['Settings', I.gear], ['Docs', I.book]];
const rail = (active) => `<aside class="n-rail"><a class="n-logo" href="#">${MARK}modellr</a><nav class="n-rail__nav" aria-label="App">${railItems.map(([l, i]) => `<a href="#" ${l === active ? 'aria-current="page"' : ''}>${i}${l}</a>`).join('')}</nav><div class="n-rail__foot"><a href="#">${I.coffee}Support</a><a href="#">${GH}GitHub</a></div></aside>`;
const tabbar = (active) => `<nav class="n-tabbar" aria-label="App">${railItems.map(([l, i]) => `<a href="#" ${l === active ? 'aria-current="page"' : ''}>${i}${l}</a>`).join('')}</nav>`;
const shell = (title, active, body) => `${head(title)}<body><div class="n-root"><a class="n-skip" href="#main">Skip to content</a><div class="n-app">${rail(active)}<main id="main" class="n-main">${body}</main></div>${tabbar(active)}</div></body></html>`;
const proj = (name, meta, a, b, c) => `<article class="n-card n-project"><div class="n-project__thumb">${schemaSvg(a, b, c, 'style="width:78%"')}</div><div class="n-project__body"><h3 class="n-h4">${name}</h3><span class="n-card__meta">${meta}</span><div class="n-project__actions"><a class="n-btn n-btn--sm" href="#">Open</a><button class="n-btn n-btn--secondary n-btn--sm">Copy</button><button class="n-btn n-btn--secondary n-btn--sm">Export</button><button class="n-btn n-btn--danger n-btn--sm">Delete</button></div></div></article>`;
const dashboard = () => shell('Projects — Modellr', 'Projects', `<div class="n-main__head"><div><span class="n-eyebrow">Projects</span><h1 class="n-h2" style="margin-top:10px">My projects</h1><p class="n-small" style="margin-top:6px">Everything stays in this browser.</p></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="n-btn n-btn--secondary">Import</button><button class="n-btn">${I.plus} New schema</button></div></div>
<div class="n-stats"><div class="n-stat"><span class="n-small">Projects</span><b>5</b></div><div class="n-stat"><span class="n-small">Tables</span><b>38</b></div><div class="n-stat"><span class="n-small">Last backup</span><b>3 days</b></div></div>
<div class="n-cards-fit">${proj('Shop backend', '4 tables · edited 2h ago', ['users', [['id', 'PK'], ['email', '']]], ['orders', [['id', 'PK'], ['user_id', 'FK']]], ['items', [['id', 'PK'], ['order_id', 'FK']]])}${proj('Blog + CMS', '6 tables · edited yesterday', ['posts', [['id', 'PK'], ['author_id', 'FK']]], ['authors', [['id', 'PK'], ['name', '']]], ['tags', [['id', 'PK'], ['label', '']]])}${proj('Tenant model', '9 tables · edited 3 days ago', ['orgs', [['id', 'PK'], ['name', '']]], ['members', [['org_id', 'FK'], ['user_id', 'FK']]], ['users', [['id', 'PK'], ['email', '']]])}
<button class="n-card" style="border-style:dashed;align-items:center;justify-content:center;min-height:240px;cursor:pointer;font:inherit;color:var(--n-text-2)">${I.plus}<span>New schema</span></button></div>`);
const settings = () => shell('Settings — Modellr', 'Settings', `<div class="n-main__head"><div><span class="n-eyebrow">Settings</span><h1 class="n-h2" style="margin-top:10px">Your settings</h1><p class="n-small" style="margin-top:6px">Stored in this browser only.</p></div></div>
<div class="n-cards-fit"><section class="n-card"><span class="n-card__meta">AI · optional</span><h3 class="n-h3">Assistant with your own key</h3><p class="n-small">Requests go from your browser straight to the provider you choose, including a local model such as Ollama.</p><p style="margin:6px 0"><span class="n-badge n-badge--fk">Not configured</span></p><button class="n-btn" style="align-self:flex-start">Set up AI</button></section>
<section class="n-card"><span class="n-card__meta">Data</span><h3 class="n-h3">Your data</h3><p class="n-small">Schemas live in your browser's IndexedDB. Clearing site data deletes them, so keep a backup.</p><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px"><button class="n-btn n-btn--secondary">Download backup</button><button class="n-btn n-btn--secondary">Restore from file</button><button class="n-btn n-btn--danger">Delete all data</button></div></section>
<section class="n-card"><span class="n-card__meta">About</span><h3 class="n-h3">Modellr</h3><p class="n-small">Free, open-source software (MIT). Source, issues and contributions on GitHub.</p><a class="n-arrow" style="align-self:flex-start" href="#">github.com/prateesh7777/modellr</a></section></div>`);
const notFound = () => page('Page not found — Modellr', `<section class="n-hero" style="padding-bottom:0"><div class="n-dots"></div><div class="n-wrap"><div class="n-404"><div class="n-404__code">4<span>0</span>4</div><h1 class="n-h2">This table doesn't exist.</h1><p class="n-lead">The page you asked for isn't here. Maybe the link is old, or the address has a typo.</p><div style="display:flex;gap:12px;flex-wrap:wrap"><a class="n-btn" href="#">Go home</a><a class="n-btn n-btn--secondary" href="#">Open the editor</a></div></div></div></section>`);

const files = { 'home': home(), 'home-light': home({ light: true }), 'home-menu': home({ menuOpen: true }), 'features': features(), 'templates': templates(), 'templates-preview': templates(true), 'docs': docs(), 'docs-menu': docs(true), 'dashboard': dashboard(), 'settings': settings(), '404': notFound() };
fs.mkdirSync(OUT, { recursive: true });
for (const [n, html] of Object.entries(files)) fs.writeFileSync(`${OUT}${n}.html`, html.replaceAll('mockups-v2/assets/', 'assets/'));
console.log('wrote', Object.keys(files).length, 'v2 mockups');
