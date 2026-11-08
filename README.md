# MANTRINI

A respectful, offline japa counter for the Khyapa Parampara. Four altars, 108
beads, and nothing that leaves the device.

**Live:** [mantrini.jaikhyapaparampara.com](https://mantrini.jaikhyapaparampara.com/)

It is a progressive web app: one codebase, installable from the browser on
Android and iPhone, and it runs with the network completely cut after the first
visit.

| | |
|---|---|
| Four altars | Adya Mahakali, Batuk Bhairav, Swarnaakarshana Bhairav, Skanda Bhairav |
| Four modes | Tap · Audio · Timer · Auto |
| Storage | IndexedDB on your device. No account, no sync, no analytics |
| Offline | Verified: cold reload, every screen, a full sitting, with the network off |

## Repository layout

```
app/            the PWA (Vite + Preact + TypeScript) and its tools
docs/           the landing page — static HTML, published at /
hosting/        cache headers, robots, sitemap, 404
tool/           site packaging and asset preparation
test/site/      packaging tests
```

The Flutter application that this replaced has been removed; it remains in git
history. See [`app/README.md`](app/README.md) for the design system, the audio
pipeline, the offline strategy and the platform caveats.

## Quick start

```bash
cd app
npm install
npm run dev            # http://localhost:5173
```

To see the real deployed shape — landing at `/`, app at `/app/`:

```bash
cd app && npm run build
node tools/preview-site.mjs
npx vite preview --outDir ../.preview-site --port 5300
```

## Verify

The checks are browser-based wherever the risk is in the browser, because that
is where the interesting failures live.

```bash
cd app
npm run check && npm test        # types, 41 unit tests
npm run build

npx vite preview --port 5200 &
APP_URL=http://127.0.0.1:5200/ node tools/check-offline.mjs
APP_URL=http://127.0.0.1:5200/ node tools/check-audio-gesture.mjs
APP_URL=http://127.0.0.1:5200/ node tools/check-audio-playback.mjs
APP_URL=http://127.0.0.1:5200/ node tools/check-audio-fallback.mjs
APP_URL=http://127.0.0.1:5200/ node tools/check-install.mjs
APP_URL=http://127.0.0.1:5200/ node tools/a11y.mjs
APP_URL=http://127.0.0.1:5200/ node tools/check-responsive.mjs

node --test test/site/hosting.test.mjs   # packaging, from the repo root
```

## Deploy

Push to `main`. Two workflows build the same artifact and publish it:

- `.github/workflows/cloudflare-pages.yml` → Cloudflare Pages (`mantrini` project)
- `.github/workflows/pages.yml` → GitHub Pages mirror

Cloudflare needs the `CLOUDFLARE_API_TOKEN` repository secret; the deploy job
checks for it first and fails with a clear message rather than half-deploying.

`tool/package_site.mjs` assembles `build/site/` from `docs/` and `app/dist/`.
Nothing is bundled that is not part of the site.

## Privacy

There is no account, no server-side storage and no third-party script. The
bundled fonts are self-hosted. Sessions are written to IndexedDB on the device
and exported, when asked, as a JSON file.

## Licence

Source code is MIT (see [`LICENSE`](LICENSE)). Bundled devotional images and
audio are project assets for MANTRINI distribution only — see [`NOTICE`](NOTICE).
