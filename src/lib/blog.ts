// Blog post registry. One entry per published post. The full body lives
// in src/pages/marketing/blog/<slug>.tsx as a React component — we keep
// the listing metadata here so BlogPage can build the index without
// importing every post.
//
// When you add a new post:
//   1. Create src/pages/marketing/blog/your-slug.tsx (use one of the
//      existing posts as a template — Seo + Prose).
//   2. Add a route in App.tsx: <Route path="/blog/your-slug" ... />
//   3. Add an entry below.
//   4. Add a URL to public/sitemap.xml.

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;       // human-readable
  iso_date: string;   // ISO 8601 for JSON-LD
  read: string;       // "4 min read"
  tag: 'Product' | 'Engineering' | 'Changelog' | 'Company';
  author: string;
}

export const POSTS: BlogPost[] = [
  {
    slug: 'the-founder-paperwork-tax',
    title: 'The founder paperwork tax — and how to stop paying it',
    excerpt:
      "Forty-seven documents in your first year. Most of them want the same data. Here's the math, and what we built to stop the bleeding.",
    date: 'Jun 14, 2026',
    iso_date: '2026-06-14',
    read: '7 min read',
    tag: 'Product',
    author: 'AffixAI team',
  },
  {
    slug: 'why-we-built-affixai',
    title: 'Why we built AffixAI',
    excerpt:
      "I counted: I typed my address into forms 84 times last year. This is the case for a vault that signs documents for you.",
    date: 'Jun 10, 2026',
    iso_date: '2026-06-10',
    read: '4 min read',
    tag: 'Product',
    author: 'AffixAI team',
  },
  {
    slug: 'encrypting-the-vault',
    title: 'Encrypting the vault: how we store your data',
    excerpt:
      'AES-256-GCM, per-field encryption, key rotation, and what we deliberately do NOT do.',
    date: 'May 28, 2026',
    iso_date: '2026-05-28',
    read: '6 min read',
    tag: 'Engineering',
    author: 'AffixAI team',
  },
  {
    slug: 'auto-affix-the-engine',
    title: 'How the auto-affix engine reads a PDF',
    excerpt:
      "A walk through the four detection passes that map a blank line on a form to a field in your vault.",
    date: 'May 14, 2026',
    iso_date: '2026-05-14',
    read: '8 min read',
    tag: 'Engineering',
    author: 'AffixAI team',
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}
