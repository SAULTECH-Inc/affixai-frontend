import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Seo } from '@/components/Seo';
import { detectCountryFromBrowser } from '@/lib/countries';
import { captureReferralCode } from '@/lib/referral';
import { useAuthStore } from '@/store/authStore';
import {
  ArrowRight,
  Shield,
  Sparkles,
  Users,
  Zap,
  FileSignature,
  Building2,
  Lock,
  Check,
  ScanLine,
  FolderLock,
  UploadCloud,
  GitMerge,
  MessageSquare,
  Puzzle,
  Download,
  Globe,
  CornerDownLeft,
} from 'lucide-react';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';

// Public-facing landing page rendered at "/". Uses the shared MarketingLayout
// so the header (incl. mobile hamburger) and footer are consistent with the
// other marketing pages (/about, /privacy, etc).
export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();

  // Capture ?ref=CODE if a visitor arrives via an affiliate link. We stash
  // it in localStorage (30-day TTL) so the code survives the detour
  // through /register; RegisterPage reads it back on submit.
  useEffect(() => {
    captureReferralCode();
  }, []);

  return (
    <MarketingLayout>
      {/* Landing-specific SEO with FAQ + breadcrumb structured data so
          Google can render rich results. The site-wide Organization +
          SoftwareApplication schemas live in index.html. */}
      <Seo
        title="AffixAI — Auto-sign any PDF from your encrypted vault"
        description="Drop any PDF — AffixAI fills every blank, label, and signature box from your encrypted vault. Bank-grade encryption at rest. 30-day Pro trial."
        path="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'How does AffixAI fill my PDFs?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: "Drop in a PDF (typed or scanned). Our engine finds every blank, label, and signature box using layout heuristics + OCR, then fills them from your encrypted data vault — name, IDs, addresses, employer, signature.",
              },
            },
            {
              '@type': 'Question',
              name: 'Is my data secure?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Every vault field is encrypted at rest. We use the data to fill your forms; we never sell it or train on it.',
              },
            },
            {
              '@type': 'Question',
              name: 'How much does it cost?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Free tier: 5 documents per month. Pro: from $5/mo (regional pricing — ₦7,500 in Nigeria via Paystack, $8 in other African countries via Flutterwave, $19 globally via Stripe). 30-day Pro trial, no card required.',
              },
            },
            {
              '@type': 'Question',
              name: 'Can I send a PDF to someone else to sign?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: "Yes — drop in 'sign here' markers and send a magic link. The counterparty signs in the browser without needing an AffixAI account.",
              },
            },
          ],
        }}
      />
      <Hero isAuthenticated={isAuthenticated} />
      <LogoStrip />
      <FeatureGrid />
      <HowItWorks />
      <CollaborationSection />
      <ChromeExtensionSection />
      <DataVaultSpotlight />
      <SecurityStrip />
      <Pricing />
      <FinalCta isAuthenticated={isAuthenticated} />
    </MarketingLayout>
  );
}

// ---- Hero ------------------------------------------------------------------

