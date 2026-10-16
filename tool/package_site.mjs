import { cp, mkdir, readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const origin = 'https://mantrini.jaikhyapaparampara.com';

async function filesIn(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await filesIn(join(directory, entry.name), name + '/'));
    else if (entry.isFile()) files.push(name);
  }
  return files.sort();
}

export async function packageSite({ appBuild = join(root, 'build/web'), output = join(root, 'build/site') } = {}) {
  appBuild = resolve(appBuild);
  output = resolve(output);
  if (output === appBuild || output.startsWith(appBuild + sep) || appBuild.startsWith(output + sep)) {
    throw new Error('App input and site output must be separate directories.');
  }
  try {
    if ((await readdir(output)).length) throw new Error('Output must be empty; choose a fresh --out directory.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  for (const file of ['index.html', 'main.dart.js', 'flutter_bootstrap.js', 'manifest.json', 'sqlite3.wasm', 'drift_worker.js']) {
    if (!(await stat(join(appBuild, file))).isFile()) throw new Error('Missing app file: ' + file);
  }
  let app = await readFile(join(appBuild, 'index.html'), 'utf8');
  if (!/<base\s+href=["']\/["']/i.test(app)) throw new Error('Use the existing Flutter build with base href="/".');
  const landing = await readFile(join(root, 'docs/index.html'), 'utf8');
  const workerTemplate = await readFile(join(root, 'hosting/service-worker.js'), 'utf8');
  const inputFiles = (await filesIn(appBuild)).filter(file => !/(?:\.map|\.deps|\.symbols|\.dart)$/.test(file) && !file.startsWith('.') && !['_headers', '_redirects', 'index.html', 'manifest.json', 'pwa_service_worker.js', 'flutter_service_worker.js'].includes(file));
  const hash = createHash('sha256').update(landing).update(app).update(workerTemplate);
  for (const file of inputFiles) hash.update(file).update(await readFile(join(appBuild, file)));
  const version = hash.digest('hex').slice(0, 16);
  await mkdir(output, { recursive: true });
  // Stable root asset URLs preserve the deployed database worker and browser storage origin.
  for (const file of inputFiles) {
    await mkdir(resolve(output, file, '..'), { recursive: true });
    await cp(join(appBuild, file), join(output, file));
  }
  for (const file of ['app-intro.jpg', 'mantrini-download-qr.png', 'screenshots']) {
    await cp(join(root, 'docs', file), join(output, file), { recursive: true });
  }
  await mkdir(join(output, 'app'), { recursive: true });
  // This remains a root-based build: /app/ is its entry point, not a new storage origin.
  app = app.replace(/<title>[\s\S]*?<\/title>/i, '<title>MANTRINI Web App | Private Japa Counter</title>');
  app = app.replace(/<\/head>/i, `<link rel="canonical" href="${origin}/app/">\n</head>`);
  app = app.replace(/pwa_service_worker\.js(?:\?v=[^'"\s]*)?/g, `/pwa_service_worker.js?v=${version}`);
  if (!app.includes('/pwa_service_worker.js')) {
    app = app.replace(/<\/body>/i, `<script>if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/pwa_service_worker.js?v=${version}'));</script>\n</body>`);
  }
  await writeFile(join(output, 'app/index.html'), app);
  const bootstrapPath = join(output, 'flutter_bootstrap.js');
  let bootstrap = await readFile(bootstrapPath, 'utf8');
  bootstrap = bootstrap.replace(/serviceWorkerSettings:\s*\{[\s\S]*?serviceWorkerVersion:\s*["'][^"']*["'][\s\S]*?\}\s*,?/g, '');
  await writeFile(bootstrapPath, bootstrap);
  const manifest = JSON.parse(await readFile(join(appBuild, 'manifest.json'), 'utf8'));
  // Preserve the previous PWA identity (old implicit id was its root start_url).
  manifest.id = '/';
  manifest.start_url = '/app/';
  manifest.scope = '/';
  await writeFile(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const registration = `<script>
if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true) {
  window.location.replace('/app/' + window.location.search + window.location.hash);
} else if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    // Upgrade existing app installations without downloading Flutter for new landing visitors.
    if (await navigator.serviceWorker.getRegistration('/')) {
      await navigator.serviceWorker.register('/pwa_service_worker.js?v=${version}');
    }
  });
}
</script>`;
  await writeFile(join(output, 'index.html'), landing.replace('</body>', registration + '\n</body>'));
  for (const file of ['404.html', '_headers', '_redirects', 'robots.txt', 'sitemap.xml']) {
    await cp(join(root, 'hosting', file), join(output, file));
  }
  const precache = ['/', '/index.html', '/app/', '/app/index.html', '/manifest.json', ...inputFiles.map(file => '/' + file)];
  const worker = workerTemplate.replace('__SITE_VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache));
  await writeFile(join(output, 'pwa_service_worker.js'), worker);
  // Also upgrade any legacy Flutter-generated registration to the same safe navigation behavior.
  await writeFile(join(output, 'flutter_service_worker.js'), worker);
  const result = { version, output: relative(root, output), appBuild, precachedFiles: precache.length };
  await writeFile(join(output, 'site-build.json'), JSON.stringify({ version, precachedFiles: precache.length }, null, 2) + '\n');
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--app-build', '--out'].includes(args[i]) || !args[i + 1]) throw new Error('Usage: node tool/package_site.mjs [--app-build path] [--out path]');
    options[args[i] === '--app-build' ? 'appBuild' : 'output'] = args[i + 1];
  }
  console.log(JSON.stringify(await packageSite(options), null, 2));
}
