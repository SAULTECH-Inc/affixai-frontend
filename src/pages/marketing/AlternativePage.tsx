import { Link } from 'react-router-dom';
import { Check, X, ArrowRight } from 'lucide-react';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { Seo } from '@/components/Seo';

export interface ComparisonRow {
  feature: string;
  affixai: boolean | string;
  competitor: boolean | string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface AlternativePageProps {
  competitor: string;
  competitorUrl: string;
  slug: string;
  competitorTagline: string;
  competitorPrice: string;
  competitorFreeplan: string;
  description: string;
  heroSubtitle: string;
  comparisonRows: ComparisonRow[];
  faq: FaqItem[];
  keyDifference: string;
}

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1.5 text-green-400 font-medium">
        <Check className="h-4 w-4 flex-shrink-0" />
        Yes
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1.5 text-red-400 font-medium">
        <X className="h-4 w-4 flex-shrink-0" />
        No
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
      <Check className="h-4 w-4 flex-shrink-0 opacity-60" />
      {value}
    </span>
  );
}

export default function AlternativePage({
  competitor,
  competitorUrl,
  slug,
  competitorTagline,
  competitorPrice,
  competitorFreeplan,
  description,
  heroSubtitle,
  comparisonRows,
  faq,
  keyDifference,
}: AlternativePageProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://affix-ai.com/' },
      { '@type': 'ListItem', position: 2, name: `${competitor} Alternative`, item: `https://affix-ai.com/${slug}` },
    ],
  };

  return (
    <MarketingLayout>
      <Seo
        title={`Best ${competitor} Alternative — Affix AI`}
        description={description}
        path={`/${slug}`}
        jsonLd={jsonLd}
      />

      {/* Hero */}
      <section className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-10 sm:pb-14 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-bg-inset border border-border px-3 py-1 text-xs font-medium text-fg-muted mb-5">
          {competitor} Alternative
        </div>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
          The Best{' '}
          <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
            {competitor} Alternative
          </span>
        </h1>
        <p className="mt-5 text-lg text-fg-muted max-w-2xl mx-auto leading-relaxed">
          {heroSubtitle}
        </p>
        <p className="mt-3 text-sm text-fg-subtle max-w-xl mx-auto">
          {keyDifference}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3.5 text-base font-semibold text-white shadow-glow hover:opacity-95 transition"
          >
            Try Affix AI free — no card required
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href="/#pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-6 py-3.5 text-base font-medium text-fg-muted hover:text-fg transition"
          >
            View pricing
          </a>
        </div>
        <p className="mt-4 text-xs text-fg-subtle">
          30-day free Pro trial · No credit card · Cancel anytime
        </p>
      </section>

      {/* Comparison table */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-14 sm:pb-20">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-2">
          Affix AI vs {competitor}: Feature Comparison
        </h2>
        <p className="text-center text-fg-muted mb-8 text-sm">
          A side-by-side look at the features that matter most to individuals and growing teams.
        </p>
        <div className="rounded-2xl border border-border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-3 bg-bg-elevated border-b border-border">
            <div className="px-4 py-3 text-xs uppercase tracking-widest text-fg-subtle font-semibold">
              Feature
            </div>
            <div className="px-4 py-3 text-xs uppercase tracking-widest text-brand-300 font-semibold text-center border-l border-border">
              Affix AI
            </div>
            <div className="px-4 py-3 text-xs uppercase tracking-widest text-fg-subtle font-semibold text-center border-l border-border">
              {competitor}
            </div>
          </div>
          {comparisonRows.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-3 border-b border-border last:border-b-0 ${
                i % 2 === 0 ? 'bg-bg-base' : 'bg-bg-elevated/40'
              }`}
            >
              <div className="px-4 py-3.5 text-sm text-fg-muted">{row.feature}</div>
              <div className="px-4 py-3.5 text-sm text-center border-l border-border">
                <CellValue value={row.affixai} />
              </div>
              <div className="px-4 py-3.5 text-sm text-center border-l border-border">
                <CellValue value={row.competitor} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing comparison */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-14 sm:pb-20">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-8">
          Pricing Comparison
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AffixAI */}
          <div className="rounded-2xl border-2 border-brand-500/50 bg-bg-elevated p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-3 py-1 text-xs font-bold text-white shadow-glow">
                Recommended
              </span>
            </div>
            <div className="text-center mb-5 mt-2">
              <div className="font-display text-xl font-bold">Affix AI</div>
              <div className="text-fg-muted text-sm mt-1">AI-native signing</div>
            </div>
            <ul className="space-y-2.5 text-sm">
              {[
                'Free tier: 5 documents/month, forever',
                '30-day Pro trial — no card required',
                '₦7,500/month for Nigeria users (Paystack)',
                '$8/month for Africa (Flutterwave)',
                '$19/month globally — all features included',
                'No per-seat pricing on Solo plan',
                'AI auto-fill, vault, Chrome extension included',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-fg-muted">
                  <Check className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Competitor */}
          <div className="rounded-2xl border border-border bg-bg-elevated p-6">
            <div className="text-center mb-5">
              <div className="font-display text-xl font-bold">{competitor}</div>
              <div className="text-fg-muted text-sm mt-1">{competitorTagline}</div>
            </div>
            <ul className="space-y-2.5 text-sm">
              {[
                `Starting price: ${competitorPrice}`,
                `Free plan: ${competitorFreeplan}`,
                'Charged in USD regardless of region',
                'No AI auto-fill from personal data vault',
                'Manual field placement required by sender',
                'No encrypted personal data vault',
                'No Chrome extension for web form auto-fill',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-fg-muted">
                  <X className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Why switch section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-14 sm:pb-20">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-3">
          Why teams switch from {competitor} to Affix AI
        </h2>
        <p className="text-center text-fg-muted mb-8 text-sm max-w-2xl mx-auto">
          {competitor} built its platform for enterprises needing compliance workflows.
          Affix AI is built for people who just need to get documents signed — fast,
          privately, and without overpaying.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              title: 'AI auto-fill from your vault',
              body:
                'Drop any PDF and Affix AI reads every field, then fills it automatically from your encrypted vault — name, address, employer, IDs, signatures. No manual field placement, no copy-paste.',
            },
            {
              title: 'Regional pricing that makes sense',
              body:
                'Pay in your local currency at a price that reflects your market. ₦7,500/mo for Nigeria via Paystack, $8/mo for Africa via Flutterwave, $19/mo globally. Not $30-45/mo in USD.',
            },
            {
              title: 'Privacy-first encrypted vault',
              body:
                'Your personal data is stored AES-256-GCM encrypted in your vault — not in the document platform, not in plain text. Used only to fill your forms. Never trained on, never sold.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-border bg-bg-elevated p-6"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-500/20 text-brand-300 mb-4">
                <Check className="h-4 w-4" />
              </div>
              <h3 className="font-display text-base font-semibold mb-2">{card.title}</h3>
              <p className="text-sm text-fg-muted leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-14 sm:pb-20">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-8">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {faq.map((item) => (
            <div key={item.q} className="rounded-2xl border border-border bg-bg-elevated p-6">
              <h3 className="font-display text-base font-semibold mb-2">{item.q}</h3>
              <p className="text-sm text-fg-muted leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-fg-muted">
          Also compare:{' '}
          {[
            ['DocuSign', '/docusign-alternative'],
            ['HelloSign', '/hellosign-alternative'],
            ['SignNow', '/signnow-alternative'],
            ['Adobe Sign', '/adobe-sign-alternative'],
          ]
            .filter(([name]) => !name.toLowerCase().includes(competitor.toLowerCase().split(' ')[0].toLowerCase()))
            .map(([name, path], i, arr) => (
              <span key={name}>
                <Link to={path} className="text-brand-300 hover:underline">
                  Affix AI vs {name}
                </Link>
                {i < arr.length - 1 ? ' · ' : ''}
              </span>
            ))}
          {' · '}
          <Link to="/blog/best-electronic-signature-software" className="text-brand-300 hover:underline">
            Best e-signature software 2025
          </Link>
        </p>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="rounded-3xl bg-gradient-to-br from-brand-500/10 to-accent-500/10 border border-brand-500/20 p-8 sm:p-12 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">
            Ready to leave {competitor} behind?
          </h2>
          <p className="text-fg-muted max-w-xl mx-auto mb-6 text-sm leading-relaxed">
            Join thousands of individuals and teams who switched to Affix AI for
            faster signing, fairer pricing, and a vault that keeps their data private.
            Start free — no credit card needed.
          </p>
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-7 py-3.5 text-base font-semibold text-white shadow-glow hover:opacity-95 transition"
          >
            Try Affix AI free
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <p className="mt-3 text-xs text-fg-subtle">
            30-day Pro trial · No credit card · Cancel anytime ·{' '}
            <a
              href={`https://${competitorUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Still on {competitor}?
            </a>
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