function Hero({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-16 sm:pb-32">
      <div className="text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 mb-7 text-xs font-medium text-brand-300">
          <Sparkles className="h-3.5 w-3.5" />
          New · Sequential signing, bulk invites & browser auto-fill
        </div>
        <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
          Stop re-typing the same{' '}
          <span className="text-gradient-brand">forms</span>.
          <br />
          Let AI sign them for you.
        </h1>
        <p className="mt-7 text-lg sm:text-xl text-fg-muted leading-relaxed max-w-2xl mx-auto">
          AffixAI reads a contract, NDA, or onboarding form and fills every
          field from <strong className="text-fg">your encrypted vault</strong>
          {' — '}your name, address, ID numbers, employer, signature. You
          review and ship.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3.5 text-base font-semibold text-white shadow-glow hover:opacity-95 transition"
            >
              Open dashboard
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3.5 text-base font-semibold text-white shadow-glow hover:opacity-95 transition"
              >
                Start free — no card required
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-6 py-3.5 text-base font-semibold text-fg hover:bg-bg-inset transition"
              >
                See how it works
              </a>
            </>
          )}
        </div>
        <p className="mt-5 text-xs text-fg-subtle">
          30-day free trial · bank-grade encryption · Cancel anytime
        </p>
      </div>

      {/* Product preview card */}
      <HeroPreview />
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="mt-20 max-w-5xl mx-auto">
      <div className="relative rounded-3xl border border-border bg-bg-elevated/60 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Faux browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-bg-surface/60">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400/70" />
            <span className="h-3 w-3 rounded-full bg-yellow-400/70" />
            <span className="h-3 w-3 rounded-full bg-green-400/70" />
          </div>
          <div className="flex-1 text-center text-xs font-mono text-fg-subtle">
            affix.ai / documents / new
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-0">
          {/* Doc preview */}
          <div className="p-6 sm:p-10 bg-white/[0.02]">
            <div className="space-y-3 font-mono text-[11px] sm:text-xs text-fg-muted">
              <p className="text-fg-subtle uppercase tracking-widest text-[10px]">
                Non-Disclosure Agreement
              </p>
              <p>
                This Agreement is made on{' '}
                <span className="px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-200">
                  June 15, 2026
                </span>{' '}
                between Acme Corp. and{' '}
                <span className="px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-200">
                  Jane R. Doe
                </span>
                , of{' '}
                <span className="px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-200">
                  221B Baker Street, London
                </span>
                .
              </p>
              <p>
                Email:{' '}
                <span className="px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-200">
                  jane@example.com
                </span>{' '}
                · Phone:{' '}
                <span className="px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-200">
                  +44 7700 900123
                </span>
              </p>
              <p className="pt-8">
                Signed: ____________________
                <span className="ml-1 inline-block translate-y-0.5 px-2 py-1 rounded bg-accent-500/20 text-accent-200 italic font-display">
                  Jane R. Doe
                </span>
              </p>
            </div>
          </div>
          {/* Sidebar with vault */}
          <div className="border-t md:border-t-0 md:border-l border-border bg-bg-base/40 p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-fg-muted">
              <FolderLock className="h-3.5 w-3.5 text-brand-400" />
              Your vault
            </div>
            {[
              ['Full name', 'Jane R. Doe', true],
              ['Address', '221B Baker St', true],
              ['Email', 'jane@example.com', true],
              ['Signature', '✍ Saved', true],
              ['Tax ID', '——', false],
            ].map(([k, v, ok]) => (
              <div
                key={k as string}
                className="flex items-center justify-between"
              >
                <span className="text-fg-subtle">{k as string}</span>
                <span
                  className={
                    ok
                      ? 'text-fg font-medium flex items-center gap-1'
                      : 'text-fg-subtle italic'
                  }
                >
                  {ok && <Check className="h-3 w-3 text-success" />}
                  {v as string}
                </span>
              </div>
            ))}
            <div className="pt-3 mt-3 border-t border-border">
              <div className="flex items-center gap-2 text-brand-300">
                <Zap className="h-3.5 w-3.5" />
                <span className="font-medium">12 fields auto-filled</span>
              </div>
              <p className="text-[10px] text-fg-subtle mt-1">
                Took 1.4s · 100% match
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Logo strip ------------------------------------------------------------

function LogoStrip() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 border-y border-border/50">
      <p className="text-center text-xs uppercase tracking-widest text-fg-subtle mb-5">
        Built for individuals, teams, and enterprises
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-60">
        {['Acme HR', 'NorthGate', 'Lambda Co.', 'Vector Bank', 'Helix Health', 'Mosaic Legal'].map(
          (n) => (
            <span
              key={n}
              className="font-display text-lg font-bold tracking-tight text-fg-muted"
            >
              {n}
            </span>
          )
        )}
      </div>
    </section>
  );
}

// ---- Features --------------------------------------------------------------

