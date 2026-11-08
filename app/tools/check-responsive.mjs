// Responsive audit: at each width, report horizontal overflow and name the
// elements that stick out past the viewport. Also screenshots the awkward sizes.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { resolveChrome } from './browser.mjs';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5300/';
const OUT = path.resolve('.shots/responsive');
fs.mkdirSync(OUT, { recursive: true });

const WIDTHS = [320, 360, 390, 414, 480, 600, 768, 820, 900, 1024, 1200, 1440];

const browser = await chromium.launch({ executablePath: resolveChrome() });
const rows = [];

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(250);

  const report = await page.evaluate(() => {
    const doc = document.documentElement;
    const vw = window.innerWidth;
    const overflow = doc.scrollWidth - vw;
    const offenders = [];
    if (overflow > 1) {
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const right = r.right + window.scrollX;
        if (right > vw + 1) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className && String(el.className).slice(0, 40)) || '',
            right: Math.round(right),
            width: Math.round(r.width),
          });
        }
      }
    }
    return { vw, scrollWidth: doc.scrollWidth, overflow, offenders: offenders.slice(0, 6) };
  });

  rows.push({ width, ...report });
  if ([320, 390, 768, 820, 1024].includes(width)) {
    // Scroll the page first: below-the-fold images are loading="lazy" and stay
    // blank until they approach the viewport, which makes screenshots lie.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.75;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 70));
      }
      window.scrollTo(0, 0);
      await Promise.race([
        Promise.all(
          Array.from(document.images).map((img) =>
            img.complete
              ? null
              : new Promise((r) => {
                  img.onload = r;
                  img.onerror = r;
                }),
          ),
        ),
        new Promise((r) => setTimeout(r, 4000)),
      ]);
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `w${width}.png`), fullPage: true });
  }
  await page.close();
}

await browser.close();

console.log('\nwidth  scrollW  overflow  worst offenders');
for (const r of rows) {
  const flag = r.overflow > 1 ? 'OVERFLOW' : 'ok      ';
  console.log(`${String(r.width).padStart(5)}  ${String(r.scrollWidth).padStart(7)}  ${flag}  ${r.overflow > 1 ? '+' + r.overflow + 'px' : ''}`);
  for (const o of r.offenders) {
    console.log(`         ${o.tag}.${o.cls} right=${o.right} width=${o.width}`);
  }
}

const bad = rows.filter((r) => r.overflow > 1);
console.log(bad.length ? `\n${bad.length} width(s) overflow` : '\nno horizontal overflow at any tested width');
process.exitCode = bad.length ? 1 : 0;
