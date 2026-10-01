import { chromium } from '/tmp/claude-0/-home-user-SchemaForge/9aeaead6-cc50-57d0-9f5b-7b8eeabdf113/scratchpad/pw/node_modules/playwright-core/index.mjs';
import fs from 'node:fs'; import path from 'node:path';
const dir = new URL('./mockups-v2/', import.meta.url).pathname;
const pages = fs.readdirSync(dir).filter((f) => f.endsWith('.html')).map((f) => f.replace('.html', ''));
const shotsVp = { desktop: [1440, 900], tablet: [820, 1100], mobile: [390, 844] };
const overflowVps = [320, 375, 390, 430, 768, 1024, 1280, 1440];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
const report = {};
for (const n of pages) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  for (const [label, [w, h]] of Object.entries(shotsVp)) {
    await p.setViewportSize({ width: w, height: h });
    await p.goto('file://' + path.join(dir, n + '.html')); await p.waitForTimeout(500); await p.addStyleTag({ content: '.n-tabbar{position:static!important}' });
    await p.screenshot({ path: path.join(dir, 'shots', `${n}--${label}.png`), fullPage: !(n.includes('preview') || n.includes('menu')) });
  }
  for (const w of overflowVps) {
    await p.setViewportSize({ width: w, height: 800 });
    const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    if (o.sw > o.iw) (report[n] ||= []).push(`${w}px (scrollWidth ${o.sw})`);
  }
  await p.close();
}
await b.close();
console.log('overflow:', Object.keys(report).length ? JSON.stringify(report, null, 1) : 'none at 320/375/390/430/768/1024/1280/1440');
