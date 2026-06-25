import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Target, Heart } from 'lucide-react';
import { MarketingLayout, PageHero } from '@/components/marketing/MarketingLayout';
import { Seo } from '@/components/Seo';

export default function AboutPage() {
  return (
    <MarketingLayout>
      <Seo
        title="About"
        description="We're building the document signing experience we always wanted — AI-fast, encrypted, and priced fairly across every region."
        path="/about"
      />
      <PageHero
        eyebrow="About AffixAI"
        title="We sign documents so you don't have to."
        subtitle="AffixAI was built because nobody enjoys typing their address into the seventeenth form this month. We thought computers could do better."
      />

      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: Target,
              title: 'Our mission',
              body:
                'Eliminate the paperwork tax. Save people hours every month on documents they never wanted to fill out in the first place.',
            },
            {
              icon: Sparkles,
              title: 'How we work',
              body:
                'Small team, fast iteration, ship-or-it-doesn\'t-count. Every feature you see exists because a real user asked for it.',
            },
            {
              icon: Heart,
              title: 'What we value',
              body:
                'Encrypted-at-rest is the default, not the upsell. We use your data to fill your forms — never to sell or train on.',
            },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-border bg-bg-elevated p-6"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-500/20 text-brand-300 mb-4">
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm text-fg-muted leading-relaxed">
                {c.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-3xl border border-border bg-bg-elevated p-8 sm:p-12">
          <h2 className="font-display text-2xl font-bold mb-4">
            The product, in one paragraph
          </h2>
          <p className="text-fg-muted leading-relaxed">
            You drop a document — PDF, scanned image, generated form. Our
            engine reads it, finds every blank, label, and signature box, and
            fills them from your encrypted vault. You review what got placed
            where, edit if you want, and ship the signed PDF. Need a
            counterparty to sign too? Drop in sign-here markers and send a
            magic link. They sign in the browser — no account required.
          </p>
          <p className="mt-4 text-fg-muted leading-relaxed">
            Behind the scenes, your vault holds the boring stuff — names, IDs,
            addresses, employers, education, signatures — encrypted at rest
            with AES-256-GCM. It's not training data. It's not for sale. It's
            yours, and we use it to fill your forms.
          </p>
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3.5 text-base font-semibold text-white shadow-glow hover:opacity-95 transition"
          >
            Try AffixAI free
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
