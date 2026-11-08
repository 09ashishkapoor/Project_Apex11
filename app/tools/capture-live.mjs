// Capture the currently deployed Flutter web app, so the new build can be
// compared against what devotees see today.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { resolveChrome } from './browser.mjs';

const URL = process.argv[2] ?? 'https://mantrini.jaikhyapaparampara.com/app/';
const OUT = path.resolve('.shots');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: resolveChrome() });
const page = await browser.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2 });

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(URL, { waitUntil: 'load', timeout: 60000 });

// Flutter web paints to a canvas, so capture a sequence to catch the splash
// before it is replaced.
const stamps = [400, 900, 1600, 2800, 4200, 6000];
let previous = 0;
for (const at of stamps) {
  await page.waitForTimeout(at - previous);
  previous = at;
  const file = path.join(OUT, `live-${String(at).padStart(4, '0')}ms.png`);
  await page.screenshot({ path: file });
  console.log(`captured ${at}ms -> ${path.basename(file)}`);
}

const title = await page.title();
console.log(`title: ${title}`);
console.log(`errors: ${errors.length ? errors.join(' | ') : 'none'}`);

await browser.close();
