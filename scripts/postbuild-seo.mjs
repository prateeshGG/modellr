#!/usr/bin/env node
/**
 * Post-build SEO step (runs after `vite build`).
 *
 *  - writes dist/<route>/index.html for every public route with its own <title>, description, canonical and
 *    social tags, so crawlers and link previews that do not run JavaScript still see the right metadata;
 *  - writes dist/robots.txt (the editor, dashboard and embeds are disallowed);
 *  - writes dist/sitemap.xml when the public origin is known.
 *
 * Set the origin with SITE_URL or VITE_SITE_URL, e.g. SITE_URL=https://modellr.example npm run build.
 * Without it the pages still get titles and descriptions, but no canonical URLs and no sitemap.
 * Node 22.18+ runs the TypeScript data files directly (the project already uses erasable-only TS).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || '').trim().replace(/\/+$/, '');

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('postbuild-seo: dist/index.html not found. Run `vite build` first.');
  process.exit(1);
}

const meta = await import(pathToFileURL(path.join(root, 'src/lib/routeMeta.ts')).href);
const { POSTS } = await import(pathToFileURL(path.join(root, 'src/pages/blogPosts.ts')).href);
const { STATIC_META, DOCS_META, buildTitle, docsPath, docsTitle } = meta;

// Strip anything a previous run added so the script is safe to repeat.
const template = fs
  .readFileSync(path.join(dist, 'index.html'), 'utf8')
  .replace(/[ \t]*<link rel="canonical"[^>]*>\n?/g, '')
  .replace(/[ \t]*<meta property="og:url"[^>]*>\n?/g, '');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Every indexable route with its metadata. */
const routes = [
  ...Object.entries(STATIC_META).map(([p, m]) => ({ path: p, title: buildTitle(m.title), description: m.description })),
  ...Object.entries(DOCS_META).map(([slug, m]) => ({ path: docsPath(slug), title: buildTitle(docsTitle(slug)), description: m.description })),
  ...POSTS.map((post) => ({ path: `/blog/${post.id}`, title: buildTitle(post.title), description: post.excerpt })),
];

function render({ path: p, title, description }) {
  let html = template;
  const set = (re, replacement) => { html = html.replace(re, replacement); };
  set(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  set(/(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`);
  set(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`);
  set(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(description)}$2`);
  set(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`);
  set(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(description)}$2`);
  if (siteUrl) {
    const url = `${siteUrl}${p === '/' ? '' : p}`;
    html = html.replace('</head>', `    <link rel="canonical" href="${esc(url)}" />\n    <meta property="og:url" content="${esc(url)}" />\n  </head>`);
  }
  return html;
}

let written = 0;
for (const r of routes) {
  const html = render(r);
  const file = r.path === '/' ? path.join(dist, 'index.html') : path.join(dist, r.path, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  written++;
}

const robots = ['User-agent: *', 'Disallow: /app', 'Disallow: /embed', siteUrl ? '' : null, siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml` : null].filter((l) => l !== null).join('\n') + '\n';
fs.writeFileSync(path.join(dist, 'robots.txt'), robots);

if (siteUrl) {
  const urls = routes.map((r) => `  <url><loc>${esc(siteUrl + (r.path === '/' ? '/' : r.path))}</loc></url>`).join('\n');
  fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}

console.log(`postbuild-seo: ${written} pages, robots.txt${siteUrl ? `, sitemap.xml (${routes.length} urls) for ${siteUrl}` : ' (no SITE_URL set: skipped sitemap.xml and canonical links)'}`);
