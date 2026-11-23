// Confirms the loop modes count the chant, not the sitting clock.
//
// Auto and Timer are the two modes whose audio loops. The app must advance the
// count on real loop boundaries — the moment the clip wraps to its start — so
// the number can never outrun the sound. This check hooks the same element the
// app uses, counts its wraps independently, and compares.
//
//   APP_URL=http://127.0.0.1:5200/ node tools/check-auto-count.mjs
//   APP_URL=http://127.0.0.1:5200/ node tools/check-auto-count.mjs --full
//
// `--full` sits a whole Batuk mala through to the Blessing and proves the
// sitting ends on the 108th heard chant (about two minutes).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { resolveChrome } from './browser.mjs';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5200/';
const FULL = process.argv.includes('--full');
const OUT = path.resolve('.shots');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: resolveChrome() });

/** Watch the audio element the app constructs and count its real loop wraps. */
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 412, height: 892 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const W = window;
    W.__probe = { wraps: 0, last: 0 };
    const OrigAudio = W.Audio;
    W.Audio = function (...args) {
      const el = new OrigAudio(...args);
      el.addEventListener('timeupdate', () => {
        const cur = el.currentTime;
        // A backwards step while looping and playing is one finished chant.
        if (el.loop && !el.paused && cur + 0.05 < W.__probe.last) W.__probe.wraps += 1;
        W.__probe.last = cur;
      });
      return el;
    };
    W.Audio.prototype = OrigAudio.prototype;
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('.view.on', { timeout: 15000 });
  // A cold start waits for a tap; automation continues by itself after 1.5 s.
  await page.waitForTimeout(1800);
  return { page, errors };
}

async function begin(page, { modeIndex, deityIndex }) {
  await page.click('text=Altar');
  await page.locator('.mode-tile').nth(modeIndex).click();
  await page.locator('.plate').nth(deityIndex).click();
  await page.locator('button.pill', { hasText: 'Begin japa' }).click();
  await page.waitForSelector('.session.on', { timeout: 8000 });
}

/** Wait until the wrap counter has been still for two samples, then read both. */
async function settled(page) {
  let last = -1;
  let stable = 0;
  for (let i = 0; i < 40; i++) {
    const wraps = await page.evaluate(() => window.__probe.wraps);
    if (wraps === last) stable += 1;
    else stable = 0;
    last = wraps;
    if (stable >= 2) break;
    await page.waitForTimeout(300);
  }
  return page.evaluate(() => ({
    wraps: window.__probe.wraps,
    displayed: Number(document.querySelector('.session__num')?.textContent ?? 'NaN'),
  }));
}

const results = [];
async function checkMode(name, modeIndex, waitMs) {
  const { page, errors } = await openPage();
  await begin(page, { modeIndex, deityIndex: 0 });
  await page.waitForTimeout(waitMs);
  const { wraps, displayed } = await settled(page);
  await page.screenshot({ path: path.join(OUT, `auto-count-${modeIndex}.png`) });
  const audioOk = wraps > 0;
  const matchOk = Number.isFinite(displayed) && displayed === wraps;
  results.push({
    name: `${name}: count matches the chants actually heard`,
    pass: audioOk && matchOk,
    detail: `displayed ${displayed}, real chants heard ${wraps}`,
  });
  results.push({
    name: `${name}: no runtime errors`,
    pass: errors.length === 0,
    detail: errors.length ? errors.join(' | ') : 'none',
  });
  await page.evaluate(() => indexedDB.deleteDatabase('mantrini'));
  await page.close();
}

await checkMode('Auto', 3, 14_000);
await checkMode('Timer', 2, 10_000);

if (FULL) {
  const { page, errors } = await openPage();
  await begin(page, { modeIndex: 3, deityIndex: 1 }); // Auto, Batuk Bhairav
  const started = Date.now();
  const deadline = started + 150_000;
  while (Date.now() < deadline && (await page.locator('.session.on').count()) > 0) {
    await page.waitForTimeout(1000);
  }
  const seconds = (Date.now() - started) / 1000;
  const wraps = await page.evaluate(() => window.__probe.wraps);
  const blessing = (await page.locator('.blessing').innerText().catch(() => '')).replace(/\s+/g, ' ');
  const declared = /108\s+chants/.test(blessing);
  results.push({
    name: 'Auto full mala: Blessing declares the 108th heard chant',
    pass: declared && wraps === 108,
    detail: `blessing "${blessing.slice(0, 80)}"; real chants heard ${wraps}; ${seconds.toFixed(0)} s`,
  });
  results.push({
    name: 'Auto full mala: no runtime errors',
    pass: errors.length === 0,
    detail: errors.length ? errors.join(' | ') : 'none',
  });
  await page.screenshot({ path: path.join(OUT, 'auto-count-full-mala.png') });
  await page.evaluate(() => indexedDB.deleteDatabase('mantrini'));
  await page.close();
}

await browser.close();

console.log('\nAuto-count behaviour\n');
let failed = 0;
for (const r of results) {
  if (!r.pass) failed += 1;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}  (${r.detail})`);
}
console.log(failed === 0 ? '\nALL PASS' : `\n${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
