// Proves the app works offline: install the service worker, cut the network,
// reload, then walk every screen, run a session, play the chant, and confirm the
// ledger survived. Also confirms the offline emulation is real by checking that
// an external URL fails.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { resolveChrome } from './browser.mjs';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5200/';
const OUT = path.resolve('.shots/offline');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: resolveChrome() });
const context = await browser.newContext({ viewport: { width: 412, height: 892 } });
const page = await context.newPage();

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

const results = [];
const check = (name, pass, detail) => results.push({ name, pass, detail });

// ---------------------------------------------------------------- online
await page.goto(BASE, { waitUntil: 'load', timeout: 45000 });
await page.waitForSelector('.view.on', { timeout: 15000 });

const registered = await page
  .evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return Boolean(reg.active || reg.installing || reg.waiting);
  })
  .catch(() => false);
check('service worker installs', registered, registered ? 'registered' : 'not registered');

// Precaching happens during install; give the worker room to finish before the
// first controlled navigation.
await page.waitForTimeout(3000);
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('.view.on');
await page.waitForTimeout(600);

const controlling = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
check('page is controlled by the worker', controlling, String(controlling));

// --------------------------------------------------------------- offline
await context.setOffline(true);
await page.waitForTimeout(300);

const offlineFlag = await page.evaluate(() => navigator.onLine === false);
check('network is actually off', offlineFlag, `navigator.onLine === ${!offlineFlag}`);

let externalFailed = false;
try {
  await page.goto('https://example.com', { timeout: 8000, waitUntil: 'domcontentloaded' });
} catch {
  externalFailed = true;
}
check('external sites are unreachable', externalFailed, externalFailed ? 'blocked' : 'still reachable');

// Reload the app with no network at all.
const offlineLoadStart = Date.now();
await page.goto(BASE, { waitUntil: 'load', timeout: 20000 }).catch(() => {});
const booted = await page
  .waitForSelector('.view.on', { timeout: 12000 })
  .then(() => true)
  .catch(() => false);
check('cold reload with no network boots', booted, `${Date.now() - offlineLoadStart} ms`);
await page.screenshot({ path: path.join(OUT, 'offline-today.png') });

if (booted) {
  // Fonts must come from the cache, or the mantras render as boxes offline.
  const fontsReady = await page.evaluate(() => ({
    display: document.fonts.check('16px "Philosopher"'),
    deva: document.fonts.check('16px "Noto Sans Devanagari"'),
    body: document.fonts.check('16px "Crimson Text"'),
  }));
  check(
    'all three brand fonts load from cache',
    fontsReady.display && fontsReady.deva && fontsReady.body,
    JSON.stringify(fontsReady),
  );

  // Audio must be served from the cache, not the network.
  const audio = await page.evaluate(async () => {
    try {
      const res = await fetch('audio/adya-mahakali.mp3');
      const buf = await res.arrayBuffer();
      return { ok: res.ok, bytes: buf.byteLength };
    } catch (error) {
      return { ok: false, bytes: 0, error: String(error) };
    }
  });
  check('chant audio is cached', audio.ok && audio.bytes > 10_000, `${audio.bytes} bytes`);

  // Altar: the deity photographs must render from cache.
  await page.click('text=Altar');
  await page.waitForSelector('.altar.on', { timeout: 8000 });
  await page.waitForTimeout(700);
  const imagesLoaded = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.plate__photo img')).map(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  );
  check(
    'deity photographs render',
    imagesLoaded.length === 4 && imagesLoaded.every(Boolean),
    `${imagesLoaded.filter(Boolean).length}/${imagesLoaded.length} loaded`,
  );
  await page.screenshot({ path: path.join(OUT, 'offline-altar.png') });

  // Run a session end to end with no network.
  // Tap mode: the default is Audio, where a count only lands when the chant
  // finishes, which would make this offline count non-deterministic.
  await page.locator('.mode-tile').nth(0).click();
  await page.locator('button.pill', { hasText: 'Begin japa' }).click();
  await page.waitForSelector('.session.on', { timeout: 8000 });
  await page.waitForTimeout(400);
  for (let i = 0; i < 4; i += 1) await page.locator('.session__pill').click();
  const counted = await page.locator('.session__num').innerText();
  check('counting works offline', Number(counted) === 4, `count ${counted}`);
  await page.screenshot({ path: path.join(OUT, 'offline-session.png') });

  await page.locator('.session__finish').click();
  await page.waitForSelector('.blessing.on', { timeout: 8000 });
  await page.screenshot({ path: path.join(OUT, 'offline-blessing.png') });

  await page.locator('.blessing__rest').click();
  await page.waitForSelector('.today.on', { timeout: 8000 });

  // The offering animation must not depend on anything remote.
  const ledgerBefore = await page.evaluate(async () => {
    const request = indexedDB.open('mantrini');
    const db = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      setTimeout(() => reject(new Error('idb timeout')), 5000);
    });
    const tx = db.transaction('sessions', 'readonly');
    const rows = await new Promise((resolve, reject) => {
      const get = tx.objectStore('sessions').getAll();
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
    });
    db.close();
    return rows.length;
  });
  check('session is written to IndexedDB offline', ledgerBefore >= 1, `${ledgerBefore} row(s)`);

  // Reload once more with the network still off: the work should still be there.
  await page.goto(BASE, { waitUntil: 'load', timeout: 20000 });
  await page.waitForSelector('.view.on', { timeout: 12000 });
  await page.waitForTimeout(700);
  await page.click('text=Ledger');
  await page.waitForSelector('.ledger.on', { timeout: 8000 });
  await page.waitForTimeout(500);
  const ledgerText = await page.locator('.ledger').innerText();
  const showsToday = /\b[1-9]\d*\b\s*today/.test(ledgerText.replace(/\n/g, ' '));
  check('ledger still shows the work after an offline reload', showsToday, ledgerText.split('\n').slice(0, 6).join(' | '));
  await page.screenshot({ path: path.join(OUT, 'offline-ledger.png') });
}

check('no runtime errors', pageErrors.length === 0, pageErrors.join(' | ') || 'none');

await context.setOffline(false);
await browser.close();

console.log('\nOffline behaviour\n');
let failed = 0;
for (const r of results) {
  if (!r.pass) failed += 1;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(46)} ${r.detail}`);
}
console.log(`\nscreenshots: ${OUT}`);
console.log(failed === 0 ? '\nALL PASS' : `\n${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
