import { Helmet } from 'react-helmet-async';

// Per-page SEO. Drop one of these at the top of any public page and it
// overrides the defaults baked into index.html: title, description,
// canonical, Open Graph + Twitter cards. JSON-LD passes through as a
// raw object — pages can ship FAQ / Article / BreadcrumbList schemas.
//
// The site-wide defaults (org name, social handles, default OG image)
// stay in index.html so a fresh request to a non-existent route still
// has rich metadata — important for the share-card crawlers that don't
// run JavaScript.
const SITE_URL = 'https://affix-ai.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

export interface SeoProps {
  /** Page-specific title; final form becomes "<title> · AffixAI". */
  title: string;
  /** 1-2 sentence description shown in search results + share cards. */
  description: string;
  /** Path part of the canonical URL (without origin). e.g. "/about" */
  path: string;
  /** Optional override for the OG / Twitter image. Defaults to site-wide. */
  ogImage?: string;
  /** "article" for blog posts, default "website" everywhere else. */
  ogType?: 'website' | 'article';
  /** noindex this page (e.g. internal auth-walled pages we don't want
   *  ending up in search). Default false. */
  noindex?: boolean;
  /** Optional JSON-LD object — schema.org structured data. Rendered as
   *  a <script type="application/ld+json">. */
  jsonLd?: Record<string, unknown>;
}

export function Seo({
  title,
  description,
  path,
  ogImage,
  ogType = 'website',
  noindex = false,
  jsonLd,
}: SeoProps) {
  const fullTitle = title.endsWith('AffixAI') ? title : `${title} · AffixAI`;
  const canonical = `${SITE_URL}${path === '/' ? '' : path}`;
  const image = ogImage ?? DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, follow" />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />

      {/* Twitter / X — large card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Optional structured data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
