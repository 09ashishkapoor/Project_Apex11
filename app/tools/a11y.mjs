// Accessibility audit across every screen of the real app.
// Measures text size, contrast against the composed backdrop, and tap targets.
import { chromium } from 'playwright-core';
import { resolveChrome } from './browser.mjs';
import fs from 'node:fs';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5200/';

const MEASURE = () => {
  const srgb = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const parse = (css) => {
    const m = css.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => 0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255);
  const ratio = (fg, bg) => {
    const a = lum(fg) + 0.05;
    const b = lum(bg) + 0.05;
    return a > b ? a / b : b / a;
  };
  const blend = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const backdrop = (el) => {
    let node = el;
    let acc = null;
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage && style.backgroundImage !== 'none' && node !== document.body) {
        return { unknown: 'image' };
      }
      const c = parse(style.backgroundColor);
      if (c && c.a > 0) {
        acc = acc ? blend(acc, c) : c;
        if (c.a >= 1) return acc;
      }
      node = node.parentElement;
    }
    return acc ? { ...acc, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
  };

  const out = { low: [], small: [], targets: [] };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent.trim();
    if (!text) continue;
    const el = walker.currentNode.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue;
    const size = parseFloat(style.fontSize);
    const fg = parse(style.color);
    if (!fg) continue;
    const bg = backdrop(el);
    const label = text.slice(0, 30);
    if (size < 12) out.small.push({ size, label });
    if (!bg.unknown) {
      const c = ratio(blend(fg, bg), bg);
      if (c < 4.5 && size < 24) out.low.push({ contrast: Math.round(c * 100) / 100, size, label });
    }
  }

  const scaleOf = (el) => {
    let s = 1;
    let node = el;
    while (node && node !== document.documentElement) {
      const t = getComputedStyle(node).transform;
      if (t && t !== 'none') {
        const m = t.match(/matrix\(([^)]+)\)/);
        if (m) {
          const p = m[1].split(',').map(Number);
          if (p[0] > 0) s *= p[0];
        }
      }
      node = node.parentElement;
    }
    return s;
  };
  for (const el of document.querySelectorAll('button, a, [role=button], [role=radio]')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const s = scaleOf(el) || 1;
    const w = r.width / s;
    const h = r.height / s;
    if (w < 44 || h < 44) {
      out.targets.push({ w: Math.round(w), h: Math.round(h), label: (el.textContent || '').trim().slice(0, 26) });
    }
  }
  return out;
};

const browser = await chromium.launch({ executablePath: resolveChrome() });
const page = await browser.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 1 });

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(BASE, { waitUntil: 'load', timeout: 45000 });
await page.evaluate(async () => {
  if (document.fonts?.ready) await document.fonts.ready;
});

const results = [];

async function audit(name, delay = 450) {
  await page.waitForTimeout(delay);
  const r = await page.evaluate(MEASURE);
  results.push({ name, ...r });
}

// Audit the branded opening screen before it hands over to Today.
if (await page.locator('.splash').count()) {
  await audit('splash', 350);
  await page.waitForSelector('.view.on', { timeout: 15000 });
  await page.waitForTimeout(400);
}

await audit('today');
await page.click('text=Altar');
await audit('altar');
await page.locator('button.pill', { hasText: 'Begin japa' }).click();
await page.waitForSelector('.session.on');
await audit('session');
for (let i = 0; i < 4; i += 1) await page.locator('.session__pill').click();
await audit('session-counted');
await page.locator('.session__finish').click();
await page.waitForSelector('.blessing.on');
await audit('blessing');
await page.locator('.blessing__rest').click();
await page.click('text=Ledger');
await page.waitForSelector('.ledger.on');
await audit('ledger');

await browser.close();

let failures = 0;
console.log(`\nMANTRINI a11y audit — ${BASE}\n`);
for (const r of results) {
  const bad = r.low.length + r.small.length + r.targets.length;
  failures += bad;
  console.log(`${bad === 0 ? 'PASS' : 'FAIL'}  ${r.name}`);
  for (const t of r.low) console.log(`        contrast ${t.contrast}:1  ${t.size}px  "${t.label}"`);
  for (const t of r.small) console.log(`        font ${t.size}px  "${t.label}"`);
  for (const t of r.targets) console.log(`        target ${t.w}x${t.h}  "${t.label}"`);
}
console.log(`\nruntime errors: ${errors.length}`);
for (const e of errors.slice(0, 8)) console.log(`  ${e}`);
console.log(failures === 0 && errors.length === 0 ? '\nALL PASS' : `\n${failures} issue(s)`);
process.exitCode = failures === 0 && errors.length === 0 ? 0 : 1;
