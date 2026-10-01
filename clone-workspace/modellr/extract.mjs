// extract.mjs — live computed-style extraction (contract §3, condensed). Reads ground-truth values
// from a running page with getComputedStyle; screenshots are visual references only.
import { chromium } from '/tmp/claude-0/-home-user-SchemaForge/9aeaead6-cc50-57d0-9f5b-7b8eeabdf113/scratchpad/pw/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
const [url, name, w = '1440', h = '900', waitSel = ''] = process.argv.slice(2);
const out = new URL('./02-extraction/fragments/', import.meta.url).pathname;
const shots = new URL('./01-recon/screenshots/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
if (waitSel) await p.waitForSelector(waitSel, { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(2500);
const data = await p.evaluate(() => {
  const PROPS = ['color','backgroundColor','backgroundImage','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textTransform',
    'borderTopLeftRadius','borderTopWidth','borderTopColor','borderTopStyle','borderBottomWidth','borderBottomColor','boxShadow',
    'paddingTop','paddingRight','paddingBottom','paddingLeft','display','position','transitionDuration','transitionTimingFunction','cursor','backdropFilter','opacity'];
  const INIT = new Set(['none','normal','0px','auto','static','rgba(0, 0, 0, 0)','all','ease','0s','1','visible','start','baseline','inline']);
  const skip = new Set(['SCRIPT','STYLE','META','LINK','HEAD','NOSCRIPT','TITLE','BR','PATH','G','DEFS','CLIPPATH']);
  const sigs = new Map();
  const sel = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
  for (const el of document.querySelectorAll('body *')) {
    if (skip.has(el.tagName.toUpperCase())) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el); const o = {};
    for (const k of PROPS) { const v = cs[k]; if (v !== undefined && !INIT.has(v)) o[k] = v; }
    const sig = JSON.stringify(o);
    const e = sigs.get(sig);
    if (e) e.count++; else sigs.set(sig, { selector: sel(el), text: (el.innerText || '').trim().slice(0, 40), count: 1, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], style: o });
  }
  // CSS variables on :root / html / dark scopes
  const vars = {};
  for (const sheet of document.styleSheets) { let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules || []) { if (rule.selectorText && /(^|,)\s*(:root|html|\.dark|\[data-theme)/.test(rule.selectorText)) {
      for (const n of rule.style) if (n.startsWith('--')) (vars[rule.selectorText] ||= {})[n] = rule.style.getPropertyValue(n).trim(); } } }
  const fonts = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`);
  const interactive = [...document.querySelectorAll('a,button,input,select,textarea,[role=button],[role=tab]')].slice(0, 400).map((el) => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { tag: el.tagName.toLowerCase(), text: (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), radius: cs.borderTopLeftRadius, fs: cs.fontSize, fw: cs.fontWeight, bg: cs.backgroundColor, color: cs.color };
  }).filter((x) => x.w > 0);
  const mq = [];
  for (const sheet of document.styleSheets) { let rules; try { rules = sheet.cssRules; } catch { continue; } for (const r of rules || []) if (r.conditionText && r.type === 4) mq.push(r.conditionText); }
  return { archetypes: [...sigs.values()].sort((a, b) => b.count - a.count).slice(0, 300), vars, fonts: [...new Set(fonts)], interactive, breakpoints: [...new Set(mq)].slice(0, 60),
    title: document.title, scrollWidth: document.documentElement.scrollWidth, innerWidth: innerWidth };
});
fs.writeFileSync(`${out}${name}.computed.json`, JSON.stringify({ url, viewport: [+w, +h], ...data }, null, 2));
await p.screenshot({ path: `${shots}${name}.png`, fullPage: false });
console.log(name, 'archetypes', data.archetypes.length, 'fonts', data.fonts.length, 'interactive', data.interactive.length, 'overflow', data.scrollWidth > data.innerWidth);
await b.close();
