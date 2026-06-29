import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { api } from '@/lib/api';
import { detectCountryFromBrowser } from '@/lib/countries';

interface PlanFromApi {
  plan: 'trial' | 'pro' | 'enterprise';
  name: string;
  amount: string | null;
  currency: string;
  features: string[];
}

function formatPrice(amount: string | null, currency: string): string {
  if (!amount || amount === '0' || amount === '0.00') return '$0';
  const n = parseFloat(amount);
  if (Number.isNaN(n)) return '$0';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(0)}`;
  }
}

export default function PricingPage() {
  const detectedCountry = detectCountryFromBrowser();

  const { data: apiPlans } = useQuery({
    queryKey: ['public', 'plans', detectedCountry ?? 'default'],
    queryFn: async () => {
      const { data } = await api.get<PlanFromApi[]>('/subscriptions/plans', {
        params: detectedCountry ? { country: detectedCountry } : {},
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const apiByPlan = new Map((apiPlans ?? []).map((p) => [p.plan, p]));

  const plans = [
    {
      key: 'trial',
      name: 'Free',
      price: '$0',
      tag: 'For trying it out',
      features: ['5 signed documents / mo', 'Encrypted vault', 'Built-in vault sections', 'Email support'],
      cta: 'Start free',
      to: '/register',
      highlight: false,
    },
    {
      key: 'pro',
      name: 'Pro',
      price: apiByPlan.get('pro')
        ? formatPrice(apiByPlan.get('pro')!.amount, apiByPlan.get('pro')!.currency)
        : '—',
      sub: '/month',
      tag: 'For professionals',
      features: apiByPlan.get('pro')?.features ?? [
        'Unlimited documents',
        'Custom vault sections',
        'Send & collect signatures',
        'Google Drive export',
        '30-day free trial',
      ],
      cta: 'Start 30-day trial',
      to: '/register',
      highlight: true,
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      price: apiByPlan.get('enterprise')?.amount
        ? formatPrice(apiByPlan.get('enterprise')!.amount, apiByPlan.get('enterprise')!.currency)
        : 'Custom',
      sub: apiByPlan.get('enterprise')?.amount ? '/month' : undefined,
      tag: 'For teams',
      features: apiByPlan.get('enterprise')?.features ?? [
        'Bulk-sign API',
        'Per-enterprise vault sections',
        'SSO + audit log export',
        'Webhooks & cloud exports',
        'Priority support',
      ],
      cta: apiByPlan.get('enterprise')?.amount ? 'Get Enterprise' : 'Talk to sales',
      to: apiByPlan.get('enterprise')?.amount ? '/register' : '/contact',
      highlight: false,
    },
  ];

  return (
    <MarketingLayout>
      <Seo
        title="Pricing — Affix AI"
        description="Sign documents online free. Affix AI offers a free tier (5 docs/month), Pro unlimited plan, and Enterprise. Regional pricing for Nigeria, Africa, and global users. No credit card required."
        path="/pricing"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Affix AI Pricing',
          description: 'Pricing plans for Affix AI electronic signature and document signing software.',
          url: 'https://affix-ai.com/pricing',
          breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://affix-ai.com/' },
              { '@type': 'ListItem', position: 2, name: 'Pricing', item: 'https://affix-ai.com/pricing' },
            ],
          },
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs uppercase tracking-widest font-semibold text-brand-400 mb-3">Pricing</p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
            One free tier. One paid plan.<br />One enterprise.
          </h1>
          <p className="mt-4 text-fg-muted text-lg">
            No seat math. No surprise fees. Regional pricing for Africa and beyond.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {plans.map((p) => (
            <div
              key={p.key}
              className={
                'relative rounded-2xl p-7 ' +
                (p.highlight
                  ? 'border-2 border-brand-500/60 bg-gradient-to-b from-brand-500/[0.08] to-transparent shadow-glow'
                  : 'border border-border bg-bg-elevated')
              }
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Most popular
                </div>
              )}
              <div className="text-xs uppercase tracking-widest text-fg-subtle">{p.tag}</div>
              <div className="mt-2 font-display text-2xl font-bold">{p.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-5xl font-bold">{p.price}</span>
                {p.sub && <span className="text-fg-muted text-sm">{p.sub}</span>}
              </div>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-fg-muted">
                    <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={p.to}
                className={
                  'mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ' +
                  (p.highlight
                    ? 'bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-glow hover:opacity-95'
                    : 'border border-border bg-bg-base hover:bg-bg-inset text-fg')
                }
              >
                {p.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-center mb-8">Common questions</h2>
          <dl className="space-y-6 text-sm">
            {[
              { q: 'Do I need a credit card for the free plan?', a: 'No. The free tier is free forever — no card required. Pro trial also starts without a card.' },
              { q: 'What counts as a "signed document"?', a: 'Any PDF you upload and stamp with your data or signature. Viewing or editing drafts does not count.' },
              { q: 'How does regional pricing work?', a: 'We price in local currency via Paystack for Nigeria, Flutterwave for the rest of Africa, and Stripe globally — so you always pay the local-market equivalent.' },
              { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your billing settings and you keep access until the end of the billing period.' },
              { q: 'What is the Enterprise plan?', a: 'Enterprise adds bulk-sign API, per-team vault sections, SSO, audit log export, and priority support. Contact us for a custom quote.' },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-border pb-6">
                <dt className="font-semibold text-fg mb-1">{q}</dt>
                <dd className="text-fg-muted">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </MarketingLayout>
  );
}
