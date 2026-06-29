import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  ArrowRight,
  PenLine,
  Twitter,
  Github,
  Linkedin,
  Menu,
  X,
} from 'lucide-react';

// Shared chrome (header + footer + decorative background) for every public
// marketing page so /about, /contact, /privacy etc. all share the same
// look as the landing page. The landing page uses it too.

export function MarketingLayout({
  children,
  // When true (only on the landing page), the header's nav anchors point
  // to in-page sections. Anywhere else, we route to "/" first so the
  // hash anchor resolves on the correct page.
  navAnchorBase = '/',
}: {
  children: React.ReactNode;
  navAnchorBase?: string;
}) {
  const { isAuthenticated, user } = useAuthStore();
  return (
    <div className="min-h-screen bg-bg-base text-fg overflow-x-hidden">
      <BackgroundGlow />
      <MarketingHeader
        isAuthenticated={isAuthenticated}
        firstName={user?.first_name ?? undefined}
        navAnchorBase={navAnchorBase}
      />
      <main className="relative z-10">{children}</main>
      <MarketingFooter />
    </div>
  );
}

// ---- Decorative background -------------------------------------------------

function BackgroundGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-brand-500/20 blur-3xl" />
      <div className="absolute -top-20 right-0 h-[500px] w-[500px] rounded-full bg-accent-500/15 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgb(var(--bg-base))_70%)]" />
    </div>
  );
}

// ---- Header ----------------------------------------------------------------

