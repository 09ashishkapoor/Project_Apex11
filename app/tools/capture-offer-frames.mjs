// Captures the offering as a dense frame sequence for animation playback.
// Each frame is an independent run so the CSS timeline and the store's timers
// always agree — stepping animations instead fights the real setTimeout.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { resolveChrome } from './browser.mjs';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5200/';
const OUT = path.resolve('.shots/frames');
const STEP = Number(process.env.STEP ?? 90);
const COUNT = Number(process.env.COUNT ?? 21);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: resolveChrome() });
const errors = [];

async function toBlessing() {
  const page = await browser.newPage({
    viewport: { width: 412, height: 892 },
    deviceScaleFactor: 1,
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

for (let i = 0; i < COUNT; i += 1) {
  const ms = i * STEP;
  const page = await toBlessing();
  if (ms > 0) {
    await page.locator('.blessing__rest').click({ noWaitAfter: true });
    await page.waitForTimeout(ms);
  }
  await page.screenshot({ path: path.join(OUT, `f-${String(i).padStart(3, '0')}.png`) });
  await page.close();
  if (i % 5 === 0) console.log(`frame ${i} (${ms}ms)`);
}

await browser.close();
console.log(`\n${COUNT} frames at ${STEP}ms -> ${OUT}`);
console.log(`runtime errors: ${errors.length ? errors.join(' | ') : 'none'}`);