const FEATURES = [
  {
    icon: ScanLine,
    title: 'Smart auto-affix',
    body:
      "Drop a PDF — our engine finds every blank line, label, and signature box. Your data, signature, and photo land in the right places. Works on scanned forms too.",
  },
  {
    icon: FolderLock,
    title: 'Encrypted Data Vault',
    body:
      'One place for your name, addresses, IDs, employer history, and signatures. Encrypted at rest. We use it. We never sell it.',
  },
  {
    icon: Users,
    title: 'Send & collect signatures',
    body:
      "Need a counterparty to sign? Drop in 'sign here' markers and send a magic-link. They sign in the browser — no account needed.",
  },
  {
    icon: Building2,
    title: 'Enterprise & API',
    body:
      'Bulk-sign onboarding packs via API. Per-enterprise vault sections shared across the team. Webhooks for every event.',
  },
  {
    icon: Sparkles,
    title: 'Document extraction',
    body:
      "Already got a stack of forms? Upload them once — we'll pull names, dates, and IDs into your vault so the next document fills in itself.",
  },
  {
    icon: UploadCloud,
    title: 'Cloud exports',
    body:
      'Signed documents push straight to Google Drive (Dropbox & OneDrive coming). Audit log included.',
  },
] as const;

function FeatureGrid() {
  return (
    <section
      id="features"
      className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32"
    >
      <SectionHeader
        eyebrow="What it does"
        title="Sign documents the way you'd want to in 2026"
        subtitle="Less typing, less back-and-forth, less context-switching."
      />
      <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group relative rounded-2xl border border-border bg-bg-elevated p-6 hover:border-brand-500/40 transition"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-500/0 to-accent-500/0 group-hover:from-brand-500/[0.06] group-hover:to-accent-500/[0.06] transition pointer-events-none" />
            <div className="relative">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-500/20 text-brand-300 mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-1.5">
                {f.title}
              </h3>
              <p className="text-sm text-fg-muted leading-relaxed">{f.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- How it works ----------------------------------------------------------

function HowItWorks() {
  const steps = [
    {
      n: '01',
      icon: FolderLock,
      title: 'Fill your vault once',
      body:
        "Name, contact, IDs, employer, signature. Or upload an old form and we'll extract everything for you.",
    },
    {
      n: '02',
      icon: ScanLine,
      title: 'Drop in any document',
      body:
        "PDF, scanned image, or generated form. Our engine maps every blank to a field in your vault.",
    },
    {
      n: '03',
      icon: FileSignature,
      title: 'Review & sign',
      body:
        'A live editor shows what gets placed where. Drag, edit, swap signatures — then download or send.',
    },
  ];
  return (
    <section
      id="how"
      className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32"
    >
      <SectionHeader
        eyebrow="How it works"
        title="Three steps. About a minute."
        subtitle="From a blank form to a signed PDF, without the form-filling tax."
      />
      <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
        {steps.map((s) => (
          <div
            key={s.n}
            className="relative rounded-2xl border border-border bg-bg-elevated p-7"
          >
            <div className="text-5xl font-display font-bold text-gradient-brand opacity-80">
              {s.n}
            </div>
            <div className="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-bg-inset text-brand-400">
              <s.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold">
              {s.title}
            </h3>
            <p className="mt-2 text-sm text-fg-muted leading-relaxed">
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- Collaboration ---------------------------------------------------------

function CollaborationSection() {
  const features = [
    {
      icon: Users,
      title: 'Bulk invite via CSV or Excel',
      body: 'Upload a spreadsheet with columns Name, Email, Role, and Order. Everyone gets a magic-link invite in one shot — no copy-pasting.',
    },
    {
      icon: GitMerge,
      title: 'Sequential or parallel signing',
      body: 'Sequential mode gates each signer on the previous one completing. Parallel mode lets everyone sign at the same time.',
    },
    {
      icon: CornerDownLeft,
      title: 'Reject-back flow',
      body: 'Spot an error? Reject the document back to any signer in the chain — with a reason — without killing the workflow. The fix lands, life goes on.',
    },
    {
      icon: MessageSquare,
      title: 'Field-level comments',
      body: 'Pin a comment to a specific field. The next signer sees exactly what needs fixing. Comments are removed before the final PDF is generated.',
    },
  ];
  return (
    <section
      id="collaboration"
      className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32"
    >
      <SectionHeader
        eyebrow="Collaboration"
        title="Multi-party signing that actually works"
        subtitle="Invite one person or a hundred. Keep the workflow moving even when something needs fixing."
      />
      <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-5">
        {features.map((f) => (
          <div
            key={f.title}
            className="group relative rounded-2xl border border-border bg-bg-elevated p-7 hover:border-brand-500/40 transition"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-500/0 to-accent-500/0 group-hover:from-brand-500/[0.06] group-hover:to-accent-500/[0.06] transition pointer-events-none" />
            <div className="relative flex gap-4">
              <div className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-500/20 text-brand-300">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-fg-muted leading-relaxed">{f.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- Chrome Extension ------------------------------------------------------

function ChromeExtensionSection() {
  return (
    <section
      id="extension"
      className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32"
    >
      <div className="rounded-3xl border border-border bg-gradient-to-br from-bg-elevated to-bg-surface p-5 sm:p-8 lg:p-14 overflow-hidden relative">
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent-500/15 blur-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-bg-inset border border-border px-3 py-1 text-xs text-fg-muted mb-5">
              <Puzzle className="h-3.5 w-3.5 text-brand-400" />
              Chrome Extension
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              Fill any online form{' '}
              <span className="text-gradient-brand">in one click</span>.
            </h2>
            <p className="mt-5 text-fg-muted text-base sm:text-lg leading-relaxed">
              Install the AffixAI Chrome extension and your vault data travels
              with you across the web. It intelligently matches form fields by
              name, label, placeholder, and autocomplete attribute — so the
              right value lands in the right box every time.
            </p>
            <ul className="mt-7 space-y-3 text-sm">
              {[
                'Intelligent field matching — autocomplete, name, id, label, placeholder',
                'One-click fill on any website — government forms, job applications, onboarding',
                'Your data never leaves your device unencrypted',
                'Accept T&C once, sign in with your AffixAI account, done',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-fg-muted">
                  <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-5 py-3 text-sm font-semibold text-white shadow-glow hover:opacity-95 transition"
              >
                <Download className="h-4 w-4" />
                Get early access
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-5 py-3 text-sm font-medium text-fg-muted cursor-default select-none">
                <Globe className="h-4 w-4 shrink-0" />
                Chrome Web Store — coming soon
              </div>
            </div>
            <p className="mt-4 text-xs text-fg-subtle">
              Create a free account to join the early access programme and be notified when the extension launches on the Chrome Web Store.
            </p>
          </div>
          {/* Right: visual demo */}
          <div className="relative">
            <div className="rounded-2xl border border-border bg-bg-base/60 shadow-card overflow-hidden">
              {/* Faux browser bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-bg-surface/80">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                </div>
                <div className="flex-1 mx-3 rounded-md bg-bg-elevated px-2 py-1 text-[10px] font-mono text-fg-subtle truncate">
                  https://gov.example.com/application-form
                </div>
                {/* Extension icon */}
                <div className="h-6 w-6 rounded-md bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                  <Puzzle className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
              {/* Form fields */}
              <div className="p-5 space-y-3 text-xs">
                {[
                  { label: 'Full name', value: 'Jane R. Doe', filled: true },
                  { label: 'Date of birth', value: '1992-04-11', filled: true },
                  { label: 'Address', value: '221B Baker Street, London', filled: true },
                  { label: 'National ID', value: 'NG-0042-7891', filled: true },
                  { label: 'Occupation', value: 'Software Engineer', filled: true },
                ].map((f) => (
                  <div key={f.label} className="space-y-1">
                    <div className="text-fg-subtle font-medium">{f.label}</div>
                    <div
                      className={
                        'rounded-lg border px-3 py-2 font-mono ' +
                        (f.filled
                          ? 'border-brand-500/40 bg-brand-500/10 text-brand-200 ring-1 ring-brand-500/20'
                          : 'border-border text-fg-muted')
                      }
                    >
                      {f.value}
                    </div>
                  </div>
                ))}
                <div className="pt-2 flex items-center gap-2 text-brand-300 font-medium">
                  <Zap className="h-3.5 w-3.5" />
                  5 fields filled in 0.8 s
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- Vault spotlight -------------------------------------------------------

function DataVaultSpotlight() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-bg-elevated to-bg-surface p-5 sm:p-8 lg:p-14 overflow-hidden relative">
        <div className="absolute top-0 right-0 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-bg-inset border border-border px-3 py-1 text-xs text-fg-muted mb-5">
              <Shield className="h-3.5 w-3.5 text-brand-400" />
              Encrypted Data Vault
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              Your data, locked.{' '}
              <span className="text-gradient-brand">Re-used everywhere.</span>
            </h2>
            <p className="mt-5 text-fg-muted text-base sm:text-lg leading-relaxed">
              The vault holds the boring stuff — names, ID numbers, addresses,
              employer history, education, signatures. It's encrypted at rest.
              It auto-fills any document you sign so you never type the same
              thing twice.
            </p>
            <ul className="mt-7 space-y-3 text-sm">
              {[
                'Personal · Identity · Address · Contact · Financial · Next of kin',
                'Multi-entry sections: Education + Employment history',
                'Build your own sections (Insurance, Vehicle, Memberships…)',
                'Per-enterprise vault sections shared across the team',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-fg-muted">
                  <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="rounded-2xl border border-border bg-bg-base/60 p-6 shadow-card">
              <div className="space-y-3">
                {[
                  ['Personal', '8/8', 'success'],
                  ['Identity', '4/5', 'success'],
                  ['Address', '6/6', 'success'],
                  ['Education', '3 entries', 'brand'],
                  ['Employment', '4 entries', 'brand'],
                  ['Insurance (custom)', '5/5', 'success'],
                ].map(([k, v, tone]) => (
                  <div
                    key={k as string}
                    className="flex items-center justify-between rounded-xl bg-bg-elevated border border-border px-4 py-3"
                  >
                    <span className="text-sm font-medium text-fg">
                      {k as string}
                    </span>
                    <span
                      className={
                        'text-xs font-medium ' +
                        (tone === 'brand'
                          ? 'text-brand-300'
                          : 'text-success')
                      }
                    >
                      {v as string}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- Security strip --------------------------------------------------------

function SecurityStrip() {
  return (
    <section
      id="security"
      className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Lock, title: 'Encrypted at rest', sub: 'Field-level encryption' },
          { icon: Shield, title: 'OAuth 2.0', sub: 'Refresh-token rotation' },
          { icon: FolderLock, title: 'Zero re-sell', sub: 'Your data, period.' },
          { icon: FileSignature, title: 'Audit log', sub: 'Every action, signed' },
        ].map((b) => (
          <div
            key={b.title}
            className="rounded-2xl border border-border bg-bg-elevated p-5 text-center"
          >
            <b.icon className="h-5 w-5 mx-auto text-brand-400 mb-2" />
            <div className="font-display font-semibold">{b.title}</div>
            <div className="text-xs text-fg-subtle mt-0.5">{b.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- Pricing ---------------------------------------------------------------

interface PlanFromApi {
  plan: 'trial' | 'pro' | 'enterprise';
  name: string;
  description: string;
  amount: string | null;
  currency: string;
  interval: string | null;
  features: string[];
  free_trial_days: number | null;
}

function formatPrice(amount: string | null, currency: string): string {
  if (amount === null || amount === '0' || amount === '0.00') return '$0';
  const n = parseFloat(amount);
  if (Number.isNaN(n)) return '$0';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(0)}`;
  }
}

function Pricing() {
  // Detect the visitor's country from their browser locale so we can
  // show region-appropriate prices BEFORE they sign up. The backend
  // re-confirms via CDN edge headers (CF-IPCountry) on its own; the
  // browser locale is a fast first guess that's right ~95% of the time.
  const detectedCountry = detectCountryFromBrowser();

  // Fetch real prices for this country. The same endpoint also powers
  // BillingPage. Falls back to a sensible hardcoded plan list if the
  // API is unreachable — we'd rather show something than a blank
  // pricing section.
  const { data: apiPlans } = useQuery({
    queryKey: ['public', 'plans', detectedCountry ?? 'default'],
    queryFn: async () => {
      const { data } = await api.get<PlanFromApi[]>('/subscriptions/plans', {
        params: detectedCountry ? { country: detectedCountry } : {},
      });
      return data;
    },
    // Stable for a long time — pricing rarely changes within a session.
    staleTime: 5 * 60 * 1000,
    // Don't retry on the landing page — if it fails, we render the fallback.
    retry: false,
  });

  const fallbackPlans = [
    { plan: 'trial', name: 'Free', price: '$0', tag: 'For trying it out' },
    { plan: 'pro', name: 'Pro', price: '—', sub: '/month', tag: 'For professionals' },
    { plan: 'enterprise', name: 'Enterprise', price: 'Custom', tag: 'For teams' },
  ];

  const apiByPlan = new Map<string, PlanFromApi>(
    (apiPlans ?? []).map((p) => [p.plan, p])
  );

  const plans = [
    {
      key: 'trial',
      name: 'Free',
      price: '$0',
      tag: 'For trying it out',
      features: [
        '5 signed documents / mo',
        'Encrypted vault',
        'Built-in vault sections',
        'Email support',
      ],
      cta: 'Start free',
      to: '/register',
      highlight: false,
    },
    {
      key: 'pro',
      name: 'Pro',
      // Prefer the live API value. Falls back to em-dash so the section
      // doesn't render an obviously wrong number if the call fails.
      price: apiByPlan.get('pro')
        ? formatPrice(apiByPlan.get('pro')!.amount, apiByPlan.get('pro')!.currency)
        : fallbackPlans[1].price,
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
      // Enterprise is "Custom" by default. If the API returns a concrete
      // amount, show it; otherwise leave as "Custom" and let prospects
      // contact us.
      price: apiByPlan.get('enterprise') && apiByPlan.get('enterprise')!.amount
        ? formatPrice(
            apiByPlan.get('enterprise')!.amount,
            apiByPlan.get('enterprise')!.currency
          )
        : 'Custom',
      sub: apiByPlan.get('enterprise') && apiByPlan.get('enterprise')!.amount
        ? '/month'
        : undefined,
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
    <section
      id="pricing"
      className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32"
    >
      <SectionHeader
        eyebrow="Pricing"
        title="One free tier. One paid plan. One enterprise."
        subtitle="No seat math. No surprise fees."
      />
      <div className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-5">
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
            <div className="text-xs uppercase tracking-widest text-fg-subtle">
              {p.tag}
            </div>
            <div className="mt-2 font-display text-2xl font-bold">{p.name}</div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-5xl font-bold">{p.price}</span>
              {p.sub && <span className="text-fg-muted text-sm">{p.sub}</span>}
            </div>
            <ul className="mt-6 space-y-2.5 text-sm">
              {p.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-fg-muted"
                >
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
    </section>
  );
}

// ---- Final CTA -------------------------------------------------------------

function FinalCta({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-brand-500/15 via-bg-elevated to-accent-500/15 p-6 sm:p-10 lg:p-16 text-center overflow-hidden relative">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-72 w-[600px] bg-brand-500/20 blur-3xl rounded-full" />
        <div className="relative">
          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
            Sign your next document in{' '}
            <span className="text-gradient-brand">one click</span>.
          </h2>
          <p className="mt-5 text-fg-muted text-base sm:text-lg max-w-xl mx-auto">
            Free to start. 30 days of Pro on the house. No credit card.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3.5 text-base font-semibold text-white shadow-glow hover:opacity-95 transition"
              >
                Open your dashboard
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3.5 text-base font-semibold text-white shadow-glow hover:opacity-95 transition"
                >
                  Create your free account
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-6 py-3.5 text-base font-semibold text-fg hover:bg-bg-inset transition"
                >
                  I already have an account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- Shared bits -----------------------------------------------------------

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="inline-flex items-center gap-2 rounded-full bg-bg-inset border border-border px-3 py-1 text-xs font-medium text-fg-muted">
        {eyebrow}
      </div>
      <h2 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-fg-muted text-base sm:text-lg leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
