// Runs the audio journey in WebKit — the engine Safari uses.
//
// This is NOT Safari and NOT iOS: it is Playwright's WebKit build on Windows, so
// it catches JavaScript, API and gesture-rule problems and cannot catch anything
// that lives in the iOS shell (the hardware mute switch, for one). For those you
// need a real device or a cloud device farm.
//
// Reported per mode: whether play() resolved, whether the element really got
// past 'playing', and whether it was muted at the time.
import { webkit } from 'playwright-core';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5400/app/';

const INSTRUMENT = () => {
  window.__audio = { plays: [], playing: [], blocked: [], errors: [] };
  const original = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function play() {
    const record = { muted: this.muted, at: Date.now() };
    window.__audio.plays.push(record);
    const result = original.call(this);
    if (result && result.catch) {
      result.catch((error) => window.__audio.blocked.push({ name: error.name, muted: this.muted }));
    }
    return result;
  };
  // Media events do not bubble, so listen on capture at the document root; the
  // element may not be in the DOM (new Audio()).
  for (const type of ['playing', 'ended', 'pause']) {
    document.addEventListener(
      type,
      (event) => {
        const element = event.target;
        if (!(element instanceof HTMLMediaElement)) return;
        window.__audio[type === 'playing' ? 'playing' : 'errors'].push({
          type,
          muted: element.muted,
          t: Number(element.currentTime.toFixed(2)),
        });
      },
      true,
    );
  }
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
};

const browser = await webkit.launch();
const results = [];

async function journey(label, modeIndex, pressChant) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(INSTRUMENT);
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto(BASE, { waitUntil: 'load', timeout: 40000 });
  await page.waitForSelector('.splash', { timeout: 20000 });
  await page.locator('.splash__continue').click();
  await page.waitForSelector('.view.on', { timeout: 15000 });

  await page.click('text=Altar');
  await page.locator('.mode-tile').nth(modeIndex).click();
  await page.locator('button.pill', { hasText: 'Begin japa' }).click();
  await page.waitForSelector('.session.on', { timeout: 15000 });

  if (pressChant) {
    await page.waitForTimeout(600);
    await page.locator('.session__pill').click();
  }
  await page.waitForTimeout(3000);

  const state = await page.evaluate(() => window.__audio);
  const toast = (await page.locator('.toast').count())
    ? await page.locator('.toast').innerText()
    : '';
  const count = (await page.locator('.session__num').innerText()).trim();

  results.push({
    label,
    plays: state.plays.length,
    unmutedPlay: state.plays.some((p) => p.muted === false),
    playing: state.playing.length,
    blocked: state.blocked.map((b) => b.name).join(',') || 'none',
    audioErrors: state.errors.filter((e) => e.type !== 'pause').length,
    toast: toast || 'none',
    count,
    pageErrors: pageErrors.join(' | ') || 'none',
  });
  await context.close();
}

await journey('Audio mode', 1, true);
await journey('Timer mode', 2, false);
await journey('Auto mode', 3, false);

await browser.close();

console.log('\nWebKit (the engine Safari uses) — not iOS, not the device shell\n');
for (const r of results) {
  console.log(`${r.label}`);
  console.log(`  play() calls     ${r.plays}   unmuted: ${r.unmutedPlay}`);
  console.log(`  'playing' events ${r.playing}`);
  console.log(`  blocked          ${r.blocked}`);
  console.log(`  failure notice   ${r.toast}`);
  console.log(`  count after 3s   ${r.count}`);
  if (r.pageErrors !== 'none') console.log(`  page errors      ${r.pageErrors}`);
  console.log('');
}

const broken = results.filter((r) => r.toast !== 'none' || r.playing === 0 || !r.unmutedPlay);
console.log(broken.length ? `${broken.length} mode(s) did not start audible playback` : 'all modes started audible playback');
process.exitCode = broken.length ? 1 : 0;
