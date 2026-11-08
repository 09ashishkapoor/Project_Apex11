// Resolves a Chromium executable for the verification scripts.
//
// Order: CHROME_PATH env var, a locally installed Chrome/Edge, then the
// Playwright browser cache. Playwright's own download is not required.
import fs from 'node:fs';
import path from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Users\\kalbhairav\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

/** Newest cached Playwright chromium, if the user has run `playwright install`. */
function playwrightCache() {
  const root =
    process.platform === 'win32'
      ? path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright')
      : path.join(process.env.HOME ?? '', '.cache', 'ms-playwright');
  if (!fs.existsSync(root)) return undefined;
  const dirs = fs
    .readdirSync(root)
    .filter((name) => name.startsWith('chromium-'))
    .sort()
    .reverse();
  for (const dir of dirs) {
    const options = [
      path.join(root, dir, 'chrome-win64', 'chrome.exe'),
      path.join(root, dir, 'chrome-linux', 'chrome'),
      path.join(root, dir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
    ];
    for (const candidate of options) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

/** @returns {string | undefined} */
export function resolveChrome() {
  for (const candidate of CANDIDATES) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return playwrightCache();
}
