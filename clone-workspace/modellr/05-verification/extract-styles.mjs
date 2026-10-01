// Reads computed styles from the BUILT app for every assertion in 03-design-spec/assertions.json.
// Assertion selectors are keys of the form  theme|width|route|css-selector .
//   node extract-styles.mjs > ../06-qa/clone-styles.json     (needs the preview server on :4173)
import fs from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:4173';
const assertions = JSON.parse(fs.readFileSync(new URL('../03-design-spec/assertions.json', import.meta.url)));
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const out = {};
const groups = new Map();
for (const a of assertions) {
  const [theme, width, route, ...rest] = a.selector.split('|');
  const g = `${theme}|${width}|${route}`;
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push({ key: a.selector, css: rest.join('|'), prop: a.prop });
}
for (const [g, items] of groups) {
  const [theme, width, route] = g.split('|');
  const ctx = await browser.newContext({ viewport: { width: +width, height: 900 } });
  await ctx.addInitScript((t) => { try { localStorage.setItem('sf-theme', t); } catch {} }, theme);
  const page = await ctx.newPage();
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.waitForSelector('.n-root', { timeout: 10000 });
  await page.waitForTimeout(400);
  const res = await page.evaluate((items) => items.map(({ key, css, prop }) => {
    const el = document.querySelector(css);
    return [key, prop, el ? getComputedStyle(el).getPropertyValue(prop) : null];
  }), items);
  for (const [key, prop, val] of res) (out[key] ||= {})[prop] = val;
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
