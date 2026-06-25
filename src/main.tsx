import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './styles/globals.css';

// Analytics (Plausible). Loads the upstream script on prod only, off on
// dev. Set VITE_PLAUSIBLE_DOMAIN=affixai.com to enable. See lib/analytics.
import { ensurePlausibleInstalled } from './lib/analytics';
ensurePlausibleInstalled();

// Error reporting — only initialized when VITE_SENTRY_DSN is set so dev
// builds stay quiet. Lazy-imported behind the conditional so the SDK bundle
// is tree-shaken out of builds that don't use it.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  // Top-level await isn't available here (target is ES2020); fire-and-forget
  // import that runs before first paint is good enough.
  import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.VITE_SENTRY_ENV || 'production',
      release: import.meta.env.VITE_APP_VERSION || undefined,
      // Browser performance tracing. 0 = errors only.
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE) || 0,
      // Don't ship PII — vault values would otherwise leak through breadcrumbs.
      sendDefaultPii: false,
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* HelmetProvider lets <Seo> components anywhere in the tree mutate
        the document head. Required by react-helmet-async to work correctly
        with React 18's concurrent rendering. */}
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
