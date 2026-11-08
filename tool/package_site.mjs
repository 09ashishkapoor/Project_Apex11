import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Files the app build must contain for the site to be deployable. */
const REQUIRED_APP_FILES = ['index.html', 'manifest.webmanifest', 'sw.js'];

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function filesIn(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) files.push(...(await filesIn(join(directory, entry.name), name + '/')));
    else if (entry.isFile()) files.push(name);
  }
  return files.sort();
}

async function assertEmpty(output) {
  try {
    if ((await readdir(output)).length) throw new Error('Output must be empty; choose a fresh --out directory.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

/**
 * Assemble the deployable site from two independent halves:
 *
 *   /        the static landing page from docs/ (indexable, no JavaScript needed)
 *   /app/    the built PWA from app/dist (its own service worker, scoped to /app/)
 *
 * The app is built with `base: './'`, so every URL inside it is relative and it
 * runs unchanged from /app/ — nothing here rewrites its HTML. The landing is
 * plain HTML and is copied verbatim. Sharing the landing page's own copy with the
 * app would be the only way for the two to drift, and they are independent.
 *
 * The root service worker is deliberately absent: the landing does not need one,
 * and a worker that also covered / would have to be kept in step with the app's
 * Workbox precache manifest for no benefit.
 */
export async function packageSite({
  appBuild = join(root, 'app/dist'),
  docs = join(root, 'docs'),
  hosting = join(root, 'hosting'),
  output = join(root, 'build/site'),
} = {}) {
  appBuild = resolve(appBuild);
  docs = resolve(docs);
  hosting = resolve(hosting);
  output = resolve(output);

  for (const [name, dir] of [['app build', appBuild], ['landing', docs], ['hosting', hosting]]) {
    if (output === dir || output.startsWith(dir + sep) || dir.startsWith(output + sep)) {
      throw new Error(`Output and ${name} input must be separate directories.`);
    }
  }

  await assertEmpty(output);

  for (const file of REQUIRED_APP_FILES) {
    if (!(await isFile(join(appBuild, file)))) {
      throw new Error(`Missing app file: ${file}. Run "npm run build" in app/ first.`);
    }
  }
  if (!(await isFile(join(docs, 'index.html')))) throw new Error('Missing docs/index.html.');

  // A Flutter build here would mean the old pipeline is still in place.
  if (await isFile(join(appBuild, 'flutter_bootstrap.js'))) {
    throw new Error('This looks like a Flutter web build; expected the Vite build in app/dist.');
  }

  const landing = await readFile(join(docs, 'index.html'), 'utf8');
  if (/flutter_bootstrap|main\.dart\.js/.test(landing)) {
    throw new Error('The landing page still references the Flutter build.');
  }

  // The manifest must be relative so its scope resolves to /app/ rather than /.
  const manifest = JSON.parse(await readFile(join(appBuild, 'manifest.webmanifest'), 'utf8'));
  for (const key of ['start_url', 'scope']) {
    if (manifest[key] !== './') {
      throw new Error(`App manifest ${key} must be "./" to stay scoped to /app/, found ${JSON.stringify(manifest[key])}.`);
    }
  }

  await mkdir(output, { recursive: true });

  // landing first, so the app can never shadow a root file
  await cp(docs, output, { recursive: true });
  await cp(appBuild, join(output, 'app'), { recursive: true });
  for (const file of [
    '_headers',
    '_redirects',
    '404.html',
    'robots.txt',
    'sitemap.xml',
    // Takes over the URL the retired Flutter site registered its root-scope
    // worker at, so returning visitors are not served a cached old landing.
    'pwa_service_worker.js',
  ]) {
    if (await isFile(join(hosting, file))) await cp(join(hosting, file), join(output, file));
  }

  const hash = createHash('sha256').update(landing);
  for (const file of await filesIn(appBuild)) {
    hash.update(file).update(await readFile(join(appBuild, file)));
  }
  const version = hash.digest('hex').slice(0, 16);

  const appFiles = await filesIn(join(output, 'app'));
  const landingFiles = (await filesIn(join(output))).filter((file) => !file.startsWith('app/'));
  const result = {
    version,
    appBuild: relative(root, appBuild).split(sep).join('/'),
    output: relative(root, output).split(sep).join('/'),
    appFiles: appFiles.length,
    landingFiles: landingFiles.length,
  };
  // Only a version and counts are published: this file is deployed, so it must
  // never carry a local path or a machine name.
  await writeFile(
    join(output, 'site-build.json'),
    JSON.stringify({ version, appFiles: result.appFiles, landingFiles: result.landingFiles }, null, 2) + '\n',
  );
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--app-build', '--docs', '--hosting', '--out'].includes(args[i]) || !args[i + 1]) {
      throw new Error('Usage: node tool/package_site.mjs [--app-build path] [--docs path] [--hosting path] [--out path]');
    }
    options[args[i].replace(/^--/, '')] = args[i + 1];
  }
  console.log(JSON.stringify(await packageSite(options), null, 2));
}