function MarketingHeader({
  isAuthenticated,
  firstName,
  navAnchorBase,
}: {
  isAuthenticated: boolean;
  firstName?: string;
  navAnchorBase: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // On the landing page these are plain in-page anchors. From other
  // marketing pages we link back to "/#features" so the hash anchor
  // resolves on the landing page.
  const anchor = (frag: string) =>
    navAnchorBase === '/' ? `#${frag}` : `/#${frag}`;

  const navLinks = [
    ['Features', anchor('features')],
    ['How it works', anchor('how')],
    ['Security', anchor('security')],
    ['Pricing', anchor('pricing')],
  ] as const;

  return (
    <header className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm text-fg-muted">
          {navLinks.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="hover:text-fg transition"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-3 sm:px-4 py-2 text-sm font-medium text-white shadow-glow hover:opacity-95 transition"
            >
              <span className="hidden sm:inline">
                {firstName ? `Go to dashboard, ${firstName}` : 'Go to dashboard'}
              </span>
              <span className="sm:hidden">Dashboard</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline text-sm font-medium text-fg-muted hover:text-fg px-3 py-2 transition"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-3 sm:px-4 py-2 text-sm font-medium text-white shadow-glow hover:opacity-95 transition"
              >
                <span className="hidden xs:inline">Try for free</span>
                <span className="xs:hidden">Sign up</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </>
          )}
          {/* Mobile hamburger — only shown below md: where the nav links hide */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg-elevated text-fg-muted hover:text-fg transition"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer — collapses inline below the header. We close on
          any nav-link click so users don't get stranded on the open menu
          after navigating to an in-page anchor. */}
      {mobileOpen && (
        <nav className="md:hidden mt-4 rounded-2xl border border-border bg-bg-elevated p-2 space-y-1">
          {navLinks.map(([label, href]) => (
            <a
              key={label}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm text-fg-muted hover:bg-bg-inset hover:text-fg transition"
            >
              {label}
            </a>
          ))}
          {!isAuthenticated && (
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm text-fg-muted hover:bg-bg-inset hover:text-fg transition border-t border-border mt-2 pt-3"
            >
              Sign in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-glow">
        <PenLine className="h-5 w-5 text-white" strokeWidth={2.5} />
      </div>
      <div className="leading-none">
        <div className="font-display text-lg font-bold tracking-tight">
          AffixAI
        </div>
        <div className="text-[10px] uppercase tracking-widest text-fg-subtle">
          Sign anything, instantly
        </div>
      </div>
    </Link>
  );
}

// ---- Footer ----------------------------------------------------------------

function MarketingFooter() {
  return (
    <footer className="relative z-10 border-t border-border mt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 grid grid-cols-2 md:grid-cols-5 gap-5 sm:gap-8">
        <div className="col-span-2">
          <Logo />
          <p className="mt-4 text-sm text-fg-muted max-w-xs">
            AI-native document signing for individuals and enterprises.
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            ['Features', '/#features'],
            ['How it works', '/#how'],
            ['Pricing', '/#pricing'],
            ['Security', '/#security'],
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            ['About', '/about'],
            ['Blog', '/blog'],
            ['Careers', '/careers'],
            ['Contact', '/contact'],
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            ['Privacy', '/privacy'],
            ['Terms', '/terms'],
            ['DPA', '/dpa'],
            ['Security', '/#security'],
          ]}
        />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6 border-t border-border pt-6">
        <div className="text-xs uppercase tracking-widest text-fg-subtle font-semibold mb-3">
          Compare Affix AI
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {[
            ['vs DocuSign', '/docusign-alternative'],
            ['vs HelloSign', '/hellosign-alternative'],
            ['vs SignNow', '/signnow-alternative'],
            ['vs Adobe Sign', '/adobe-sign-alternative'],
            ['Best e-signature software 2025', '/blog/best-electronic-signature-software'],
          ].map(([label, href]) => (
            <Link key={href} to={href} className="text-fg-muted hover:text-fg transition">
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-fg-subtle">
            © 2026 AffixAI. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-fg-subtle">
            <a href="#" aria-label="Twitter" className="hover:text-fg transition">
              <Twitter className="h-4 w-4" />
            </a>
            <a href="#" aria-label="GitHub" className="hover:text-fg transition">
              <Github className="h-4 w-4" />
            </a>
            <a href="#" aria-label="LinkedIn" className="hover:text-fg transition">
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  // Footer links can be either in-app routes ("/about") or anchors ("/#features").
  // We render an internal <Link> for routes and a plain <a> for anchors so
  // anchor jumps keep working on the landing page itself.
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-fg-subtle font-semibold mb-3">
        {title}
      </div>
      <ul className="space-y-2 text-sm">
        {links.map(([label, href]) => {
          const isAnchor = href.startsWith('/#') || href.startsWith('#');
          return (
            <li key={label}>
              {isAnchor ? (
                <a href={href} className="text-fg-muted hover:text-fg transition">
                  {label}
                </a>
              ) : (
                <Link to={href} className="text-fg-muted hover:text-fg transition">
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---- Shared section header (used by marketing pages) -----------------------

export function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-8 sm:pb-12 text-center">
      {eyebrow && (
        <div className="inline-flex items-center gap-2 rounded-full bg-bg-inset border border-border px-3 py-1 text-xs font-medium text-fg-muted mb-5">
          {eyebrow}
        </div>
      )}
      <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-5 text-lg text-fg-muted max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </section>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  // Long-form text container with sane typography defaults. Used by Privacy,
  // Terms, DPA and About.
  return (
    <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pb-14 sm:pb-20 prose-marketing">
      <style>{`
        .prose-marketing h2 {
          font-family: 'Plus Jakarta Sans', Inter, sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 2.5rem;
          margin-bottom: 0.75rem;
          color: rgb(var(--fg-primary));
        }
        .prose-marketing h3 {
          font-family: 'Plus Jakarta Sans', Inter, sans-serif;
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 1.75rem;
          margin-bottom: 0.5rem;
          color: rgb(var(--fg-primary));
        }
        .prose-marketing p,
        .prose-marketing li {
          color: rgb(var(--fg-muted));
          line-height: 1.7;
          margin-bottom: 0.75rem;
        }
        .prose-marketing ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin-bottom: 1rem;
        }
        .prose-marketing strong { color: rgb(var(--fg-primary)); }
        .prose-marketing a {
          color: #c084fc;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
      `}</style>
      {children}
    </div>
  );
}
