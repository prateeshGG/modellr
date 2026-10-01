// Horizontal-overflow scan: every route at 320/375/390/430/768/1024/1280/1440, dark and light.   node breakpoints.mjs
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const base = 'http://localhost:4173';
const routes = ['/', '/features', '/templates', '/docs', '/docs/import', '/docs/notes', '/blog', '/blog/why-visual-diagrams-fail', '/about', '/contact', '/privacy', '/terms', '/use-cases/saas-database-schema', '/use-cases/ecommerce-schema', '/use-cases/auth-schema', '/nope', '/app', '/app/templates', '/app/settings'];
const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440];
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const bad = [];
for (const theme of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((t) => { try { localStorage.setItem('sf-theme', t); } catch {} }, theme);
  const p = await ctx.newPage();
  for (const r of routes) {
    await p.goto(base + r, { waitUntil: 'networkidle' });
    for (const w of widths) {
      await p.setViewportSize({ width: w, height: 800 });
      await p.waitForTimeout(80);
      const o = await p.evaluate(() => {
        const iw = document.documentElement.clientWidth;
        const offenders = [];
        for (const el of document.querySelectorAll('body *')) {
          const rc = el.getBoundingClientRect();
          if (rc.width && rc.right > iw + 1 && getComputedStyle(el).position !== 'fixed') {
            // ignore elements clipped by an overflow:hidden/auto ancestor
            let a = el.parentElement, clipped = false;
            while (a && a !== document.body) { const ov = getComputedStyle(a).overflowX; if (ov !== 'visible') { clipped = true; break; } a = a.parentElement; }
            if (!clipped) offenders.push(el.tagName + '.' + String(el.className).slice(0, 40));
          }
        }
        return { sw: document.documentElement.scrollWidth, iw, offenders: offenders.slice(0, 3) };
      });
      if (o.sw > o.iw || o.offenders.length) bad.push(`${theme} ${r} @${w}: scrollWidth ${o.sw} > ${o.iw} ${o.offenders.join(' | ')}`);
    }
  }
  await ctx.close();
}
await b.close();
console.log(bad.length ? bad.join('\n') : `no horizontal overflow: ${routes.length} routes x ${widths.length} widths x 2 themes`);
