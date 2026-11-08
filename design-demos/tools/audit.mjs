// Design QA substitute for design_lint.py (Python Playwright is unavailable here).
// Measures, on the rendered page: text font sizes, contrast ratios, touch targets,
// and reports template-decoration smells. Facts only — no taste judgements.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:\\Users\\kalbhairav\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe';

const target = process.argv[2];
if (!target) {
  console.error('usage: node audit.mjs <html-file>');
  process.exit(2);
}

const url = /^https?:\/\//.test(target)
  ? target
  : `file:///${path.resolve(target).replace(/\\/g, '/')}`;
const browser = await chromium.launch({ executablePath: fs.existsSync(CHROME) ? CHROME : undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

await page.goto(url, { waitUntil: 'load', timeout: 45000 });
await page.evaluate(async () => {
  if (document.fonts?.ready) await document.fonts.ready;
  await new Promise((r) => setTimeout(r, 600));
});

const report = await page.evaluate(() => {
  const srgb = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const parse = (css) => {
    const m = css.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
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

  // Resolve an opaque backdrop by walking ancestors.
  const backdrop = (el) => {
    let node = el;
    let acc = null;
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage && style.backgroundImage !== 'none') return { unknown: 'image' };
      const c = parse(style.backgroundColor);
      if (c && c.a > 0) {
        acc = acc ? blend(acc, c) : c;
        if (c.a >= 1) return acc;
      }
      node = node.parentElement;
    }
    return acc ? { ...acc, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
  };

  const textNodes = [];
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
    let contrast = null;
    if (!bg.unknown) contrast = ratio(blend(fg, bg), bg);
    textNodes.push({
      text: text.slice(0, 48),
      size: Math.round(size * 10) / 10,
      weight: style.fontWeight,
      contrast: contrast === null ? null : Math.round(contrast * 100) / 100,
      bgUnknown: Boolean(bg.unknown),
    });
  }

  const small = textNodes.filter((t) => t.size < 12);
  const lowContrast = textNodes.filter((t) => t.contrast !== null && t.contrast < 4.5 && t.size < 24);
  // Phone frames are CSS-scaled to fit the board; divide the measured box back out
  // so tap-target sizes are reported in real device dp.
  const scaleOf = (el) => {
    let s = 1;
    let node = el;
    while (node && node !== document.documentElement) {
      const t = getComputedStyle(node).transform;
      if (t && t !== 'none') {
        const m = t.match(/matrix\(([^)]+)\)/);
        if (m) {
          const parts = m[1].split(',').map(Number);
          if (parts[0] > 0) s *= parts[0];
        }
      }
      node = node.parentElement;
    }
    return s;
  };
  const tinyTargets = Array.from(document.querySelectorAll('button, a, [role=button], .key, .tap'))
    .map((el) => {
      const r = el.getBoundingClientRect();
      const s = scaleOf(el) || 1;
      return {
        label: (el.textContent || '').trim().slice(0, 30),
        w: Math.round(r.width / s),
        h: Math.round(r.height / s),
      };
    })
    .filter((t) => t.w > 0 && t.h > 0 && (t.w < 48 || t.h < 48));

  const phones = document.querySelectorAll('[data-phone], .phone, .device').length;

  // Template-decoration smells.
  const html = document.documentElement.outerHTML;
  const smells = [];
  if (/→/.test(html)) smells.push('arrow "→" used in copy');
  if (/A\s*·\s*B\s*·\s*C/.test(html)) smells.push('A · B · C scaffolding');
  if (/[\u{1F300}-\u{1FAFF}]/u.test(html)) smells.push('emoji present');
  const uppercaseLabels = Array.from(document.querySelectorAll('*')).filter((el) => {
    const s = getComputedStyle(el);
    return s.textTransform === 'uppercase' && parseFloat(s.fontSize) < 14 && el.children.length === 0;
  }).length;

  return {
    counts: { textNodes: textNodes.length, phones, uppercaseSmallLabels: uppercaseLabels },
    smallText: small.slice(0, 12),
    lowContrast: lowContrast.slice(0, 14),
    tinyTargets: tinyTargets.slice(0, 12),
    smells,
    totalSmall: small.length,
    totalLowContrast: lowContrast.length,
    totalTinyTargets: tinyTargets.length,
  };
});

await browser.close();

const file = path.basename(target);
console.log(`\n=== ${file} ===`);
console.log(`text nodes: ${report.counts.textNodes}   phone frames: ${report.counts.phones}   small uppercase labels: ${report.counts.uppercaseSmallLabels}`);
console.log(`font-size < 12px: ${report.totalSmall}`);
for (const t of report.smallText) console.log(`   ${t.size}px  "${t.text}"`);
console.log(`contrast < 4.5 (under 24px): ${report.totalLowContrast}`);
for (const t of report.lowContrast) console.log(`   ${t.contrast}:1  ${t.size}px  "${t.text}"`);
console.log(`tap targets under 48px: ${report.totalTinyTargets}`);
for (const t of report.tinyTargets) console.log(`   ${t.w}×${t.h}  "${t.label}"`);
console.log(`decoration smells: ${report.smells.length ? report.smells.join('; ') : 'none'}`);
console.log(`page errors: ${pageErrors.length ? pageErrors.join(' | ') : 'none'}`);

const hardFails = report.totalLowContrast + pageErrors.length;
process.exitCode = hardFails > 0 ? 1 : 0;
