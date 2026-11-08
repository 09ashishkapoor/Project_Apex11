// Records a vertical user journey for an Instagram Reel.
//
// Reels take MP4 (9:16, H.264), not GIF, so this records the journey with
// Playwright and leaves the conversion to the ffmpeg step in make-reel.sh.
// The video is silent on purpose: music is added in Instagram.
//
// The pacing is deliberately slower than a test would use â€” a reel has to be
// readable, and every screen needs long enough to register before the next tap.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { resolveChrome } from './browser.mjs';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5400/app/';
const OUT = path.resolve('.shots/reel');
const VIDEO_DIR = path.join(OUT, 'raw');

fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });

// Vertical phone geometry; the Reels 1080x1920 canvas is produced by ffmpeg.
const VIEWPORT = { width: 540, height: 960 };
// Playwright caps capture at the viewport size; ffmpeg upscales to 1080x1920.
const VIDEO = { width: 540, height: 960 };

const wait = (page, ms) => page.waitForTimeout(ms);

const browser = await chromium.launch({ executablePath: resolveChrome() });
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
  recordVideo: { dir: VIDEO_DIR, size: VIDEO },
  // A phone-shaped UA so the app renders its mobile layout.
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
});

const page = await context.newPage();

// Play like a devotee, not like a test: the app treats navigator.webdriver as an
// automated browser and skips the splash, which is the one screen the reel opens
// on. Overriding it restores the real cold-start behaviour.
await page.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  try {
    sessionStorage.clear();
    // Hide the install ask: it is a real part of the app, but a card explaining
    // where a browser menu is has no place in a promo.
    localStorage.setItem('mantrini.install-dismissed-at', String(Date.now()));
  } catch {
    /* ignore */
  }
});

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });

// --- the opening: darshan, then the devotee begins -------------------------
await page.waitForSelector('.splash', { timeout: 20000 });
await wait(page, 2600); // hold on the darshan
await page.locator('.splash__continue').click();
await page.waitForSelector('.view.on', { timeout: 10000 });
await wait(page, 2200); // Today, the lamp is lit

// --- choosing a path -------------------------------------------------------
await page.click('text=Altar');
await page.waitForSelector('.altar.on', { timeout: 10000 });
await wait(page, 1600);
await page.locator('.mode-tile').nth(0).click(); // Tap: beads fill as you count
await wait(page, 1200);
await page.locator('button.pill', { hasText: 'Begin japa' }).click();

// --- the counting surface --------------------------------------------------
await page.waitForSelector('.session.on', { timeout: 10000 });
await wait(page, 1200);
// Ten taps at a meditative pace: the seam lights bead by bead, which is the
// thing worth showing. Audio mode would look identical but count far slower,
// because there a count only lands when the mantra finishes.
for (let i = 0; i < 10; i += 1) {
  await page.locator('.session__pill').click();
  await wait(page, 320);
}
await wait(page, 700);

// --- the blessing: the offering --------------------------------------------
await page.locator('.session__finish').click();
await page.waitForSelector('.blessing.on', { timeout: 10000 });
await wait(page, 3600); // the beads fly; worth holding on
await page.locator('.blessing__rest').click();

// --- the ledger ------------------------------------------------------------
await page.waitForSelector('.today.on', { timeout: 10000 });
await wait(page, 700);
await page.click('text=Ledger');
await page.waitForSelector('.ledger.on', { timeout: 10000 });
await wait(page, 3200);
await page.click('text=Today');
await page.waitForSelector('.today.on', { timeout: 10000 });
await wait(page, 1800);

const video = page.video();
await context.close();
await browser.close();

const rawPath = video ? await video.path() : null;
if (!rawPath) throw new Error('no video recorded');
const target = path.join(OUT, 'journey.webm');
fs.copyFileSync(rawPath, target);

const size = fs.statSync(target).size;
console.log(`recorded  ${target}`);
console.log(`bytes     ${size}`);
console.log(`errors    ${errors.length ? errors.join(' | ') : 'none'}`);
