#!/usr/bin/env node
/**
 * Open Graph / Twitter-card image generator.
 *
 * Renders SVG templates to 1200×630 PNGs in public/og/. One file per
 * blog post + one default for everything else. Re-run whenever a blog
 * title changes or the brand palette shifts — output is committed to
 * the repo so deploys don't need sharp at build time.
 *
 * Usage:
 *   node scripts/gen-og-images.mjs
 *
 * Output:
 *   public/og-default.png                       — landing + non-article pages
 *   public/og/<slug>.png  (per blog post)       — referenced via <Seo ogImage>
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUBLIC = resolve(ROOT, 'public');
const OG_DIR = resolve(PUBLIC, 'og');

// ---- Source of truth for blog post titles. Mirrors src/lib/blog.ts —
// keep these two lists in sync (or import the TS file via a build step
// once the project moves to ESM-importable TS). For now a tiny duplicate
// is cheaper than wiring tsx into the script chain.
const BLOG_POSTS = [
  {
    slug: 'why-we-built-affixai',
    title: 'Why we built AffixAI',
    tag: 'Product',
  },
  {
    slug: 'encrypting-the-vault',
    title: 'Encrypting the vault: how we store your data',
    tag: 'Engineering',
  },
  {
    slug: 'auto-affix-the-engine',
    title: 'How the auto-affix engine reads a PDF',
    tag: 'Engineering',
  },
  {
    slug: 'the-founder-paperwork-tax',
    title: 'The founder paperwork tax — and how to stop paying it',
    tag: 'Product',
  },
];

// ---- SVG template helpers --------------------------------------------------

const W = 1200;
const H = 630;

// Word-wrap a string to a maximum line length. We don't bother with
// per-glyph width measurement — for the title sizes we use, character
// count is close enough.
function wrap(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) {
      cur = w;
      continue;
    }
    if (cur.length + 1 + w.length <= maxChars) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// XML-escape user-supplied strings before embedding in SVG. Without this,
// a title containing `&` or `<` would yield an invalid SVG and sharp would
// crash with a confusing parse error. (None of the current titles need
// this, but the moment someone titles a post "Vault: Tradeoffs & Recipes",
// the script breaks without it.)
function xmlEscape(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildDefaultSvg() {
  const title = 'Auto-sign any PDF';
  const subtitle = 'From your encrypted vault.';
  const cta = 'affixai.com';
  return baseSvg({
    eyebrow: 'AFFIXAI',
    title,
    subtitle,
    cta,
  });
}

function buildBlogSvg(post) {
  const lines = wrap(post.title, 28); // ~28 chars at 64pt fits nicely
  return baseSvg({
    eyebrow: post.tag.toUpperCase() + ' · BLOG',
    titleLines: lines,
    subtitle: '',
    cta: 'affixai.com/blog',
  });
}

function baseSvg({ eyebrow, title, titleLines, subtitle, cta }) {
  const lines = titleLines ?? wrap(title ?? '', 22);
  const titleFontSize = lines.length >= 3 ? 60 : 84;
  const lineHeight = titleFontSize * 1.1;
  const titleStartY = 280 - ((lines.length - 1) * lineHeight) / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <!-- Same gradient palette as the landing-page glow blobs. -->
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f1219"/>
      <stop offset="100%" stop-color="#1a1d2b"/>
    </linearGradient>
    <radialGradient id="glow1" cx="20%" cy="0%" r="60%">
      <stop offset="0%" stop-color="#A855F7" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#A855F7" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="100%" cy="20%" r="55%">
      <stop offset="0%" stop-color="#EC4899" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#EC4899" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#A855F7"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>
    <linearGradient id="textGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#C084FC"/>
      <stop offset="100%" stop-color="#F472B6"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow1)"/>
  <rect width="${W}" height="${H}" fill="url(#glow2)"/>

  <!-- Logo: gradient rounded square + PenLine glyph + wordmark.
       Matches the in-app Logo component visually. -->
  <g transform="translate(80, 80)">
    <rect width="64" height="64" rx="16" fill="url(#brand)"/>
    <path d="M18 42 L18 39 L36 21 L43 28 L25 46 L22 46 Z M38 19 L42 15 L49 22 L45 26 Z"
          fill="white"/>
    <text x="88" y="34" font-family="Plus Jakarta Sans, Inter, system-ui, sans-serif"
          font-size="32" font-weight="800" fill="#FFFFFF" letter-spacing="-0.5">AffixAI</text>
    <text x="88" y="58" font-family="Inter, system-ui, sans-serif"
          font-size="14" font-weight="500" fill="#8a92a8" letter-spacing="2">
      SIGN ANYTHING, INSTANTLY
    </text>
  </g>

  <!-- Eyebrow -->
  <text x="80" y="${titleStartY - lineHeight * 0.9}"
        font-family="Inter, system-ui, sans-serif"
        font-size="20" font-weight="600" fill="#C084FC" letter-spacing="3">
    ${xmlEscape(eyebrow)}
  </text>

  <!-- Title (wrapped) -->
  ${lines
    .map(
      (line, i) =>
        `<text x="80" y="${titleStartY + i * lineHeight}"
              font-family="Plus Jakarta Sans, Inter, system-ui, sans-serif"
              font-size="${titleFontSize}" font-weight="800" fill="#FFFFFF"
              letter-spacing="-1.5">${xmlEscape(line)}</text>`
    )
    .join('\n')}

  <!-- Subtitle (optional, gradient highlight) -->
  ${
    subtitle
      ? `<text x="80" y="${titleStartY + lines.length * lineHeight + 20}"
              font-family="Plus Jakarta Sans, Inter, system-ui, sans-serif"
              font-size="${titleFontSize}" font-weight="800" fill="url(#textGrad)"
              letter-spacing="-1.5">${xmlEscape(subtitle)}</text>`
      : ''
  }

  <!-- Bottom-left URL -->
  <text x="80" y="${H - 60}"
        font-family="Inter, system-ui, sans-serif"
        font-size="22" font-weight="500" fill="#8a92a8">
    ${xmlEscape(cta)}
  </text>

  <!-- Bottom-right "FREE TRIAL" pill — keeps the conversion ask in-frame
       even if the image is the only thing someone sees in a feed. -->
  <g transform="translate(${W - 280}, ${H - 90})">
    <rect width="200" height="44" rx="22" fill="url(#brand)" opacity="0.95"/>
    <text x="100" y="29" font-family="Inter, system-ui, sans-serif"
          font-size="16" font-weight="700" fill="#FFFFFF" letter-spacing="1"
          text-anchor="middle">
      FREE 30-DAY TRIAL
    </text>
  </g>
</svg>`;
}

// ---- Renderer --------------------------------------------------------------

async function renderToPng(svg, outPath) {
  await sharp(Buffer.from(svg))
    .resize(W, H)
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

// ---- PWA icons ------------------------------------------------------------
//
// Re-uses the favicon.svg geometry but at PWA-required dimensions:
//   192×192, 512×512 — Android home-screen + install dialog
//   512×512 maskable — Android adaptive icon (full bleed, no rounded corners
//                      because the OS clips the shape itself)
//   180×180 apple-touch — iOS home-screen icon

function buildAppIconSvg({ size, maskable = false }) {
  // Maskable icons need the visual inside a "safe zone" — the OS may clip
  // a circle/squircle/teardrop out of the canvas. Inset by ~20% (the
  // Android spec calls for the icon to fill the inner 80%).
  const pad = maskable ? size * 0.1 : 0;
  const inner = size - pad * 2;
  const rx = maskable ? 0 : size * 0.22; // square edges for maskable, rounded for normal
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#A855F7"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>
  </defs>
  <!-- Maskable icons get a full-bleed background; normal icons get a
       rounded square so they look like an app icon on Android home -->
  ${
    maskable
      ? `<rect width="${size}" height="${size}" fill="url(#bg)"/>`
      : `<rect x="0" y="0" width="${size}" height="${size}" rx="${rx}" fill="url(#bg)"/>`
  }
  <!-- The PenLine glyph, scaled into the safe area. Coordinates are
       relative to a 32-unit base then transformed. -->
  <g transform="translate(${pad + inner * 0.28}, ${pad + inner * 0.28}) scale(${inner / 32 * 0.45})">
    <path d="M9 21 L9 19.5 L18 10.5 L21.5 14 L12.5 23 L11 23 Z M19 9.5 L21 7.5 L24.5 11 L22.5 13 Z"
          fill="white"/>
  </g>
</svg>`;
}

async function renderIcon(svg, outPath, size) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function main() {
  await mkdir(OG_DIR, { recursive: true });

  // Default OG
  const defaultSvg = buildDefaultSvg();
  await writeFile(resolve(PUBLIC, 'og-default.svg'), defaultSvg);
  await renderToPng(defaultSvg, resolve(PUBLIC, 'og-default.png'));
  console.log('✓ og-default.png');

  // Per blog post OG
  for (const post of BLOG_POSTS) {
    const svg = buildBlogSvg(post);
    await writeFile(resolve(OG_DIR, `${post.slug}.svg`), svg);
    await renderToPng(svg, resolve(OG_DIR, `${post.slug}.png`));
    console.log(`✓ og/${post.slug}.png`);
  }

  // PWA + Apple-touch icons. Filenames match what vite.config.ts /
  // index.html reference; regenerate any time the favicon design changes.
  const icons = [
    { name: 'pwa-192x192.png', size: 192, maskable: false },
    { name: 'pwa-512x512.png', size: 512, maskable: false },
    { name: 'pwa-maskable-512x512.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
  ];
  for (const ic of icons) {
    const svg = buildAppIconSvg({ size: ic.size, maskable: ic.maskable });
    await renderIcon(svg, resolve(PUBLIC, ic.name), ic.size);
    console.log(`✓ ${ic.name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
