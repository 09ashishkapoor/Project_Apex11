// Verifies the platform behaviours that cannot be seen in a screenshot:
// persistent-storage request, screen wake lock during a session, and the
// iOS-only install hint. Run against `npm run preview`.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { resolveChrome } from './browser.mjs';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5200/';
const OUT = path.resolve('.shots');
fs.mkdirSync(OUT, { recursive: true });

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const browser = await chromium.launch({ executablePath: resolveChrome() });
const results = [];

// ---------------------------------------------------------------- desktop
{
  const page = await browser.newPage({ viewport: { width: 412, height: 892 } });
  await page.addInitScript(() => {
    window.__probe = { persist: 0, wakeRequests: 0, wakeReleases: 0 };
    const storage = navigator.storage;
    if (storage) {
      const persist = storage.persist?.bind(storage);
      storage.persist = async () => {
        window.__probe.persist += 1;
        return persist ? persist() : true;
      };
    }
    if (navigator.wakeLock) {
      const request = navigator.wakeLock.request.bind(navigator.wakeLock);
      navigator.wakeLock.request = async (type) => {
        window.__probe.wakeRequests += 1;
        const sentinel = await request(type);
        const release = sentinel.release.bind(sentinel);
        sentinel.release = async () => {
          window.__probe.wakeReleases += 1;
          return release();
        };
        return sentinel;
      };
    }
  });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForSelector('.view.on');
  await page.waitForTimeout(700);

  const bootProbe = await page.evaluate(() => window.__probe);

  // Begin a session and confirm the wake lock is taken.
  await page.click('text=Altar');
  await page.locator('button.pill', { hasText: 'Begin japa' }).click();
  await page.waitForSelector('.session.on');
  await page.waitForTimeout(600);
  const duringSession = await page.evaluate(() => window.__probe);

  // Pause it and confirm the lock is handed back.
  await page.locator('.ctl', { hasText: 'Pause' }).click();
  await page.waitForTimeout(400);
  const afterPause = await page.evaluate(() => window.__probe);

  results.push({
    name: 'persistent storage requested on boot',
    pass: bootProbe.persist >= 1,
    detail: `persist() calls: ${bootProbe.persist}`,
  });
  results.push({
    name: 'wake lock taken when a session starts',
    pass: duringSession.wakeRequests >= 1,
    detail: `wakeLock.request calls: ${duringSession.wakeRequests}`,
  });
  results.push({
    name: 'wake lock released on pause',
    pass: afterPause.wakeReleases >= 1,
    detail: `release calls: ${afterPause.wakeReleases}`,
  });
  results.push({
    name: 'no install hint on desktop',
    pass: (await page.locator('.install-hint').count()) === 0,
    detail: 'desktop UA',
  });

  // Clear the session so the run is repeatable.
  await page.evaluate(() => indexedDB.deleteDatabase('mantrini'));
  await page.close();
}

// ------------------------------------------------------------------- iOS
{
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    userAgent: IPHONE_UA,
    isMobile: true,
    hasTouch: true,
  });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForSelector('.view.on');
  await page.waitForTimeout(800);
  const hint = await page.locator('.install-hint').count();
  await page.screenshot({ path: path.join(OUT, 'ios-today.png') });
  results.push({
    name: 'install hint shown on iOS Safari',
    pass: hint === 1,
    detail: `.install-hint count: ${hint}`,
  });

  // The hint must be dismissible and stay dismissed.
  if (hint === 1) {
    await page.locator('.install-hint__close').click();
    await page.waitForTimeout(200);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(800);
    const afterReload = await page.locator('.install-hint').count();
    results.push({
      name: 'install hint stays dismissed',
      pass: afterReload === 0,
      detail: `after reload: ${afterReload}`,
    });
  }
  await page.evaluate(() => indexedDB.deleteDatabase('mantrini'));
  await page.close();
}

await browser.close();

console.log('\nMANTRINI platform checks\n');
let failed = 0;
for (const r of results) {
  if (!r.pass) failed += 1;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}  (${r.detail})`);
}
console.log(failed === 0 ? '\nALL PASS' : `\n${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
