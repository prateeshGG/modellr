import { chromium } from '/tmp/claude-0/-home-user-SchemaForge/9aeaead6-cc50-57d0-9f5b-7b8eeabdf113/scratchpad/pw/node_modules/playwright-core/index.mjs';
import fs from 'node:fs'; import path from 'node:path';
const dir = new URL('./mockups/', import.meta.url).pathname;
const out = new URL('./boards/', import.meta.url).pathname; fs.mkdirSync(out, { recursive: true });
const groups = {
  '1-home': ['home', 'home-dark', 'home-menu'],
  '2-features-usecase': ['features', 'use-case'],
  '3-templates': ['templates', 'templates-preview', 'templates-empty'],
  '4-docs-blog': ['docs', 'docs-menu', 'blog', 'blog-post'],
  '5-pages': ['about', 'contact', 'privacy', '404'],
  '6-app-dashboard': ['dashboard', 'dashboard-empty', 'dashboard-blocked'],
  '7-app-settings': ['settings', 'settings-configured'],
  '8-editor-chrome': ['editor-chrome'],
};
const S = 0.42;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
for (const [g, names] of Object.entries(groups)) {
  const rows = names.map((n) => `<section><h2>${n}</h2><div class="r">${['desktop|1440', 'tablet|820', 'mobile|390'].map((x) => { const [v, w] = x.split('|'); return `<figure><img src="../mockups/shots/${n}--${v}.png" style="width:${Math.round(w * S)}px"><figcaption>${v} · ${w}px</figcaption></figure>`; }).join('')}</div></section>`).join('');
  const html = `<!doctype html><meta charset=utf-8><style>body{margin:0;padding:32px;background:#e9e6dc;font:13px ui-monospace,monospace;color:#14213d;width:1160px}h1{font:600 26px Georgia;margin:0 0 20px}h2{margin:28px 0 10px;text-transform:uppercase;letter-spacing:.1em;font-size:12px}.r{display:flex;gap:24px;align-items:flex-start}figure{margin:0}img{display:block;border:1px solid #14213d;box-shadow:4px 4px 0 #14213d}figcaption{margin-top:6px;font-size:11px;color:#46526f}</style><h1>Modellr — Blueprint mockups · ${g.replace(/^\d-/, '')}</h1>${rows}`;
  const p = await b.newPage({ viewport: { width: 1224, height: 800 } });
  fs.writeFileSync(out + `board-${g}.html`, html); await p.goto('file://' + out + `board-${g}.html`); await p.waitForTimeout(400);
  await p.screenshot({ path: out + `board-${g}.png`, fullPage: true }); await p.close();
}
await b.close();
