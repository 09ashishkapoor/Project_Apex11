// Confirms the re-encoded clips decode in a browser, report the durations the
// app relies on, and that an Audio-mode chant actually advances the count.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { resolveChrome } from './browser.mjs';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5200/';
const OUT = path.resolve('.shots');

const browser = await chromium.launch({ executablePath: resolveChrome() });
const page = await browser.newPage({ viewport: { width: 412, height: 892 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForSelector('.view.on', { timeout: 15000 });

// Decode every clip and report metadata + measured duration.
const decoded = await page.evaluate(async () => {
  const files = [
    'audio/adya-mahakali.mp3',
    'audio/batuk-bhairav.mp3',
    'audio/swarnaakarshana-bhairav.mp3',
    'audio/skanda-bhairav.mp3',
  ];
  const rows = [];
  for (const src of files) {
    const result = await new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.addEventListener('loadedmetadata', () =>
        resolve({ ok: true, duration: audio.duration }),
      );
      audio.addEventListener('error', () => resolve({ ok: false, duration: 0 }));
      audio.src = src;
      setTimeout(() => resolve({ ok: false, duration: 0 }), 8000);
    });
    rows.push({ src, ...result });
  }
  return rows;
});

// Play one real chant in Audio mode and watch the count move.
await page.click('text=Altar');
await page.locator('.mode-tile').nth(1).click();
await page.locator('button.pill', { hasText: 'Begin japa' }).click();
await page.waitForSelector('.session.on', { timeout: 8000 });
await page.waitForTimeout(400);
await page.locator('.session__pill').click();
// Adya Mahakali's clip is 2.47 s; give it room to finish and register.
await page.waitForTimeout(3400);
const audioCount = await page.locator('.session__num').innerText().catch(() => '?');
const audioMeta = await page.locator('.session__meta').innerText().catch(() => '');
await page.screenshot({ path: path.join(OUT, 'audio-mode-playing.png') });
await page.evaluate(() => indexedDB.deleteDatabase('mantrini'));

await browser.close();

console.log('\nRe-encoded clips\n');
let failed = 0;
for (const row of decoded) {
  const name = row.src.replace('audio/', '');
  const ok = row.ok && row.duration > 0.5;
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(34)} ${row.duration.toFixed(3)}s`);
}

const countOk = Number(audioCount) > 0;
if (!countOk) failed += 1;
console.log(`\n${countOk ? 'PASS' : 'FAIL'}  Audio mode counted one real chant  (count ${audioCount}, ${audioMeta.replace(/\s+/g, ' ')})`);

const noErrors = errors.length === 0;
if (!noErrors) failed += 1;
console.log(`${noErrors ? 'PASS' : 'FAIL'}  no runtime errors  (${errors.length ? errors.join(' | ') : 'none'})`);

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
