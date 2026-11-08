// Checks the install prompt in a real browser, since the browser is the only
// place beforeinstallprompt exists. Chromium fires it only when the app
// genuinely qualifies and with real engagement history, which a fresh profile
// never has — so the event is synthesised here and the app's behaviour is
// checked from there.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { resolveChrome } from './browser.mjs';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5300/app/';
const OUT = path.resolve('.shots');
fs.mkdirSync(OUT, { recursive: true });

// Fire a fake install event the way Chrome would, after the app is listening.
// Plain JS: this function is serialised into the page.
const SYNTHESISE = () => {
  window.__installPrompted = 0;
  window.addEventListener('load', () => {
    setTimeout(() => {
      const event = new Event('beforeinstallprompt');
      event.prompt = () => {
        window.__installPrompted += 1;
        return Promise.resolve();
      };
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    }, 300);
  });
};

const browser = await chromium.launch({ executablePath: resolveChrome() });
const results = [];

async function open({ completeSession }) {
  const context = await browser.newContext({ viewport: { width: 412, height: 892 } });
  await context.addInitScript(SYNTHESISE);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('.view.on', { timeout: 15000 });
  await page.waitForTimeout(700); // let the synthetic event land
  return { context, page, errors };
}

// 1. A brand-new devotee must not be asked to install.
{
  const { context, page, errors } = await open({ completeSession: false });
  const visible = await page.locator('.install-hint').count();
  results.push({
    name: 'nothing is offered before the first sitting',
    pass: visible === 0,
    detail: `${visible} card(s)`,
  });
  results.push({ name: 'no runtime errors (fresh)', pass: errors.length === 0, detail: errors.join(' | ') || 'none' });
  await context.close();
}

// 2. After a completed sitting the card appears, and Install calls the prompt.
{
  const { context, page, errors } = await open({ completeSession: true });
  await page.click('text=Altar');
  await page.locator('button.pill', { hasText: 'Begin japa' }).click();
  await page.waitForSelector('.session.on', { timeout: 8000 });
  await page.waitForTimeout(400);
  for (let i = 0; i < 2; i += 1) await page.locator('.session__pill').click();
  await page.locator('.session__finish').click();
  await page.waitForSelector('.blessing.on', { timeout: 8000 });
  await page.locator('.blessing__rest').click();
  await page.waitForSelector('.today.on', { timeout: 8000 });
  await page.waitForTimeout(500);

  const card = page.locator('.install-hint');
  const shown = (await card.count()) > 0;
  results.push({ name: 'offered after a completed sitting', pass: shown, detail: shown ? 'card visible' : 'card missing' });

  if (shown) {
    await page.screenshot({ path: path.join(OUT, 'install-prompt.png') });
    const hasInstall = (await page.locator('.install-hint__go').count()) > 0;
    results.push({ name: 'shows an Install button when the browser can prompt', pass: hasInstall, detail: hasInstall ? 'present' : 'missing' });

    if (hasInstall) {
      await page.locator('.install-hint__go').click();
      await page.waitForTimeout(300);
      const prompted = await page.evaluate(() => window.__installPrompted ?? 0);
      results.push({ name: 'Install opens the browser prompt', pass: prompted === 1, detail: `prompt() called ${prompted}x` });
      const goneAfterInstall = (await page.locator('.install-hint').count()) === 0;
      results.push({ name: 'card disappears once accepted', pass: goneAfterInstall, detail: goneAfterInstall ? 'hidden' : 'still visible' });
    }

    if (!hasInstall) {
      // iOS path: instructions, and no dead button.
      const text = await card.innerText();
      const letters = /Add to Home Screen/i.test(text);
      results.push({ name: 'explains Share → Add to Home Screen on iOS', pass: letters, detail: letters ? 'instructions shown' : 'missing' });
    }
  }
  results.push({ name: 'no runtime errors (after sitting)', pass: errors.length === 0, detail: errors.join(' | ') || 'none' });
  await context.close();
}

// 3. "Not now" must stick across a reload.
{
  const { context, page } = await open({ completeSession: true });
  await page.click('text=Altar');
  await page.locator('button.pill', { hasText: 'Begin japa' }).click();
  await page.waitForSelector('.session.on', { timeout: 8000 });
  // Record at least one chant: finishing an empty sitting is discarded, so the
  // card would never be offered and the dismissal could not be tested.
  await page.waitForTimeout(400);
  for (let i = 0; i < 2; i += 1) await page.locator('.session__pill').click();
  await page.locator('.session__finish').click();
  await page.waitForSelector('.blessing.on', { timeout: 8000 });
  await page.locator('.blessing__rest').click();
  await page.waitForSelector('.today.on', { timeout: 8000 });
  await page.waitForTimeout(400);
  const before = (await page.locator('.install-hint').count()) > 0;
  if (before) {
    await page.locator('.install-hint__close').click();
    await page.waitForTimeout(200);
  }
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.view.on', { timeout: 15000 });
  await page.waitForTimeout(900);
  const after = (await page.locator('.install-hint').count()) > 0;
  results.push({
    name: '"Not now" is remembered across a reload',
    pass: before && !after,
    detail: before ? (after ? 'card came back' : 'stayed hidden') : 'card never appeared',
  });
  await context.close();
}

await browser.close();

console.log('\nInstall prompt\n');
let failed = 0;
for (const r of results) {
  if (!r.pass) failed += 1;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(54)} ${r.detail}`);
}
console.log(failed === 0 ? '\nALL PASS' : `\n${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
