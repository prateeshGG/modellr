import { chromium } from '/tmp/claude-0/-home-user-SchemaForge/9aeaead6-cc50-57d0-9f5b-7b8eeabdf113/scratchpad/pw/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
for (const theme of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((t) => { try { localStorage.setItem('sf-theme', t); } catch {} }, theme);
  const p = await ctx.newPage();
  await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await p.locator('.stage__body').screenshot({ path: `mockups-v2/assets/editor-${theme}.png` });
  await ctx.close();
}
await b.close();
