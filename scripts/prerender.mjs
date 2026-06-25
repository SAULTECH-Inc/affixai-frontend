#!/usr/bin/env node
/**
 * Post-build static prerender for the public marketing pages.
 *
 * Why this exists:
 *   We're a Vite SPA. Out of the box, every route serves the same
 *   index.html with an empty <div id="root">. Modern Google handles JS-
 *   rendered pages fine; Bingbot, Slurp, GPTBot, Slackbot, Discordbot,
 *   and most LinkedIn/Twitter share-card crawlers do NOT. This script
 *   replaces dist/<route>/index.html with the actual rendered DOM for
 *   each public marketing route — so crawlers + LLMs get real HTML.
 *
 * Why a custom script vs a Vite plugin:
 *   vite-plugin-prerender and react-snap are both unmaintained. Rolling
 *   ~80 lines of puppeteer-core is cheaper than chasing dead plugins.
 *
 * Usage:
 *   npm run build           — runs vite build, then this script
 *   node scripts/prerender.mjs  — manual invocation against ./dist
 *
 * CI: install with `npm ci && npx puppeteer browsers install chrome`.
 * Locally, run `npx puppeteer browsers install chrome` once and the
 * cached binary is reused.
 */
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { existsSync, statSync, readFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST = resolve(__dirname, '..', 'dist');
const PORT = 4173;

// Public routes we want to ship as static HTML. Add new ones here when
// you add a new marketing page in src/pages/marketing/.
const ROUTES = [
  '/',
  '/about',
  '/blog',
  '/blog/why-we-built-affixai',
  '/blog/encrypting-the-vault',
  '/blog/auto-affix-the-engine',
  '/blog/the-founder-paperwork-tax',
  '/careers',
  '/contact',
  '/privacy',
  '/terms',
  '/dpa',
];

// ---- Tiny static file server ----------------------------------------------
//
// We can't run `vite preview` because we WRITE BACK into dist mid-loop —
// preview caches things. A 30-line static server reads from disk on every
// request and works perfectly.

function serveDist() {
  return new Promise((resolveOk) => {
    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url, 'http://localhost');
        let filePath = join(DIST, url.pathname);
        // SPA fallback: anything not a file → index.html
        if (!existsSync(filePath) || !statSync(filePath).isFile()) {
          filePath = join(DIST, 'index.html');
        }
        const ext = filePath.split('.').pop();
        const mime =
          ext === 'html'
            ? 'text/html'
            : ext === 'js'
              ? 'application/javascript'
              : ext === 'css'
                ? 'text/css'
                : ext === 'svg'
                  ? 'image/svg+xml'
                  : ext === 'json'
                    ? 'application/json'
                    : 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(readFileSync(filePath));
      } catch (e) {
        res.writeHead(500);
        res.end(String(e));
      }
    });
    server.listen(PORT, () => resolveOk(server));
  });
}

// ---- Puppeteer driver -----------------------------------------------------

async function renderRoute(browser, route) {
  const page = await browser.newPage();
  // Tag the request so the app could opt out of analytics / errant
  // effects during the build crawl. Currently nothing reads it.
  await page.setExtraHTTPHeaders({ 'X-Prerender': '1' });
  // Block third-party domains (Google Fonts, Plausible) to keep the
  // build hermetic and avoid noise in analytics dashboards.
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    if (
      u.includes('googleapis.com') ||
      u.includes('gstatic.com') ||
      u.includes('plausible.io') ||
      u.includes('ingest.sentry.io')
    ) {
      req.abort();
    } else {
      req.continue();
    }
  });

  await page.goto(`http://localhost:${PORT}${route}`, {
    waitUntil: 'networkidle0',
    timeout: 30_000,
  });
  // Give React Helmet one tick to commit final head tags.
  await new Promise((r) => setTimeout(r, 200));

  // Grab the post-render HTML including the head (so per-page <title>,
  // meta, OG, JSON-LD all carry through).
  const html = await page.content();
  await page.close();
  return html;
}

// ---- Main -----------------------------------------------------------------

async function main() {
  if (!existsSync(DIST)) {
    console.error(`✗ ${DIST} doesn't exist. Run \`vite build\` first.`);
    process.exit(1);
  }

  // puppeteer-core needs a separate Chrome install. We use the standard
  // `puppeteer` package which bundles its own Chromium — heavier but
  // zero-config. Lazy-imported so dev builds without puppeteer still
  // work fine (only prerender breaks, with a clear error).
  let puppeteer;
  try {
    puppeteer = (await import('puppeteer')).default;
  } catch (e) {
    console.error(
      '✗ puppeteer not installed. Run `npm install -D puppeteer` and retry.\n' +
        '  In CI: `npx puppeteer browsers install chrome` after npm ci.'
    );
    process.exit(1);
  }

  console.log(`→ starting static server on :${PORT}`);
  const server = await serveDist();
  console.log(`→ launching headless Chrome`);
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });

  try {
    for (const route of ROUTES) {
      process.stdout.write(`  prerender ${route} ... `);
      const html = await renderRoute(browser, route);
      // Mirror SPA expectations: /about → dist/about/index.html
      const outDir = route === '/' ? DIST : join(DIST, route);
      await mkdir(outDir, { recursive: true });
      const outFile = join(outDir, 'index.html');
      await writeFile(outFile, html, 'utf8');
      console.log(`ok (${(html.length / 1024).toFixed(1)} KB)`);
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`✓ prerendered ${ROUTES.length} routes`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
