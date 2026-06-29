import { Link } from 'react-router-dom';
import { ArrowRight, Check, X, Star } from 'lucide-react';
import { MarketingLayout, Prose } from '@/components/marketing/MarketingLayout';
import { Seo } from '@/components/Seo';

// ---- Tool card data -------------------------------------------------------

interface Tool {
  name: string;
  rank: number;
  tagline: string;
  slug: string;
  altPath?: string;
  pros: string[];
  cons: string[];
  bestFor: string;
  freeplan: string;
  startingPrice: string;
  stars: number; // out of 5, in 0.5 increments
}

const tools: Tool[] = [
  {
    name: 'Affix AI',
    rank: 1,
    tagline: 'Best overall — AI auto-fill + encrypted vault',
    slug: '',
    pros: [
      'AI reads the PDF and auto-fills every field from your vault',
      'AES-256-GCM encrypted personal data vault',
      'Regional pricing: ₦7,500/mo Nigeria, $8/mo Africa, $19/mo globally',
      'Chrome extension auto-fills web forms too',
      'Free plan: 5 docs/month, forever',
      '30-day Pro trial with no card required',
      'Multi-party signing with guest links (no account needed)',
    ],
    cons: [
      'No native Dropbox / Google Drive integration yet',
      'No enterprise compliance certifications (SOC 2) yet',
      'Mobile experience via PWA, not a native app',
    ],
    bestFor:
      'Individuals, freelancers, and small teams who sign documents regularly and want to eliminate manual data entry.',
    freeplan: '5 documents/month, forever',
    startingPrice: 'Free · $19/month Pro (₦7,500/mo for Nigeria)',
    stars: 5,
  },
  {
    name: 'DocuSign',
    rank: 2,
    tagline: 'Best for enterprise compliance workflows',
    slug: 'docusign-alternative',
    altPath: '/docusign-alternative',
    pros: [
      'Industry-standard, widely recognized and accepted',
      'Strong enterprise compliance (SOC 2, HIPAA, ISO 27001)',
      'Mature API for SaaS integrations',
      'Multi-party routing and bulk send',
    ],
    cons: [
      'No free plan — minimum $15/user/month',
      'No AI auto-fill; requires manual field placement by sender',
      'No personal data vault',
      'USD-only pricing, no regional discounts',
      'Expensive for individual users and small teams',
    ],
    bestFor:
      'Enterprise legal, HR, and compliance teams that need audit trails and regulatory certifications.',
    freeplan: 'None',
    startingPrice: '$15/user/month (billed annually)',
    stars: 3.5,
  },
  {
    name: 'HelloSign (Dropbox Sign)',
    rank: 3,
    tagline: 'Best for Dropbox-heavy teams',
    slug: 'hellosign-alternative',
    altPath: '/hellosign-alternative',
    pros: [
      'Seamless Dropbox integration',
      'Clean, easy-to-use interface',
      'Small free tier (3 requests/month)',
      'Good API for embedding signatures in apps',
    ],
    cons: [
      'Free plan capped at 3 requests/month',
      'No AI auto-fill from personal data vault',
      'Expensive at $20/user/month for Essentials',
      'USD-only pricing, no Africa/Asia regional rates',
      'Value dependent on Dropbox ecosystem',
    ],
    bestFor: 'Small teams already using Dropbox who need simple signature collection.',
    freeplan: '3 signature requests/month',
    startingPrice: '$20/user/month (Essentials, billed annually)',
    stars: 3,
  },
  {
    name: 'SignNow',
    rank: 4,
    tagline: 'Best for affordable team workflows',
    slug: 'signnow-alternative',
    altPath: '/signnow-alternative',
    pros: [
      'Lower per-seat price than DocuSign and HelloSign',
      'Workflow automation and conditional routing',
      'Role-based signing sequences',
      'Bulk send and templates',
    ],
    cons: [
      'No free plan (trial only)',
      'No AI auto-fill; manual field placement required',
      'Team pricing adds up: $8/user minimum per seat',
      'No encrypted personal data vault',
      'USD-only pricing',
    ],
    bestFor:
      'Small businesses needing multi-step approval workflows without DocuSign\'s premium price tag.',
    freeplan: 'None (free trial only)',
    startingPrice: '$8/user/month (Business, billed annually)',
    stars: 3,
  },
  {
    name: 'Adobe Acrobat Sign',
    rank: 5,
    tagline: 'Best for existing Adobe Acrobat subscribers',
    slug: 'adobe-sign-alternative',
    altPath: '/adobe-sign-alternative',
    pros: [
      'Native PDF editing via Acrobat',
      'Strong enterprise compliance certifications',
      'Tight Adobe Creative Cloud integration',
      'Widely trusted brand',
    ],
    cons: [
      'Most expensive option — $23/user/month minimum',
      'No free plan for e-signatures',
      'Requires Acrobat subscription to access Sign features',
      'No AI auto-fill from personal vault',
      'USD-only, no regional pricing',
    ],
    bestFor:
      'Organizations already paying for Adobe Acrobat who want signing included in their existing subscription.',
    freeplan: 'None',
    startingPrice: '$23/user/month (Acrobat Standard)',
    stars: 2.5,
  },
];

