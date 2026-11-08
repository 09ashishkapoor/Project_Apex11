// Records two promo clips from the real app:
//
//   loop.webm   ~4s of beads filling, for a short silent loop (Stories, site)
//   auto.webm   the auto-count mode, for a clip that gets the chant audio muxed
//               against it afterwards by build-promo.py
//
// Playwright records video only — there is no audio in the capture — so the
// timing of the moment the chant starts is written to a sidecar next to each
// clip and build-promo.py lays the real mp3 against it.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { resolveChrome } from './browser.mjs';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5400/app/';
const OUT = path.resolve('.shots/promo');
const VIEWPORT = { width: 540, height: 960 };
const VIDEO = { width: 540, height: 960 };
const PHONE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';

const wait = (page, ms) => page.waitForTimeout(ms);

/** Behaves like a devotee, and keeps promo-irrelevant chrome off camera. */
const AS_DEVOTEE = () => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  try {
    sessionStorage.clear();
    localStorage.setItem('mantrini.install-dismissed-at', String(Date.now()));
  } catch {
    /* ignore */
  }
};

async function record(name, drive) {
  const dir = path.join(OUT, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch({ executablePath: resolveChrome() });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    recordVideo: { dir, size: VIDEO },
    userAgent: PHONE_UA,
  });
  const page = await context.newPage();
  await page.addInitScript(AS_DEVOTEE);

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  // Video timestamps start at page creation, so every offset is measured from here.
  const zero = Date.now();

  const marks = await drive(page, zero);

  const video = page.video();
  await context.close();
  await browser.close();

  const raw = await video.path();
  const target = path.join(OUT, `${name}.webm`);
  fs.copyFileSync(raw, target);
  fs.writeFileSync(
    path.join(OUT, `${name}.json`),
    JSON.stringify({ clip: name, marks, errors }, null, 2) + '\n',
  );
  console.log(`${name}: ${fs.statSync(target).size} bytes, marks ${JSON.stringify(marks)}, errors ${errors.length}`);
}

// --- 1. the loop: beads filling, nothing else -------------------------------
await record('loop', async (page, zero) => {
  await page.waitForSelector('.splash', { timeout: 20000 });
  await wait(page, 500);
  await page.locator('.splash__continue').click();
  await page.waitForSelector('.view.on', { timeout: 10000 });
  await page.click('text=Altar');
  await page.waitForSelector('.altar.on', { timeout: 10000 });
  await page.locator('.mode-tile').nth(0).click();
  await wait(page, 400);
  await page.locator('button.pill', { hasText: 'Begin japa' }).click();
  await page.waitForSelector('.session.on', { timeout: 10000 });
  const start = Date.now() - zero;
  await wait(page, 350);
  for (let i = 0; i < 13; i += 1) {
    await page.locator('.session__pill').click();
    await wait(page, 260);
  }
  await wait(page, 600);
  return { start, end: Date.now() - zero };
});

// --- 3. slow: four mantras, then the offering ------------------------------
// Audio mode rather than Tap: each chant sounds for its full length and only
// then counts, so the rhythm is the mantra's own. Rushing this was the whole
// problem with the first cut.
await record('slow', async (page, zero) => {
  await page.waitForSelector('.splash', { timeout: 20000 });
  await wait(page, 900);
  await page.locator('.splash__continue').click();
  await page.waitForSelector('.view.on', { timeout: 10000 });
  await wait(page, 800);
  await page.click('text=Altar');
  await page.waitForSelector('.altar.on', { timeout: 10000 });
  await page.locator('.mode-tile').nth(1).click();
  await wait(page, 900);
  await page.locator('button.pill', { hasText: 'Begin japa' }).click();
  await page.waitForSelector('.session.on', { timeout: 10000 });
  await wait(page, 1000);

  const chantTimes = [];
  for (let i = 0; i < 4; i += 1) {
    chantTimes.push(Date.now() - zero);
    await page.locator('.session__pill').click();
    await wait(page, 3200); // the mantra plays out, then a breath
  }

  const offered = Date.now() - zero;
  await page.locator('.session__finish').click();
  await page.waitForSelector('.blessing.on', { timeout: 10000 });
  await wait(page, 4400); // hold on the offering
  return { chantTimes, chantLen: 2.47, offered };
});
await record('auto', async (page, zero) => {
  await page.waitForSelector('.splash', { timeout: 20000 });
  await wait(page, 900);
  await page.locator('.splash__continue').click();
  await page.waitForSelector('.view.on', { timeout: 10000 });
  await wait(page, 700);
  await page.click('text=Altar');
  await page.waitForSelector('.altar.on', { timeout: 10000 });
  await page.locator('.mode-tile').nth(3).click(); // Auto
  await wait(page, 900);
  const chantStart = Date.now() - zero;
  await page.locator('button.pill', { hasText: 'Begin japa' }).click();
  await page.waitForSelector('.session.on', { timeout: 10000 });
  await wait(page, 14000); // let the mala count itself for a while
  const chantEnd = Date.now() - zero;
  await page.locator('.session__finish').click();
  await page.waitForSelector('.blessing.on', { timeout: 10000 });
  await wait(page, 2600);
  return { chantStart, chantEnd, deityAudio: 'audio/adya-mahakali.mp3' };
});
