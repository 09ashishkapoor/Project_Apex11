// Walks the real app and captures each screen. Doubles as a smoke test:
// it fails on any page error or missing screen.
import { chromium } from 'playwright-core';
import { resolveChrome } from './browser.mjs';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5199/';
const OUT = path.resolve('.shots');
const WIDTH = Number(process.env.W ?? 412);
const HEIGHT = Number(process.env.H ?? 892);
const PREFIX = process.env.PREFIX ?? '';

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: resolveChrome() });
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});

async function shot(name) {
  await page.waitForTimeout(420);
  await page.screenshot({ path: path.join(OUT, `${PREFIX}${name}.png`) });
  console.log(`  captured ${name}`);
}

async function waitReady() {
  await page.waitForSelector('.view.on', { timeout: 15000 });
  await page.waitForTimeout(600);
}

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.evaluate(async () => {
  if (document.fonts?.ready) await document.fonts.ready;
});

console.log('walkthrough:');

// The branded opening screen. Capture it inside its minimum display window,
// before it hands over to Today — waiting on `load` can outlast the splash.
const sawSplash = await page
  .waitForSelector('.splash', { timeout: 4000 })
  .then(() => true)
  .catch(() => false);
if (sawSplash) {
  await page.waitForTimeout(420);
  await shot('00-splash');
}

await waitReady();
await shot('01-today');

// Today -> Altar
await page.click('text=Altar');
await page.waitForTimeout(320);
await shot('02-altar');

// pick the second deity and the audio mode, then back to a clear mode
await page.locator('.plate').nth(1).click();
await page.waitForTimeout(200);
await shot('03-altar-selected');

// start a manual session
await page.locator('.mode-tile').first().click();
await page.waitForTimeout(150);
await page.locator('button.pill', { hasText: 'Begin japa' }).click();
await page.waitForSelector('.session.on', { timeout: 8000 });
await page.waitForTimeout(500);
await shot('04-session');

// count a few
for (let i = 0; i < 7; i += 1) {
  await page.locator('.session__pill').click();
  await page.waitForTimeout(90);
}
await page.waitForTimeout(300);
await shot('05-session-counted');

// pause
await page.locator('.ctl', { hasText: 'Pause' }).click();
await page.waitForTimeout(250);
await shot('06-session-paused');

// resume then finish
await page.locator('.ctl', { hasText: 'Resume' }).click();
await page.waitForTimeout(200);
await page.locator('.session__finish').click();
await page.waitForSelector('.blessing.on', { timeout: 8000 });
await page.waitForTimeout(600);
await shot('07-blessing');

// back to the altar, then the ledger
await page.locator('.blessing__rest').click();
await page.waitForSelector('.today.on', { timeout: 8000 });
await page.waitForTimeout(500);
await shot('08-today-after');

await page.click('text=Ledger');
await page.waitForSelector('.ledger.on', { timeout: 8000 });
await page.waitForTimeout(600);
await shot('09-ledger');

// scroll the ledger to the bottom for the colophon
await page.evaluate(() => {
  const el = document.querySelector('.ledger');
  if (el) el.scrollTop = el.scrollHeight;
});
await page.waitForTimeout(400);
await shot('10-ledger-bottom');

await browser.close();

console.log(`\nerrors: ${errors.length}`);
for (const e of errors.slice(0, 12)) console.log(`  ${e}`);
process.exitCode = errors.length > 0 ? 1 : 0;
