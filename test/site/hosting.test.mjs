import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runInNewContext } from 'node:vm';
import { packageSite } from '../../tool/package_site.mjs';

async function fixture(t) {
  const temporary = await mkdtemp(join(tmpdir(), 'mantrini-hosting-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const appBuild = join(temporary, 'web');
  const output = join(temporary, 'site');
  await mkdir(appBuild);
  const files = {
    'index.html': '<html><head><base href="/"><title>MANTRINI</title><link rel="manifest" href="manifest.json"></head><body><script>navigator.serviceWorker.register("pwa_service_worker.js?v=old");</script><script src="flutter_bootstrap.js"></script></body></html>',
    'flutter_bootstrap.js': '_flutter.loader.load({serviceWorkerSettings: {serviceWorkerVersion: "old"},});',
    'main.dart.js': '// Existing compiled app: database name sadhana_for_a_khyapa',
    'sqlite3.wasm': 'existing wasm',
    'drift_worker.js': 'existing worker',
    'manifest.json': JSON.stringify({ name: 'MANTRINI', start_url: '.', scope: '/', icons: [{ src: 'icons/Icon-192.png' }] }),
    '_redirects': '/* /index.html 200',
  };
  for (const [name, content] of Object.entries(files)) await writeFile(join(appBuild, name), content);
  return { appBuild, output };
}

test('packages readable landing, unchanged app/runtime, PWA identity and actual discovery files', async t => {
  const options = await fixture(t);
  await packageSite(options);
  const read = name => readFile(join(options.output, name), 'utf8');
  const landing = await read('index.html');
  assert.match(landing, /<h1[^>]*>A quieter way to keep daily japa/);
  assert.match(landing, /Open Web App/);
  assert.match(landing, /Download Android APK/);
  assert.match(landing, /rel="canonical" href="https:\/\/mantrini.jaikhyapaparampara.com\/"/);
  assert.doesNotMatch(landing, /flutter_bootstrap|noindex/);
  const app = await read('app/index.html');
  assert.match(app, /<base href="\/">/);
  assert.match(app, /register\("\/pwa_service_worker.js\?v=[a-f0-9]+"\)/);
  assert.match(app, /rel="canonical" href="https:\/\/mantrini.jaikhyapaparampara.com\/app\/"/);
  for (const name of ['main.dart.js', 'sqlite3.wasm', 'drift_worker.js']) {
    assert.equal(await read(name), await readFile(join(options.appBuild, name), 'utf8'));
  }
  assert.doesNotMatch(await read('flutter_bootstrap.js'), /serviceWorkerSettings/);
  const manifest = JSON.parse(await read('manifest.json'));
  assert.equal(manifest.id, '/');
  assert.equal(manifest.start_url, '/app/');
  assert.equal(manifest.icons[0].src, 'icons/Icon-192.png');
  assert.match(await read('robots.txt'), /^User-agent: \*/);
  assert.match(await read('sitemap.xml'), /<loc>https:\/\/mantrini.jaikhyapaparampara.com\/<\/loc>/);
  assert.doesNotMatch(await read('_redirects'), /\/\*/);
  assert.match(await read('404.html'), /noindex, follow/);
  assert.doesNotMatch(await read('site-build.json'), /appBuild|temporary|[A-Z]:/);
  await assert.rejects(() => packageSite(options), /Output must be empty/);
});

test('rejects overlapping output and a changed Flutter base path before packaging', async t => {
  const options = await fixture(t);
  await assert.rejects(() => packageSite({ ...options, output: join(options.appBuild, 'site') }), /separate directories/);
  await writeFile(join(options.appBuild, 'index.html'), '<base href="/app/">');
  await assert.rejects(() => packageSite(options), /base href/);
});

test('landing skips app downloads for fresh visitors and upgrades existing installations', async t => {
  const options = await fixture(t);
  await packageSite(options);
  const landing = await readFile(join(options.output, 'index.html'), 'utf8');
  const script = [...landing.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  for (const existing of [false, true]) {
    const registered = [];
    let onLoad;
    runInNewContext(script, {
      window: { matchMedia: () => ({ matches: false }), addEventListener: (event, handler) => { assert.equal(event, 'load'); onLoad = handler; } },
      navigator: { serviceWorker: {
        getRegistration: async scope => { assert.equal(scope, '/'); return existing ? {} : undefined; },
        register: async url => registered.push(url),
      } },
    });
    await onLoad();
    assert.equal(registered.length, existing ? 1 : 0);
    if (existing) assert.match(registered[0], /^\/pwa_service_worker\.js\?v=[a-f0-9]+$/);
  }
  let redirected;
  runInNewContext(script, {
    window: { matchMedia: () => ({ matches: true }), location: { search: '?installed=true', hash: '#history', replace: url => redirected = url } },
    navigator: {},
  });
  assert.equal(redirected, '/app/?installed=true#history');
});

async function workerHarness(t) {
  const options = await fixture(t);
  await packageSite(options);
  const listeners = {};
  const entries = new Map();
  const cache = {
    addAll: async urls => urls.forEach(url => entries.set(url, new Response('cached:' + url))),
    match: async url => entries.get(url)?.clone(),
    put: async (url, response) => entries.set(url, response),
  };
  let offline = false;
  let networkStatus = 200;
  let claimed = false;
  const scope = {
    URL, Response,
    self: { location: { origin: 'https://mantrini.example' }, addEventListener: (name, listener) => listeners[name] = listener, skipWaiting: async () => {}, clients: { claim: async () => { claimed = true; } } },
    caches: { open: async () => cache }, // No delete/global match APIs: accessing them fails the test.
    fetch: async request => { if (offline) throw new Error('offline'); return new Response('network:' + request.url, { status: networkStatus }); },
  };
  runInNewContext(await readFile(join(options.output, 'pwa_service_worker.js'), 'utf8'), scope);
  let completion;
  listeners.install({ waitUntil: promise => completion = promise }); await completion;
  listeners.activate({ waitUntil: promise => completion = promise }); await completion;
  assert.equal(claimed, true);
  return {
    offline: value => offline = value,
    status: value => networkStatus = value,
    fetch: (path, mode = 'navigate', origin = 'https://mantrini.example') => {
      let response;
      listeners.fetch({ request: { url: origin + path, method: 'GET', mode }, respondWith: promise => response = promise });
      return response;
    },
  };
}

test('offline worker separates landing/app fallbacks and never turns unknown routes into the app', async t => {
  const worker = await workerHarness(t);
  worker.offline(true);
  assert.equal(await (await worker.fetch('/')).text(), 'cached:/index.html');
  assert.equal(await (await worker.fetch('/app/?installed=true')).text(), 'cached:/app/index.html');
  assert.equal(worker.fetch('/missing-page'), undefined);
  assert.equal(worker.fetch('/robots.txt', 'cors'), undefined);
  assert.equal(worker.fetch('/', 'navigate', 'https://other.example'), undefined);
  assert.equal(await (await worker.fetch('/main.dart.js?v=current', 'cors')).text(), 'cached:/main.dart.js');
  worker.offline(false); worker.status(404);
  assert.equal((await worker.fetch('/app/')).status, 404);
});
