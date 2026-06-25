import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

// Banner that nudges mobile visitors to install the PWA when the browser
// fires the `beforeinstallprompt` event (Chrome / Edge / Samsung). Once
// shown and dismissed, we remember the user's choice for 30 days so we
// don't badger them. iOS Safari doesn't fire beforeinstallprompt — there
// we show a one-time "Add to Home Screen" tip via a separate path
// (currently unused; turn on the iOS branch if conversion data suggests
// it's worth it).
//
// Why a custom banner instead of Chrome's mini-infobar:
//   * Chrome's default infobar shows up randomly and only on the first
//     visit; users miss it.
//   * We control the copy ("Install AffixAI" vs the OS default).
//   * We can re-trigger after a few sessions if the first dismiss was
//     premature.

const DISMISS_KEY = 'affixai_install_dismissed_at';
const DISMISS_TTL_DAYS = 30;

// Chrome / Edge fire this event with a custom `prompt()` method we have
// to call ourselves. Type-only definition since the global typings
// don't include it.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if we previously dismissed within the TTL — silent if so.
    try {
      const ts = window.localStorage.getItem(DISMISS_KEY);
      if (ts) {
        const days = (Date.now() - Number(ts)) / (1000 * 60 * 60 * 24);
        if (days < DISMISS_TTL_DAYS) return;
      }
    } catch {
      /* localStorage disabled — fall through; we'll show every visit */
    }

    const handler = (e: Event) => {
      // Suppress the default mini-infobar. We'll prompt on our own UI.
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // If the app is already installed in standalone mode, the event
    // never fires — nothing to do.
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function onInstall() {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    setVisible(false);
    setDeferredEvent(null);
    if (outcome === 'dismissed') {
      // User said no via the native dialog — same TTL as our own X button.
      try {
        window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {}
    }
  }

  function onDismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }

  if (!visible || !deferredEvent) return null;

  return (
    <div
      // Bottom-pinned card on mobile; small floating chip on desktop.
      // pb-safe keeps it above the iOS home indicator when installed
      // is in progress (rare but possible).
      className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-safe sm:p-4 sm:bottom-4 sm:right-4 sm:left-auto sm:max-w-sm"
      role="dialog"
      aria-label="Install AffixAI"
    >
      <div className="rounded-2xl border border-border bg-bg-elevated/95 backdrop-blur-md shadow-2xl p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 grid place-items-center text-white shrink-0">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm text-fg">Install AffixAI</div>
          <div className="text-xs text-fg-muted truncate">
            Faster access — no browser tab.
          </div>
        </div>
        <button
          onClick={onInstall}
          className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 text-white text-xs font-semibold px-3 h-9"
        >
          Install
        </button>
        <button
          onClick={onDismiss}
          className="shrink-0 inline-flex items-center justify-center h-9 w-9 text-fg-subtle hover:text-fg transition"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
