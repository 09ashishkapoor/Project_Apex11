// Screenshot helper for MANTRINI design demos.
// Uses the Playwright + Chromium already bundled with the DSH profile.
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const CHROME = 'C:\\Users\\kalbhairav\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe';

function parseArgs(argv) {
  const out = { width: 1440, height: 900, fullPage: false, wait: 1200 };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const val = argv[i + 1];
    if (key === '--out') { out.out = val; i += 1; }
    else if (key === '--width') { out.width = Number(val); i += 1; }
    else if (key === '--height') { out.height = Number(val); i += 1; }
    else if (key === '--wait') { out.wait = Number(val); i += 1; }
    else if (key === '--fullpage') { out.fullPage = true; }
    else if (key === '--sel') { out.sel = val; i += 1; }
    else if (key === '--nth') { out.nth = Number(val); i += 1; }
    else if (key === '--pad') { out.pad = Number(val); i += 1; }
    else if (!key.startsWith('--')) { out.target = key; }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.target || !args.out) {
  console.error('usage: node shot.mjs <url-or-file> --out <png> [--width 1440] [--height 900] [--fullpage]');
  process.exit(2);
}

const target = /^https?:\/\//.test(args.target)
  ? args.target
  : `file:///${path.resolve(args.target).replace(/\\/g, '/')}`;

fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });

const browser = await chromium.launch({
  executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
});
const page = await browser.newPage({
  viewport: { width: args.width, height: args.height },
  deviceScaleFactor: 2,
});

const consoleErrors = [];
page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`);
});

try {
  await page.goto(target, { waitUntil: 'load', timeout: 45000 });
  // Wait for web fonts and inlined images to settle.
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const imgs = Array.from(document.images || []);
    await Promise.all(imgs.map((img) => (img.complete ? null : new Promise((res) => {
      img.addEventListener('load', res, { once: true });
      img.addEventListener('error', res, { once: true });
      setTimeout(res, 4000);
    }))));
  }).catch(() => {});
  await page.waitForTimeout(args.wait);
  if (args.sel) {
    const el = await page.$(args.sel);
    if (!el) throw new Error(`selector not found: ${args.sel}`);
    const nth = Number(args.nth ?? 0);
    const list = await page.$$(args.sel);
    const chosen = args.nth !== undefined ? list[nth] : el;
    if (!chosen) throw new Error(`selector index ${nth} out of range: ${args.sel}`);
    const chosen2 = chosen;
    await chosen2.scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);
    const box = await chosen2.boundingBox();
    const pad = args.pad ?? 0;
    await page.screenshot({
      path: path.resolve(args.out),
      clip: {
        x: Math.max(0, box.x - pad),
        y: Math.max(0, box.y - pad),
        width: box.width + pad * 2,
        height: box.height + pad * 2,
      },
    });
  } else {
    await page.screenshot({ path: path.resolve(args.out), fullPage: args.fullPage });
  }
  const size = fs.statSync(path.resolve(args.out)).size;
  console.log(`ok ${args.out} ${(size / 1024).toFixed(0)}KB`);
  if (consoleErrors.length) {
    console.log(`--- ${consoleErrors.length} console problem(s) ---`);
    for (const line of consoleErrors.slice(0, 15)) console.log(line);
    process.exitCode = 3;
  }
} catch (err) {
  console.error(`FAILED ${args.target}: ${err.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
