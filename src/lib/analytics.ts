// Plausible analytics loader.
//
// Privacy-first: no cookies, no PII, no fingerprinting — Plausible counts
// pageviews via an anonymized hash that rotates daily. Lighter than GA4
// (~1KB vs ~50KB) and friendly to ad blockers because the script can be
// proxied through our own domain (see VITE_PLAUSIBLE_DOMAIN config).
//
// Only loads in production. In dev we no-op so localhost doesn't pollute
// the dashboard.

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean>; callback?: () => void }
    ) => void;
  }
}

const SITE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
// Optional CNAME-proxied script URL — set this to bypass ad blockers
// that block /api/event from plausible.io. Default: official CDN.
const SCRIPT_SRC =
  import.meta.env.VITE_PLAUSIBLE_SCRIPT_SRC ||
  'https://plausible.io/js/script.js';

let installed = false;

/** Install the Plausible <script> tag exactly once. Safe to call on every
 *  navigation — subsequent calls are no-ops. */
export function ensurePlausibleInstalled(): void {
  if (installed) return;
  if (typeof window === 'undefined') return;
  if (!SITE_DOMAIN) return; // not configured; stay silent
  if (import.meta.env.DEV) return; // skip in local dev
  installed = true;

  const s = document.createElement('script');
  s.defer = true;
  s.src = SCRIPT_SRC;
  s.setAttribute('data-domain', SITE_DOMAIN);
  document.head.appendChild(s);
}

/** Fire a custom event. Use for funnel milestones we actually care about:
 *  signups, plan upgrades, "auto-sign succeeded", etc. NEVER pass PII as
 *  props — Plausible's terms forbid it and it's just bad form. */
export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean>
): void {
  if (typeof window === 'undefined') return;
  if (typeof window.plausible !== 'function') return;
  window.plausible(name, props ? { props } : undefined);
}
