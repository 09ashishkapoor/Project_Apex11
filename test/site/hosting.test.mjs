import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { packageSite } from '../../tool/package_site.mjs';

const LANDING = `<!doctype html>
<html lang="en"><head><title>MANTRINI — Offline Japa Counter</title>
<link rel="canonical" href="https://mantrini.jaikhyapaparampara.com/"></head>
<body><h1>MANTRINI</h1><a href="app/">Open MANTRINI</a></body></html>`;

const APP_HTML = `<!doctype html><html lang="en"><head><title>MANTRINI</title>
<link rel="manifest" href="./manifest.webmanifest"></head>
<body><div id="app"></div><script type="module" src="./assets/index-abc123.js"></script></body></html>`;

const MANIFEST = JSON.stringify({
  name: 'MANTRINI',
  start_url: './',
  scope: './',
  display: 'standalone',
  icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
});

async function fixture(t) {
  const temporary = await mkdtemp(join(tmpdir(), 'mantrini-hosting-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));

  const appBuild = join(temporary, 'dist');
  const docs = join(temporary, 'docs');
  const hosting = join(temporary, 'hosting');
  const output = join(temporary, 'site');

  await mkdir(join(appBuild, 'assets'), { recursive: true });
  await mkdir(join(appBuild, 'icons'), { recursive: true });
  await mkdir(join(docs, 'assets'), { recursive: true });
  await mkdir(hosting, { recursive: true });

  await writeFile(join(appBuild, 'index.html'), APP_HTML);
  await writeFile(join(appBuild, 'manifest.webmanifest'), MANIFEST);
  await writeFile(join(appBuild, 'sw.js'), '// workbox service worker');
  await writeFile(join(appBuild, 'assets/index-abc123.js'), 'console.log(1)');
  await writeFile(join(appBuild, 'icons/icon-192.png'), 'png');

  await writeFile(join(docs, 'index.html'), LANDING);
  await writeFile(join(docs, 'assets/og.jpg'), 'jpg');

  await writeFile(join(hosting, '_headers'), '/*\n  Cache-Control: no-cache\n');
  await writeFile(join(hosting, '_redirects'), '# none\n');
  await writeFile(join(hosting, 'robots.txt'), 'User-agent: *\n');
  await writeFile(join(hosting, 'sitemap.xml'), '<urlset></urlset>');
  await writeFile(join(hosting, '404.html'), '<meta name="robots" content="noindex, follow">');

  return { appBuild, docs, hosting, output };
}

const read = (options, name) => readFile(join(options.output, name), 'utf8');

test('assembles the landing at / and the app at /app/ from two independent builds', async (t) => {
  const options = await fixture(t);
  const result = await packageSite(options);

  assert.match(result.version, /^[a-f0-9]{16}$/);
  assert.equal(result.appFiles, 5);
  assert.ok(result.landingFiles >= 3);

  const landing = await read(options, 'index.html');
  assert.match(landing, /<h1>MANTRINI<\/h1>/);
  assert.match(landing, /href="app\/"/);
  assert.doesNotMatch(landing, /flutter_bootstrap|main\.dart\.js/);

  // The app is copied verbatim: relative base means no rewriting is needed.
  assert.equal(await read(options, 'app/index.html'), APP_HTML);
  assert.equal(await read(options, 'app/manifest.webmanifest'), MANIFEST);
  assert.equal(await read(options, 'app/sw.js'), '// workbox service worker');
  assert.equal(await read(options, 'app/assets/index-abc123.js'), 'console.log(1)');

  // No root-level service worker: the landing does not need one, and the app
  // brings its own scoped to /app/.
  await assert.rejects(() => read(options, 'sw.js'));
  await assert.rejects(() => read(options, 'pwa_service_worker.js'));

  // Hosting files land at the root.
  assert.match(await read(options, '_headers'), /Cache-Control: no-cache/);
  assert.match(await read(options, 'robots.txt'), /^User-agent: \*/);
  assert.match(await read(options, 'sitemap.xml'), /<urlset>/);
  assert.match(await read(options, '404.html'), /noindex, follow/);
});

test('publishes a build record with no local paths or machine names', async (t) => {
  const options = await fixture(t);
  const result = await packageSite(options);
  const build = await read(options, 'site-build.json');
  assert.doesNotMatch(build, /appBuild|"output"|temporary|[A-Z]:\\/);
  const parsed = JSON.parse(build);
  assert.deepEqual(Object.keys(parsed).sort(), ['appFiles', 'landingFiles', 'version']);
  assert.equal(parsed.version, result.version);
  assert.equal(parsed.appFiles, 5);
});

test('refuses to package a Flutter build, an unscoped manifest, or a stale landing', async (t) => {
  {
    const options = await fixture(t);
    await writeFile(join(options.appBuild, 'flutter_bootstrap.js'), '// old');
    await assert.rejects(() => packageSite(options), /Flutter web build/);
  }
  {
    const options = await fixture(t);
    await writeFile(join(options.appBuild, 'manifest.webmanifest'), JSON.stringify({ start_url: '/app/', scope: '/' }));
    await assert.rejects(() => packageSite(options), /scoped to \/app\//);
  }
  {
    const options = await fixture(t);
    await writeFile(join(options.docs, 'index.html'), '<script src="flutter_bootstrap.js"></script>');
    await assert.rejects(() => packageSite(options), /still references the Flutter build/);
  }
  {
    const options = await fixture(t);
    await rm(join(options.appBuild, 'sw.js'));
    await assert.rejects(() => packageSite(options), /Missing app file: sw\.js/);
  }
});

test('refuses to overwrite a non-empty output or overlap with its inputs', async (t) => {
  {
    const options = await fixture(t);
    await mkdir(options.output, { recursive: true });
    await writeFile(join(options.output, 'stale.txt'), 'x');
    await assert.rejects(() => packageSite(options), /Output must be empty/);
  }
  {
    const options = await fixture(t);
    await assert.rejects(() => packageSite({ ...options, output: join(options.appBuild, 'site') }), /separate directories/);
    await assert.rejects(() => packageSite({ ...options, output: join(options.docs, 'site') }), /separate directories/);
  }
});

test('cache headers keep the worker and shell fresh and the bundles immutable', async (t) => {
  const options = await fixture(t);
  await packageSite(options);
  const headers = await readFile(join(process.cwd(), 'hosting/_headers'), 'utf8');
  assert.match(headers, /\/app\/sw\.js\n {2}Cache-Control: no-store/);
  assert.match(headers, /\/app\/index\.html\n {2}Cache-Control: no-cache/);
  assert.match(headers, /\/app\/assets\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/);
});
