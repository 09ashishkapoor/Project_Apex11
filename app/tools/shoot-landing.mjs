// Screenshots the landing page from an already-running local server.
// Assemble the site and start a server first (see tools/preview-landing.sh):
//   docs/ -> site root, app/dist -> site/app
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { resolveChrome } from './browser.mjs';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5300/';
const OUT = path.resolve('.shots');
fs.mkdirSync(OUT, { recursive: true });

const shots = [
  { width: 1440, height: 900, name: 'landing-desktop.png', full: true },
  { width: 1440, height: 900, name: 'landing-desktop-fold.png', full: false },
  { width: 390, height: 844, name: 'landing-mobile.png', full: true },
  { width: 820, height: 1180, name: 'landing-tablet.png', full: true },
];

const browser = await chromium.launch({ executablePath: resolveChrome() });
const errors = [];

for (const { width, height, name, full } of shots) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`${name}: failed ${r.url()}`));
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });

  // Trigger lazy images by walking the page, then return to the top. Waiting on
  // `document.images` without this hangs forever: below-the-fold images with
  // loading="lazy" never fire load until they are near the viewport.
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
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
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, name), fullPage: full });
  console.log(`captured ${name}`);
  await page.close();
}

// Does the primary action actually reach the app?
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => errors.push(`cta: ${e.message}`));
await page.goto(BASE, { waitUntil: 'load' });
await page.locator('a.button').first().click();
await page.waitForTimeout(2500);
const appLoaded = await page.locator('#app .view, .view').count().catch(() => 0);
console.log(`\nprimary CTA -> ${page.url()}`);
console.log(`app booted: ${appLoaded > 0 ? 'yes' : 'NO'}`);
await page.screenshot({ path: path.join(OUT, 'landing-cta-target.png') });
await page.close();

await browser.close();

console.log(`\npage errors: ${errors.length ? errors.join(' | ') : 'none'}`);
process.exitCode = errors.length === 0 && appLoaded > 0 ? 0 : 1;
