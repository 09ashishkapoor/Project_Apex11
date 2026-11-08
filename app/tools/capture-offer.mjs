// Captures the offering animation. Each frame is a fresh run to the Blessing
// screen, waited for exactly N ms, then screenshotted — so the real timers and
// the CSS timeline always agree. Pausing/stepping animations instead fights the
// store's setTimeout and produces frames from the wrong moment.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { resolveChrome } from './browser.mjs';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5200/';
const OUT = path.resolve('.shots');
fs.mkdirSync(OUT, { recursive: true });

// Milliseconds after the tap.
const BEATS = [0, 160, 320, 480, 640, 820, 1000, 1180, 1400, 1700];

const browser = await chromium.launch({ executablePath: resolveChrome() });
const errors = [];

async function toBlessing() {
  const page = await browser.newPage({
    viewport: { width: 412, height: 892 },
    deviceScaleFactor: 2,
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('.view.on', { timeout: 15000 });
  await page.click('text=Altar');
  await page.locator('button.pill', { hasText: 'Begin japa' }).click();
  await page.waitForSelector('.session.on');
  for (let i = 0; i < 5; i += 1) await page.locator('.session__pill').click();
  await page.locator('.session__finish').click();
  await page.waitForSelector('.blessing.on');
  await page.waitForTimeout(650);
  return page;
}

for (const ms of BEATS) {
  const page = await toBlessing();
  if (ms === 0) {
    await page.screenshot({ path: path.join(OUT, 'offer-0000-before.png') });
  } else {
    await page.evaluate(() => performance.mark('offer-start'));
    await page.locator('.blessing__rest').click({ noWaitAfter: true });
    await page.waitForTimeout(ms);
    await page.screenshot({ path: path.join(OUT, `offer-${String(ms).padStart(4, '0')}.png`) });
  }
  console.log(`captured ${ms}ms`);
  await page.close();
}

// And the landing, once, in real time.
const page = await toBlessing();
await page.locator('.blessing__rest').click({ noWaitAfter: true });
const landed = await page
  .waitForSelector('.today.on', { timeout: 8000 })
  .then(() => true)
  .catch(() => false);
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(OUT, 'offer-9000-landed.png') });
const todayText = await page.locator('.today').innerText().catch(() => '');
await page.close();

await browser.close();

console.log(`\nlanded on Today: ${landed}`);
console.log(`today shows: ${todayText.replace(/\s+/g, ' ').slice(0, 110)}`);
console.log(`runtime errors: ${errors.length ? errors.join(' | ') : 'none'}`);
process.exitCode = landed && errors.length === 0 ? 0 : 1;
