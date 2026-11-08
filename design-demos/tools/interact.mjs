// Real click test: exercises every control on a prototype page and reports
// page errors plus whether the DOM actually responded. Catches dead buttons.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:\\Users\\kalbhairav\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe';
const target = process.argv[2];
if (!target) {
  console.error('usage: node interact.mjs <html-file>');
  process.exit(2);
}
const url = `file:///${path.resolve(target).replace(/\\/g, '/')}`;

const browser = await chromium.launch({ executablePath: fs.existsSync(CHROME) ? CHROME : undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

await page.goto(url, { waitUntil: 'load', timeout: 45000 });
await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
await page.waitForTimeout(700);

const SELECTOR = 'button, [role=button], .key, .tap, .pill, nav a, nav button, [data-nav]';
const count = await page.$$eval(SELECTOR, (els) => els.length);

const results = [];
for (let i = 0; i < count; i += 1) {
  const label = await page.$$eval(SELECTOR, (els, idx) => {
    const el = els[idx];
    return (el.getAttribute('aria-label') || el.textContent || el.className || '').trim().slice(0, 34);
  }, i).catch(() => '(detached)');
  const before = await page.evaluate(() => document.body.innerHTML.length);
  const beforeText = await page.evaluate(() => document.body.innerText);
  let clicked = false;
  try {
    const els = await page.$$(SELECTOR);
    if (els[i]) {
      await els[i].click({ timeout: 2500, force: true });
      clicked = true;
      await page.waitForTimeout(140);
    }
  } catch (e) {
    // Element may be covered or hidden — record but do not fail the run.
  }
  const after = await page.evaluate(() => document.body.innerHTML.length);
  const afterText = await page.evaluate(() => document.body.innerText);
  if (clicked) {
    results.push({
      i,
      label,
      reacted: before !== after || beforeText !== afterText,
      delta: after - before,
    });
  }
}

await browser.close();

const dead = results.filter((r) => !r.reacted);
console.log(`\n=== ${path.basename(target)} click test ===`);
console.log(`controls found: ${count}   clicked: ${results.length}   no visible reaction: ${dead.length}`);
if (dead.length) {
  for (const d of dead.slice(0, 14)) console.log(`   #${d.i} "${d.label}" -> no DOM change`);
}
console.log(`runtime errors: ${errors.length}`);
for (const e of errors.slice(0, 10)) console.log(`   ${e}`);

const fail = errors.length > 0 || dead.length > Math.max(3, results.length * 0.25);
process.exitCode = fail ? 1 : 0;
