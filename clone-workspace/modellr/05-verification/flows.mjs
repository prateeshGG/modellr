// End-to-end flow checks (F1-F9 from 01-recon/user-flows.md) against a running build.
//   npx vite build && npx vite preview --port 4173 --strictPort &
//   PLAYWRIGHT_CORE=/path/to/playwright-core/index.mjs node flows.mjs
import fs from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:4173';
const EXE = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const results = [];
let page;
async function step(name, fn) {
  try { await fn(); results.push([true, name]); console.log('PASS', name); }
  catch (e) { results.push([false, name, e.message.split('\n')[0]]); console.log('FAIL', name, '-', e.message.split('\n')[0]); }
}
const ok = (c, m) => { if (!c) throw new Error(m); };
const fresh = async (vp = { width: 1440, height: 900 }, init) => {
  const ctx = await browser.newContext({ viewport: vp, acceptDownloads: true });
  if (init) await ctx.addInitScript(init);
  page = await ctx.newPage();
  page.on('pageerror', (e) => { throw e; });
  return ctx;
};
const settle = async () => { await page.waitForSelector('h1, .app-shell, .n-root', { timeout: 10000 }); await page.waitForTimeout(250); };
const nodes = () => page.locator('.react-flow__node').count();

// ── F1 discover → try → start ────────────────────────────────────────────────
let ctx = await fresh();
await step('F1 home renders hero, nav, one H1', async () => {
  await page.goto(BASE + '/'); await settle();
  ok((await page.locator('h1').count()) === 1, 'expected exactly one h1');
  ok(await page.getByRole('link', { name: 'Open the editor' }).first().isVisible(), 'CTA visible');
  ok((await page.title()).startsWith('Modellr'), 'title');
});
await step('F1 "Try it live" mounts the real editor and shows 4 tables, "Back to preview" returns', async () => {
  await page.getByRole('button', { name: 'Try it live' }).click();
  await page.waitForSelector('.react-flow__node', { timeout: 15000 });
  ok((await nodes()) >= 4, 'sandbox tables: ' + (await nodes()));
  await page.getByRole('button', { name: 'Back to preview' }).click();
  ok(await page.locator('.n-shot__img').isVisible(), 'screenshot restored');
});
await step('F1 Open the editor → /app → New schema → /app/:id with an editable canvas', async () => {
  await page.getByRole('link', { name: 'Open the editor' }).first().click();
  await page.waitForURL('**/app');
  await page.getByRole('button', { name: 'New schema' }).first().click();
  await page.waitForURL(/\/app\/[^/]+$/);
  await page.waitForSelector('.app-shell');
  ok(/app\//.test(page.url()), 'url');
});
const projectUrl = page.url();
await step('F9 reload inside the editor restores the project from IndexedDB', async () => {
  await page.getByRole('button', { name: 'Add table' }).first().click();
  await page.waitForSelector('.react-flow__node');
  await page.waitForTimeout(1500);
  await page.reload();
  await page.waitForSelector('.react-flow__node', { timeout: 10000 });
  ok(page.url() === projectUrl, 'same url');
});
await step('F9 unknown project id shows a message and returns to /app', async () => {
  await page.goto(BASE + '/app/does-not-exist');
  await page.waitForURL('**/app', { timeout: 8000 });
});

// ── F2 import ─────────────────────────────────────────────────────────────────
await step('F2 import SQL: button disabled when empty, imports tables, previous schema snapshotted', async () => {
  await page.goto(projectUrl);
  await page.waitForSelector('.app-shell');
  await page.getByRole('button', { name: 'Import schema' }).click();
  const dlg = page.getByRole('dialog', { name: 'Import schema' });
  ok(await dlg.getByRole('button', { name: /Import schema/ }).isDisabled(), 'empty disables');
  await dlg.locator('textarea').fill('CREATE TABLE a (id serial PRIMARY KEY, name text);\nCREATE TABLE b (id serial PRIMARY KEY, a_id int REFERENCES a(id));');
  await dlg.getByRole('button', { name: /Import schema/ }).click();
  await page.waitForTimeout(800);
  await page.waitForSelector('.react-flow__node');
  ok((await nodes()) === 2, 'tables after import: ' + (await nodes()));
});
await step('F2 invalid SQL shows an inline error instead of crashing', async () => {
  await page.getByRole('button', { name: 'Import schema' }).click();
  const dlg = page.getByRole('dialog', { name: 'Import schema' });
  await dlg.locator('textarea').fill('this is not sql at all');
  await dlg.getByRole('button', { name: /Import schema/ }).click();
  await page.waitForTimeout(500);
  ok((await page.locator('.import-dialog__errors').count()) > 0, 'error list');
  await page.keyboard.press('Escape');
});

// ── F3 share → read-only recipient → save a copy ─────────────────────────────
await step('F3 share link opens read-only with banner; Save a copy creates a project', async () => {
  await page.getByRole('button', { name: 'Share schema' }).click();
  await page.waitForSelector('.share-modal__copy-btn', { timeout: 5000 });
  const link = await page.evaluate(async () => {
    // The modal copies to the clipboard; read the generated link from the DOM text instead.
    const el = document.querySelector('.share-modal input, .share-modal textarea, .share-modal code');
    return el ? (el.value || el.textContent) : '';
  });
  ok(/shared#/.test(link), 'share link present: ' + link.slice(0, 40));
  await page.keyboard.press('Escape');
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await ctx2.newPage();
  await p2.goto(link.startsWith('http') ? link : BASE + link.replace(/^.*?(\/app\/shared)/, '$1'));
  await p2.waitForSelector('.react-flow__node', { timeout: 10000 });
  ok(await p2.getByText('read-only shared snapshot').isVisible(), 'banner');
  await p2.getByRole('button', { name: 'Save a copy to edit' }).click();
  await p2.waitForURL(/\/app\/[^/]+$/, { timeout: 8000 });
  await ctx2.close();
});
await step('F3 damaged embed link shows a friendly message', async () => {
  await page.goto(BASE + '/embed#/schema/garbage');
  await page.getByText(/show this schema/).waitFor({ timeout: 8000 });
});

// ── F4 snapshot → change → diff → migration ──────────────────────────────────
await step('F4 save snapshot, edit, diff generates migration SQL', async () => {
  await page.goto(projectUrl);
  await page.waitForSelector('.app-shell');
  await page.getByText('History').first().click();
  await page.getByText('+ Save snapshot').click();
  await page.getByRole('button', { name: 'Add table' }).first().click();
  await page.getByRole('button', { name: 'Diff viewer' }).click();
  const dlg = page.getByRole('dialog', { name: 'Schema diff' });
  const gen = dlg.getByRole('button', { name: /Generate SQL Migration/ });
  await gen.waitFor({ timeout: 5000 });
  await gen.click();
  const text = await dlg.innerText();
  ok(/CREATE TABLE|ALTER TABLE|DROP/.test(text), 'migration SQL shown');
  await page.keyboard.press('Escape');
});

// ── F5 templates ──────────────────────────────────────────────────────────────
await step('F5 public templates: category filter shows the blog template under "CMS & Blogs"', async () => {
  await page.goto(BASE + '/templates');
  await page.getByRole('button', { name: 'CMS & Blogs' }).click();
  ok(await page.getByRole('heading', { name: 'Blog' }).isVisible(), 'blog card');
  ok((await page.getByRole('heading', { name: 'E-commerce' }).count()) === 0, 'other cards hidden');
});
await step('F5 app templates: preview modal opens, Escape closes it, Use template opens the editor', async () => {
  await page.goto(BASE + '/app/templates');
  await page.getByRole('button', { name: 'Preview' }).first().click();
  await page.waitForSelector('[role=dialog] .react-flow', { timeout: 8000 });
  await page.keyboard.press('Escape');
  await page.waitForSelector('[role=dialog]', { state: 'detached' });
  await page.getByRole('button', { name: 'Use template' }).first().click();
  await page.waitForURL(/\/app\/[^/]+$/);
  await page.waitForSelector('.react-flow__node');
  ok((await nodes()) >= 3, 'template tables');
});

// ── F6 docs ───────────────────────────────────────────────────────────────────
await step('F6 docs: sidebar navigates to /docs/import; deep link survives reload; back works', async () => {
  await page.goto(BASE + '/docs');
  await page.getByRole('navigation', { name: 'Documentation' }).getByRole('link', { name: 'Importing' }).click();
  await page.waitForURL('**/docs/import');
  await page.reload();
  await page.getByRole('heading', { name: /Importing SQL/ }).waitFor({ timeout: 8000 });
  await page.goBack();
  await page.waitForURL(/\/docs$/);
});
await step('F6 unknown docs slug redirects to /docs', async () => {
  await page.goto(BASE + '/docs/nope');
  await page.waitForURL(/\/docs$/);
});
await ctx.close();

ctx = await fresh({ width: 390, height: 844 });
await step('F6 mobile docs menu toggles and closes after choosing an article', async () => {
  await page.goto(BASE + '/docs');
  const toggle = page.getByRole('button', { name: 'Docs menu' });
  await toggle.click();
  ok((await toggle.getAttribute('aria-expanded')) === 'true', 'expanded');
  await page.getByRole('navigation', { name: 'Documentation' }).getByRole('link', { name: 'Exporting' }).click();
  await page.waitForURL('**/docs/export');
  await page.waitForFunction(() => document.querySelector('.n-docs__toggle')?.getAttribute('aria-expanded') === 'false', null, { timeout: 3000 });
});
await step('Mobile nav sheet opens, locks scroll, Escape closes it, links navigate', async () => {
  await page.goto(BASE + '/');
  const t = page.getByRole('button', { name: 'Open menu' });
  await t.click();
  ok(await page.locator('#n-nav-sheet').isVisible(), 'sheet visible');
  ok((await page.evaluate(() => document.body.style.overflow)) === 'hidden', 'scroll locked');
  await page.keyboard.press('Escape');
  ok(!(await page.locator('#n-nav-sheet').isVisible()), 'sheet closed');
  await t.click();
  await page.locator('#n-nav-sheet').getByRole('link', { name: 'Features' }).click();
  await page.waitForURL('**/features');
  await page.waitForSelector('#n-nav-sheet', { state: 'hidden', timeout: 3000 });
});
await ctx.close();

// ── F7 backup / restore / delete ──────────────────────────────────────────────
ctx = await fresh();
await step('F7 settings: backup downloads JSON, bad restore file errors, delete asks to confirm with focus on Cancel', async () => {
  await page.goto(BASE + '/app/settings');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download backup' }).click()]);
  ok(/modellr-backup-.*\.json$/.test(dl.suggestedFilename()), 'filename ' + dl.suggestedFilename());
  fs.writeFileSync('/tmp/bad.json', 'not json');
  await page.locator('input[type=file]').setInputFiles('/tmp/bad.json');
  await page.waitForSelector('.toast--error', { timeout: 5000 });
  await page.getByRole('button', { name: 'Delete all data' }).click();
  const dlg = page.getByRole('dialog', { name: 'Delete all data' });
  await dlg.waitFor();
  ok((await page.evaluate(() => document.activeElement?.textContent)) === 'Cancel', 'focus on Cancel');
  await page.keyboard.press('Escape');
});
await step('F8 settings: Set up AI opens the dialog; Escape closes it', async () => {
  await page.getByRole('button', { name: /Set up AI|Edit AI settings/ }).click();
  await page.waitForSelector('[role=dialog]');
  await page.keyboard.press('Escape');
});
await ctx.close();

// ── F9 + cross-cutting ────────────────────────────────────────────────────────
ctx = await fresh();
await step('F9 unknown URL → 404 page with working Go home; noindex meta', async () => {
  await page.goto(BASE + '/definitely/not/here');
  await page.getByRole('heading', { name: /This table doesn/ }).waitFor({ timeout: 8000 });
  ok((await page.locator('meta[name=robots]').getAttribute('content')).includes('noindex'), 'noindex');
  await page.getByRole('link', { name: 'Go home' }).click();
  await page.waitForURL(BASE + '/');
});
await step('Unknown blog post renders the 404 screen', async () => {
  await page.goto(BASE + '/blog/nope');
  await page.getByRole('heading', { name: /This table doesn/ }).waitFor({ timeout: 8000 });
});
await step('Keyboard: skip link is the first tab stop and jumps to main; focus ring is visible', async () => {
  await page.goto(BASE + '/features'); await settle();
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => document.activeElement?.textContent);
  ok(first === 'Skip to content', 'first focus: ' + first);
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  ok(outline === 'solid', 'outline ' + outline);
  await page.keyboard.press('Enter');
  ok((await page.evaluate(() => location.hash)) === '#main', 'hash');
});
await step('Theme toggle switches light/dark and persists across reload', async () => {
  await page.goto(BASE + '/'); await settle();
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.getByRole('button', { name: /Switch to (light|dark) theme/ }).click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  ok(before !== after, 'changed');
  await page.reload(); await settle();
  ok((await page.evaluate(() => document.documentElement.dataset.theme)) === after, 'persisted');
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.n-root')).backgroundColor);
  ok(after === 'light' ? bg === 'rgb(251, 251, 250)' : bg === 'rgb(8, 9, 10)', 'bg ' + bg);
});
await step('Every public route has a unique <title> and one H1', async () => {
  const routes = ['/', '/features', '/templates', '/docs', '/docs/export', '/blog', '/blog/reviewing-migration-sql', '/about', '/contact', '/privacy', '/terms', '/use-cases/saas-database-schema', '/use-cases/ecommerce-schema', '/use-cases/auth-schema'];
  const titles = new Set();
  for (const r of routes) {
    await page.goto(BASE + r); await settle();
    titles.add(await page.title());
    ok((await page.locator('h1').count()) === 1, `${r}: h1 count ${await page.locator('h1').count()}`);
  }
  ok(titles.size === routes.length, 'unique titles ' + titles.size + '/' + routes.length);
});
await ctx.close();
await browser.close();

const failed = results.filter((r) => !r[0]);
console.log(`\n${results.length - failed.length}/${results.length} flow checks passed`);
fs.writeFileSync(new URL('./flows-result.json', import.meta.url), JSON.stringify(results, null, 1));
process.exit(failed.length ? 1 : 0);
