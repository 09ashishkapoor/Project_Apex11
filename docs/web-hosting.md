# MANTRINI web hosting

The existing landing design in `docs/index.html` serves both Android APK downloads and the browser app. GitHub Pages continues publishing `docs/`, with its canonical pointing to `https://mantrini.jaikhyapaparampara.com/`.

Cloudflare Pages project `mantrini` serves the packaged site:

- `/`: descriptive HTML landing page, indexable without JavaScript.
- `/app/`: existing Flutter web app with a self-canonical.
- `/robots.txt` and `/sitemap.xml`: actual discovery files. The sitemap lists the descriptive landing page.
- Unknown URLs: HTTP 404, rather than the old catch-all SPA response.

## Package an existing web build

Use Node.js 22 or later. The app build must use Flutter's root base href (`/`).

```sh
node --test test/site/hosting.test.mjs
node tool/package_site.mjs --app-build build/web --out build/site
npx wrangler pages deploy build/site --project-name mantrini --branch landing-preview
```

`build/site` must be empty or absent. Use a new output directory for each subsequent package. The input build is never modified.

Review the Cloudflare preview before publishing that same artifact with `--branch main`. Do not switch the Pages build directory without also running the packaging step. The existing GitHub Pages workflow is independent and continues uploading `docs/`.

The branch preserves the previously local web audio-loop and automatic-counting fixes in a separate commit, so building from GitHub retains the current app behavior. Android release APKs are not replaced by this workflow.

## Deploy from GitHub Actions

`.github/workflows/cloudflare-pages.yml` builds from source using Flutter 3.44.0 (the version recorded by the existing local web build), runs analysis and tests, verifies the Android debug build, builds the web app, and packages the landing page. It uploads the tested site as an Actions artifact. Branch pushes deploy a Cloudflare preview; a push to `main` deploys production. Pull requests build and validate without using the deployment credential.

The existing Cloudflare project uses Direct Upload. GitHub Actions can deploy to this project with Wrangler; no new Pages project or domain move is needed. See [Cloudflare's CI guide](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).

Configure a repository Actions secret named `CLOUDFLARE_API_TOKEN` with Account → Cloudflare Pages → Edit for the account owning `mantrini`. Keep the token out of source code and chat. The workflow contains the non-secret account ID. Repository secret settings: `https://github.com/09ashishkapoor/Project_Apex11/settings/secrets/actions`.

The deployment job explicitly stops if that secret is missing. Once configured, rerun the failed deployment job to publish the already-built artifact, rather than rebuilding or manually uploading it.

## Browser storage and installed apps

The Flutter app keeps `<base href="/">` and its stable root asset URLs, including `/sqlite3.wasm` and `/drift_worker.js`. The compiled app and database worker are copied unchanged. The database name and schema are not changed; the browser origin remains the same.

`/manifest.json` keeps the previous root PWA identity (`id: "/"`) and launches `/app/`. Existing installed shortcuts that still open `/` are routed to `/app/` in standalone mode. Ordinary browser visits see the landing page.

The existing root worker URLs are retained and upgraded. Navigation uses distinct landing/app offline fallbacks, and arbitrary URLs are never answered with a cached app. Cache installation completes before activation. The migration never deletes IndexedDB, OPFS, local storage or legacy offline caches. Browser history remains local and does not synchronize automatically with the Android APK.

After one successful online visit, allow the worker to finish caching before testing offline reopening. Test both a fresh browser and an existing installation, including a local-history backup, before production deployment.

## Production verification

Verify the landing's title, canonical and two version buttons; the working `/app/` entry; the manifest's identity; correct robots/sitemap content types; and a real 404 for an invented URL. Confirm an existing history record remains visible and the app opens offline. Then submit the subdomain's sitemap and request indexing for its landing page in Search Console. Sitemap submission and a successful live test do not guarantee indexing.
