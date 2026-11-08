// Blocks the chant audio entirely, then checks that Auto and Timer sessions
// still count. This is the failure the old build hid: without a fallback
// cadence the derived count stays at zero and the session never completes.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { resolveChrome } from './browser.mjs';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5200/';
const OUT = path.resolve('.shots');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: resolveChrome() });
const results = [];

async function sessionWithBlockedAudio(modeIndex, waitMs, { pressChant = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 412, height: 892 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // Every chant file fails to load: play() rejects, duration stays unknown.
  await page.route('**/audio/*.mp3', (route) => route.abort());
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('.view.on', { timeout: 15000 });

  await page.click('text=Altar');
  await page.locator('.mode-tile').nth(modeIndex).click();
  await page.locator('button.pill', { hasText: 'Begin japa' }).click();
  await page.waitForSelector('.session.on', { timeout: 8000 });

  // The failure notice only lives for ~2.6 s, so read it immediately.
  await page.waitForTimeout(500);
  const toast = await page.locator('.toast').innerText().catch(() => '');

  if (pressChant) {
    await page.locator('.session__pill').click();
    await page.waitForTimeout(600);
  }

  await page.waitForTimeout(waitMs);
  const count = await page.locator('.session__num').innerText().catch(() => '?');
  const meta = await page.locator('.session__meta').innerText().catch(() => '');
  await page.screenshot({ path: path.join(OUT, `audio-blocked-${modeIndex}.png`) });

  await page.evaluate(() => indexedDB.deleteDatabase('mantrini'));
  await page.close();
  return { count, meta, toast, errors };
}

// 0 = Tap, 1 = Audio, 2 = Timer, 3 = Auto
const auto = await sessionWithBlockedAudio(3, 5000);
results.push({
  name: 'Auto mode still counts with no audio',
  pass: Number(auto.count) > 0,
  detail: `count after 5s: ${auto.count}  (${auto.meta.replace(/\s+/g, ' ')})`,
});
results.push({
  name: 'Auto mode explains the failure honestly',
  pass: /mantra's pace/i.test(auto.toast),
  detail: `toast: "${auto.toast}"`,
});

const timed = await sessionWithBlockedAudio(2, 4000);
results.push({
  name: 'Timer mode still counts with no audio',
  pass: Number(timed.count) > 0,
  detail: `count after 4s: ${timed.count}  (${timed.meta.replace(/\s+/g, ' ')})`,
});

const audio = await sessionWithBlockedAudio(1, 300, { pressChant: true });
results.push({
  name: 'Audio mode does not stall when a chant will not play',
  pass: Number(audio.count) > 0,
  detail: `count after one press: ${audio.count}`,
});

const allErrors = [...auto.errors, ...timed.errors, ...audio.errors];
results.push({
  name: 'no runtime errors',
  pass: allErrors.length === 0,
  detail: allErrors.length ? allErrors.join(' | ') : 'none',
});

await browser.close();

console.log('\nAudio-failure behaviour\n');
let failed = 0;
for (const r of results) {
  if (!r.pass) failed += 1;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}  (${r.detail})`);
}
console.log(failed === 0 ? '\nALL PASS' : `\n${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
