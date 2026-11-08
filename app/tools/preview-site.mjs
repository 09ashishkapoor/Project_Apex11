// Assemble the publishable site shape locally, so the landing page can be
// reviewed exactly as it will ship before anything is deployed:
//
//   .preview-site/        docs/       (the landing, at /)
//   .preview-site/app/    app/dist    (the built PWA, at /app/)
//
// Then serve that directory with any static server, e.g.:
//   npx vite preview --outDir ../.preview-site --port 5300
//   python -m http.server 5300 --directory .preview-site
import fs from 'node:fs';
import path from 'node:path';

const APP = path.resolve('.');
const REPO = path.resolve('..');
const SITE = path.join(REPO, '.preview-site');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

if (!fs.existsSync(path.join(APP, 'dist', 'index.html'))) {
  console.error('app/dist is missing — run `npm run build` first.');
  process.exit(1);
}

fs.rmSync(SITE, { recursive: true, force: true });
copyDir(path.join(REPO, 'docs'), SITE);
copyDir(path.join(APP, 'dist'), path.join(SITE, 'app'));

const count = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => fs.statSync(path.join(dir, f)).isFile()).length;
console.log(`assembled ${path.relative(REPO, SITE)}  (${count(SITE)} files)`);
console.log('\nserve it with one of:');
console.log('  npx vite preview --outDir ../.preview-site --port 5300');
console.log('  python -m http.server 5300 --directory .preview-site');
