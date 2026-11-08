// Renders the Instagram post set from the HTML templates: the square
// introduction, the taller 4:5 introduction, and the 4:5 mantras card.
// Every canvas is checked against its declared size so nothing ships cropped.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { resolveChrome } from './browser.mjs';

const REPO = path.resolve('..');
const OUT = path.join(REPO, 'reel');

const POSTS = [
  { template: 'post-square.html', name: 'post-introducing-square.jpg', width: 1080, height: 1080 },
  { template: 'post-tall.html', name: 'post-introducing.jpg', width: 1080, height: 1350 },
  { template: 'post-mantras.html', name: 'post-mantras.jpg', width: 1080, height: 1350 },
];

const browser = await chromium.launch({ executablePath: resolveChrome() });

for (const post of POSTS) {
  const page = await browser.newPage({
    viewport: { width: post.width, height: post.height },
    deviceScaleFactor: 1,
  });

  const file = path.join(REPO, 'tool', post.template);
  await page.goto(`file:///${file.replace(/\\/g, '/')}`, { waitUntil: 'load' });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((img) =>
        img.complete ? null : new Promise((r) => { img.onload = r; img.onerror = r; }),
      ),
    );
  });
  await page.waitForTimeout(250);

  const target = path.join(OUT, post.name);
  await page.screenshot({ path: target, type: 'jpeg', quality: 92 });

  const measured = await page.evaluate(() => ({
    width: document.body.scrollWidth,
    height: document.body.scrollHeight,
  }));
  const fits = measured.width === post.width && measured.height === post.height;
  const kb = fs.statSync(target).size / 1024;

  console.log(
    `${fits ? 'ok  ' : 'WARN'} ${post.name.padEnd(28)} ${post.width}x${post.height}  ${kb.toFixed(0)} KB` +
      (fits ? '' : `  content measured ${measured.width}x${measured.height}`),
  );
  await page.close();
}

await browser.close();
