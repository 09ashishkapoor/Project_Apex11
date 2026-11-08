// Renders the square feed post from tool/post-square.html at exactly 1080x1080,
// then writes the JPEG an Instagram post expects.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { resolveChrome } from './browser.mjs';

const REPO = path.resolve('..');
const TEMPLATE = path.join(REPO, 'tool', 'post-square.html');
const OUT = path.join(REPO, 'reel', 'post-introducing.jpg');

const browser = await chromium.launch({ executablePath: resolveChrome() });
const page = await browser.newPage({
  viewport: { width: 1080, height: 1080 },
  deviceScaleFactor: 1,
});

await page.goto(`file:///${TEMPLATE.replace(/\\/g, '/')}`, { waitUntil: 'load' });
await page.evaluate(async () => {
  if (document.fonts?.ready) await document.fonts.ready;
  await Promise.all(
    Array.from(document.images).map((img) =>
      img.complete ? null : new Promise((r) => { img.onload = r; img.onerror = r; }),
    ),
  );
});
await page.waitForTimeout(300);

await page.screenshot({ path: OUT, type: 'jpeg', quality: 92 });

const { width, height } = await page.evaluate(() => {
  const el = document.body;
  return { width: el.scrollWidth, height: el.scrollHeight };
});
await browser.close();

const kb = fs.statSync(OUT).size / 1024;
console.log(`wrote ${path.relative(REPO, OUT)}`);
console.log(`canvas reported ${width}x${height}, file ${kb.toFixed(0)} KB`);
if (width !== 1080 || height !== 1080) console.log('WARNING: content overflows the 1080 square');
