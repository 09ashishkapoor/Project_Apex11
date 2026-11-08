// Regression test for the "chant audio could not start" failure.
//
// Browsers only allow playback started from inside a user gesture. Safari is
// strict: play() must run in the same task as the tap. Starting a sitting
// awaits an IndexedDB write first, so a naive implementation calls play()
// several tasks later and is refused.
//
// Chromium is forgiving, so this cannot be tested against the real policy.
// Instead we install a shim that applies Safari's rule precisely: play() is
// refused unless it happens in the gesture's task, or on an element that has
// already been started from a gesture (which is what unlocking buys you).
import { chromium } from 'playwright-core';
import { resolveChrome } from './browser.mjs';

const BASE = process.env.APP_URL ?? 'http://127.0.0.1:5300/app/';

const GESTURE_SHIM = () => {
  const original = HTMLMediaElement.prototype.play;
  const unlocked = new WeakSet();
  let inGestureTask = false;
  document.addEventListener(
    'pointerdown',
    () => {
      inGestureTask = true;
      setTimeout(() => {
        inGestureTask = false;
      }, 0);
    },
    true,
  );
  HTMLMediaElement.prototype.play = function play() {
    if (inGestureTask || unlocked.has(this)) {
      if (inGestureTask) unlocked.add(this);
      return original.call(this);
    }
    return Promise.reject(
      Object.assign(new Error('simulated autoplay refusal'), { name: 'NotAllowedError' }),
    );
  };
};

const browser = await chromium.launch({ executablePath: resolveChrome() });
const results = [];

async function run(modeIndex, label, { pressChant = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 412, height: 892 } });
  await context.addInitScript(GESTURE_SHIM);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('.view.on', { timeout: 15000 });
  await page.click('text=Altar');
  await page.locator('.mode-tile').nth(modeIndex).click();
  await page.locator('button.pill', { hasText: 'Begin japa' }).click();
  await page.waitForSelector('.session.on', { timeout: 8000 });

  if (pressChant) {
    await page.waitForTimeout(600);
    await page.locator('.session__pill').click();
    await page.waitForTimeout(900);
  }

  // Count first: locator.innerText() waits out the full timeout when the
  // element is absent, which silently let the session run for ~30s and turned
  // the count assertion into nonsense.
  const toast = (await page.locator('.toast').count()) ? await page.locator('.toast').innerText() : '';
  // One chant at Adya Mahakali's 2.47s cadence needs ~3s to appear, so a shorter
  // wait would read 0 and prove nothing.
  if (!pressChant) await page.waitForTimeout(3300);
  const count = (await page.locator('.session__num').innerText().catch(() => '?')).trim();
  await context.close();
  return { toast, count, errors };
}

const audio = await run(1, 'Audio', { pressChant: true });
results.push({
  name: 'Audio mode starts sound inside the gesture',
  pass: !/could not start/i.test(audio.toast),
  detail: audio.toast ? `toast: "${audio.toast}"` : 'no failure notice',
});

const timed = await run(2, 'Timer');
results.push({
  name: 'Timer mode starts looping sound (play happens after an await)',
  pass: !/could not start/i.test(timed.toast),
  detail: timed.toast ? `toast: "${timed.toast}"` : 'no failure notice',
});
results.push({
  name: 'Timer keeps counting regardless',
  pass: Number(timed.count) > 0,
  detail: `count ${timed.count}`,
});

const auto = await run(3, 'Auto');
results.push({
  name: 'Auto mode starts looping sound',
  pass: !/could not start/i.test(auto.toast),
  detail: auto.toast ? `toast: "${auto.toast}"` : 'no failure notice',
});

const allErrors = [...audio.errors, ...timed.errors, ...auto.errors];
results.push({ name: 'no runtime errors', pass: allErrors.length === 0, detail: allErrors.join(' | ') || 'none' });

await browser.close();

console.log('\nGesture-restricted playback (Safari rule)\n');
let failed = 0;
for (const r of results) {
  if (!r.pass) failed += 1;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(62)} ${r.detail}`);
}
console.log(failed === 0 ? '\nALL PASS' : `\n${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