// ---- Star renderer --------------------------------------------------------

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < Math.floor(count);
        const half = !filled && i < count;
        return (
          <Star
            key={i}
            className={`h-4 w-4 ${
              filled
                ? 'text-amber-400 fill-amber-400'
                : half
                ? 'text-amber-400 fill-amber-400/50'
                : 'text-fg-subtle'
            }`}
          />
        );
      })}
      <span className="ml-1 text-xs text-fg-muted font-medium">{count}/5</span>
    </span>
  );
}

// ---- Page ----------------------------------------------------------------

export default function BestESignatureSoftware() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: 'Best Electronic Signature Software in 2025 (Free & Paid)',
        description:
          'Honest comparison of the 5 best e-signature tools in 2025 — Affix AI, DocuSign, HelloSign, SignNow, and Adobe Sign — covering pricing, features, free plans, and who each tool is best for.',
        datePublished: '2025-06-01',
        dateModified: '2025-06-29',
        author: { '@type': 'Organization', name: 'AffixAI', url: 'https://affix-ai.com/about' },
        publisher: {
          '@type': 'Organization',
          name: 'AffixAI',
          logo: { '@type': 'ImageObject', url: 'https://affix-ai.com/logo.png' },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': 'https://affix-ai.com/blog/best-electronic-signature-software',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://affix-ai.com/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://affix-ai.com/blog' },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'Best Electronic Signature Software in 2025',
            item: 'https://affix-ai.com/blog/best-electronic-signature-software',
          },
        ],
      },
    ],
  };

  return (
    <MarketingLayout>
      <Seo
        title="Best Electronic Signature Software in 2025 (Free & Paid) · AffixAI"
        description="Honest comparison of the 5 best e-signature tools in 2025 — Affix AI, DocuSign, HelloSign, SignNow, and Adobe Sign. Covers pricing, AI features, free plans, and regional pricing for Africa."
        path="/blog/best-electronic-signature-software"
        ogType="article"
        jsonLd={jsonLd}
      />

      {/* Article header */}
      <header className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-bg-inset border border-border px-3 py-1 text-xs font-medium text-fg-muted mb-5">
          Comparison · June 2025
        </div>
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
          Best Electronic Signature Software in 2025
          <span className="block text-fg-muted text-2xl sm:text-3xl lg:text-4xl mt-1 font-semibold">
            Free &amp; Paid — Honest Comparison
          </span>
        </h1>
        <p className="mt-5 text-lg text-fg-muted leading-relaxed">
          E-signature software has gone mainstream — but not all tools are equal. Some are built for
          enterprise compliance teams. Some are built for Dropbox users. One is built to eliminate
          the manual data entry that makes signing tedious in the first place. Here's an honest look
          at the five most popular options in 2025.
        </p>
        <p className="mt-3 text-sm text-fg-subtle">
          Last updated: June 2025 · 8 min read
        </p>
      </header>

      {/* Quick summary table */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
        <h2 className="font-display text-2xl font-bold mb-6">Quick comparison summary</h2>
        <div className="rounded-2xl border border-border overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-bg-elevated border-b border-border">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-fg-subtle font-semibold">Tool</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-fg-subtle font-semibold">Free plan</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-fg-subtle font-semibold">Starting price</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-fg-subtle font-semibold">AI auto-fill</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-fg-subtle font-semibold">Rating</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((tool, i) => (
                <tr key={tool.name} className={`border-b border-border last:border-b-0 ${i % 2 === 0 ? 'bg-bg-base' : 'bg-bg-elevated/30'}`}>
                  <td className="px-4 py-3.5 font-medium text-fg">
                    {tool.altPath ? (
                      <Link to={tool.altPath} className="text-brand-300 hover:underline">
                        {tool.name}
                      </Link>
                    ) : (
                      <span className="text-brand-300">{tool.name} ★</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-fg-muted">{tool.freeplan}</td>
                  <td className="px-4 py-3.5 text-fg-muted">{tool.startingPrice}</td>
                  <td className="px-4 py-3.5">
                    {tool.rank === 1 ? (
                      <span className="inline-flex items-center gap-1 text-green-400">
                        <Check className="h-3.5 w-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-400">
                        <X className="h-3.5 w-3.5" /> No
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <Stars count={tool.stars} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Individual tool reviews */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <h2 className="font-display text-2xl font-bold mb-2">Detailed reviews</h2>
        <p className="text-fg-muted text-sm mb-8">
          We tested each tool by uploading the same set of PDFs — a freelance contract, a government
          form, and a multi-party NDA — and measured time-to-sign, data entry required, and total
          monthly cost for a solo user. Here's what we found.
        </p>

        <div className="space-y-10">
          {tools.map((tool) => (
            <div key={tool.name} id={tool.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}>
              {/* Tool header */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500/20 to-accent-500/20 text-brand-300 font-bold text-sm flex-shrink-0">
                    #{tool.rank}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-bold">
                      {tool.altPath ? (
                        <Link to={tool.altPath} className="hover:text-brand-300 transition">
                          {tool.name}
                        </Link>
                      ) : (
                        tool.name
                      )}
                    </h3>
                    <p className="text-xs text-fg-muted">{tool.tagline}</p>
                  </div>
                </div>
                <div className="sm:ml-auto">
                  <Stars count={tool.stars} />
                </div>
              </div>

              {/* Pricing badge */}
              <div className="inline-flex items-center gap-2 rounded-lg bg-bg-elevated border border-border px-3 py-1.5 text-xs text-fg-muted mb-4">
                <span className="font-semibold text-fg">Pricing:</span>
                {tool.startingPrice}
                <span className="text-fg-subtle">·</span>
                <span className="font-semibold text-fg">Free plan:</span>
                {tool.freeplan}
              </div>

              {/* Best for */}
              <p className="text-sm text-fg-muted mb-4 italic">
                <strong className="not-italic text-fg">Best for:</strong> {tool.bestFor}
              </p>

              {/* Pros / cons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="rounded-xl border border-border bg-bg-elevated p-4">
                  <div className="text-xs uppercase tracking-widest text-green-400 font-semibold mb-3">
                    Pros
                  </div>
                  <ul className="space-y-2">
                    {tool.pros.map((pro) => (
                      <li key={pro} className="flex items-start gap-2 text-sm text-fg-muted">
                        <Check className="h-3.5 w-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-border bg-bg-elevated p-4">
                  <div className="text-xs uppercase tracking-widest text-red-400 font-semibold mb-3">
                    Cons
                  </div>
                  <ul className="space-y-2">
                    {tool.cons.map((con) => (
                      <li key={con} className="flex items-start gap-2 text-sm text-fg-muted">
                        <X className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Link to full comparison */}
              {tool.altPath && (
                <Link
                  to={tool.altPath}
                  className="inline-flex items-center gap-1.5 text-sm text-brand-300 hover:underline"
                >
                  Full Affix AI vs {tool.name} comparison
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}

              {tool.rank < tools.length && (
                <hr className="border-border mt-8" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Prose conclusion */}
      <Prose>
        <h2>How to choose the right e-signature tool</h2>
        <p>
          The best e-signature software depends almost entirely on <strong>who is doing the signing</strong>.
          Enterprise legal teams with complex approval chains and compliance requirements are well
          served by DocuSign or Adobe Sign — the certification overhead is worth it at that scale.
        </p>
        <p>
          For everyone else — freelancers, startup founders, HR teams at growing companies, and
          anyone outside the US who is tired of paying USD SaaS prices — the calculus is different.
          The real cost of e-signature software isn't just the monthly subscription. It's the
          minutes spent manually typing your name, address, employer, and ID number into the
          seventeenth form this month. Multiplied by every document, every month, for every person
          on your team.
        </p>
        <h2>Why AI auto-fill is the differentiator in 2025</h2>
        <p>
          Every tool on this list lets you sign a document. Only{' '}
          <a href="https://affix-ai.com">Affix AI</a> reads the document first and fills it for
          you. That distinction compounds over time — the more documents you sign, the more value
          the vault creates. After you enter your data once, every subsequent document takes
          seconds instead of minutes.
        </p>
        <p>
          The Chrome extension extends this further: it detects signing links on any website and
          auto-populates web forms from the same vault. No other tool in this comparison offers
          this capability.
        </p>
        <h2>Regional pricing matters more than people admit</h2>
        <p>
          DocuSign, HelloSign, SignNow, and Adobe Sign all price in USD, regardless of where the
          customer is located. For a professional in Nigeria paying $15-23/month, that's a
          meaningful percentage of income for what is, at its core, a form-filling tool. Affix AI
          deliberately offers ₦7,500/month for Nigerian users via Paystack and $8/month for African
          users via Flutterwave — pricing that reflects purchasing power rather than just exchange
          rates.
        </p>
        <h2>Our verdict</h2>
        <p>
          For most individuals and small teams, <strong>Affix AI is the best value e-signature
          tool in 2025</strong> — not just because it's the most affordable, but because the AI
          auto-fill feature genuinely changes the signing experience. DocuSign remains the
          safe enterprise choice. HelloSign is worth considering if Dropbox is central to your
          workflow. SignNow is a reasonable middle ground for team workflows on a budget. Adobe
          Sign only makes sense if you're already paying for Acrobat.
        </p>
        <p>
          The free plans tell you a lot about who each company is building for. Affix AI gives
          you 5 real documents per month, free forever, with no card required. That's a genuine
          free tier — not a 14-day window to experience urgency. Try it and see.
        </p>
      </Prose>

      {/* Internal links section */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <div className="rounded-2xl border border-border bg-bg-elevated p-6">
          <h3 className="font-display text-base font-semibold mb-4">
            Side-by-side comparisons
          </h3>
          <ul className="space-y-2">
            {[
              ['Affix AI vs DocuSign — full comparison', '/docusign-alternative'],
              ['Affix AI vs HelloSign (Dropbox Sign) — full comparison', '/hellosign-alternative'],
              ['Affix AI vs SignNow — full comparison', '/signnow-alternative'],
              ['Affix AI vs Adobe Acrobat Sign — full comparison', '/adobe-sign-alternative'],
            ].map(([label, path]) => (
              <li key={path}>
                <Link
                  to={path}
                  className="inline-flex items-center gap-1.5 text-sm text-brand-300 hover:underline"
                >
                  <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="rounded-3xl bg-gradient-to-br from-brand-500/10 to-accent-500/10 border border-brand-500/20 p-8 sm:p-12 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">
            Try the #1 rated e-signature tool free
          </h2>
          <p className="text-fg-muted max-w-xl mx-auto mb-6 text-sm leading-relaxed">
            Start with 5 free documents per month — no credit card, no time limit. Upgrade to Pro
            for unlimited documents, the Chrome extension, and full vault access.
          </p>
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-7 py-3.5 text-base font-semibold text-white shadow-glow hover:opacity-95 transition"
          >
            Try Affix AI free
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <p className="mt-3 text-xs text-fg-subtle">
            30-day Pro trial · No credit card · Cancel anytime
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
