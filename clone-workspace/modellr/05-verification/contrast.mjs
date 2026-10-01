// WCAG contrast scan of every visible text element on the built app, both themes, desktop + mobile.
// Background = nearest ancestor with an opaque fill (gradient/glow overlays are ignored: they are decorative).
// Thresholds: 4.5:1 normal text, 3:1 large text (>=24px, or >=18.66px bold).   node contrast.mjs
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:4173';
const routes = ['/', '/features', '/templates', '/docs', '/docs/import', '/blog', '/blog/reviewing-migration-sql', '/about', '/contact', '/privacy', '/terms', '/use-cases/saas-database-schema', '/nope', '/app', '/app/templates', '/app/settings'];
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const fails = new Map();
let checked = 0;
for (const theme of ['dark', 'light']) for (const width of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  await ctx.addInitScript((t) => { try { localStorage.setItem('sf-theme', t); } catch {} }, theme);
  const page = await ctx.newPage();
  for (const r of routes) {
    await page.goto(BASE + r, { waitUntil: 'networkidle' }); await page.waitForTimeout(300);
    const res = await page.evaluate(() => {
      const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[,/ ]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
      const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
      const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255, a: 1 }; for (const c of stack.reverse()) base = over(c, base); return base; };
      const out = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const seen = new Set();
      while (walker.nextNode()) {
        const n = walker.currentNode; if (!n.textContent.trim()) continue;
        const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
        const cs = getComputedStyle(el); const rc = el.getBoundingClientRect();
        if (cs.visibility === 'hidden' || cs.display === 'none' || !rc.width || !rc.height || +cs.opacity === 0) continue;
        if (el.closest('[hidden], .n-sheet[hidden], .react-flow, svg, .n-shot__stage, .n-callout')) continue;
        let fg = parse(cs.color); if (!fg) continue;
        const bg = bgOf(el); fg = over(fg, bg);
        const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
        const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
        if (ratio < need) out.push({ text: n.textContent.trim().slice(0, 40), cls: String(el.className).slice(0, 40) || el.tagName, ratio: +ratio.toFixed(2), need });
        out.push({ ok: 1 });
      }
      return out;
    });
    for (const x of res) { if (x.ok) { checked++; continue; } const k = `${theme}/${width} ${x.cls} (${x.ratio} < ${x.need})`; if (!fails.has(k)) fails.set(k, `${r}: "${x.text}"`); }
  }
  await ctx.close();
}
await browser.close();
console.log(`${checked} text elements checked`);
if (fails.size) { for (const [k, v] of fails) console.log('LOW', k, v); process.exit(1); } else console.log('all text meets WCAG AA contrast');
