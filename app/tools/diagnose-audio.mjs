// Diagnose the audio failure in the local preview: what does the browser
// actually say when it tries to start the chant?
import { chromium } from 'playwright-core';
import { resolveChrome } from './browser.mjs';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5300/';
const browser = await chromium.launch({ executablePath: resolveChrome() });
const page = await browser.newPage({ viewport: { width: 412, height: 892 } });

const consoleLines = [];
const failed = [];
const audioReqs = [];

page.on('console', (m) => consoleLines.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => consoleLines.push(`pageerror: ${e.message}`));
page.on('requestfailed', (r) => failed.push(`${r.url()} :: ${r.failure()?.errorText}`));
page.on('response', (r) => {
  if (r.url().includes('.mp3')) audioReqs.push(`${r.status()} ${r.url()}`);
});

await page.goto(`${BASE}app/`, { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('.view.on', { timeout: 15000 });

const sw = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
  return {
    controlled: Boolean(navigator.serviceWorker.controller),
    scope: reg?.scope ?? null,
    scriptURL: reg?.active?.scriptURL ?? null,
  };
});

// Ask the browser directly: can this URL start playback?
const direct = await page.evaluate(async () => {
  const url = 'audio/adya-mahakali.mp3';
  const out = { url: new URL(url, document.baseURI).href };

  try {
    const res = await fetch(url);
    out.fetchStatus = res.status;
    out.fetchType = res.headers.get('content-type');
    out.bytes = (await res.arrayBuffer()).byteLength;
  } catch (e) {
    out.fetchError = String(e);
  }

  try {
    const audio = new Audio(url);
    audio.muted = true;
    await audio.play();
    out.playOk = true;
    out.duration = audio.duration;
    audio.pause();
  } catch (e) {
    out.playOk = false;
    out.playError = `${e.name}: ${e.message}`;
  }

  try {
    const probe = await fetch(url, { headers: { Range: 'bytes=0-1023' } });
    out.rangeStatus = probe.status;
    out.rangeAccept = probe.headers.get('accept-ranges');
    out.rangeLength = probe.headers.get('content-length');
  } catch (e) {
    out.rangeError = String(e);
  }

  return out;
});

// And through the app's own path.
await page.click('text=Altar');
await page.locator('.mode-tile').nth(1).click();
await page.locator('button.pill', { hasText: 'Begin japa' }).click();
await page.waitForSelector('.session.on', { timeout: 8000 });
await page.waitForTimeout(300);
await page.locator('.session__pill').click();
await page.waitForTimeout(1500);
const toast = await page.locator('.toast').innerText().catch(() => '(none)');
const count = await page.locator('.session__num').innerText().catch(() => '?');

await browser.close();

console.log('\nservice worker:', JSON.stringify(sw));
console.log('\ndirect browser probe:');
for (const [k, v] of Object.entries(direct)) console.log(`  ${k}: ${v}`);
console.log('\nmp3 responses:', audioReqs.length ? audioReqs.join('\n  ') : '(none)');
console.log('failed requests:', failed.length ? failed.join('\n  ') : '(none)');
console.log('\napp toast:', toast);
console.log('app count after one press:', count);
console.log('\nconsole:', consoleLines.length ? consoleLines.slice(-8).join('\n  ') : '(none)');
