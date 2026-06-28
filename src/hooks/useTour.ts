import { useCallback } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const TOUR_KEY = 'affixai_tour_seen';

export function useTour() {
  const startTour = useCallback(() => {
    const d = driver({
      showProgress: true,
      animate: true,
      overlayColor: 'rgba(0,0,0,0.55)',
      stagePadding: 8,
      stageRadius: 14,
      popoverClass: 'affixai-tour-popover',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Get started',
      onDestroyStarted: () => {
        localStorage.setItem(TOUR_KEY, '1');
        d.destroy();
      },
      steps: [
        {
          popover: {
            title: '👋 Welcome to AffixAI',
            description:
              'This quick tour will walk you through the key features. It only takes 60 seconds.',
            align: 'center',
          },
        },
        {
          element: '[data-tour="nav-vault"]',
          popover: {
            title: '🔐 Data Vault',
            description:
              'Fill your vault once with your name, IDs, addresses, employer info, and signature. Every document you sign from now on will pull from here automatically.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="nav-autosign"]',
          popover: {
            title: '✨ Auto-Sign',
            description:
              'Drop any PDF here — typed or scanned. Our AI engine maps every blank field to your vault data and stamps your signature. Done in seconds.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="nav-documents"]',
          popover: {
            title: '📄 Documents',
            description:
              'All your documents live here. Upload one, or invite others to sign with a magic link — no AffixAI account needed on their end.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="nav-signatures"]',
          popover: {
            title: '✍️ Signatures',
            description:
              'Save multiple signature styles — drawn, typed, or uploaded. AffixAI picks the one you assign to each document automatically.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="hero-cta"]',
          popover: {
            title: '🚀 Ready to sign your first document?',
            description:
              "Click 'Auto-sign a document' to upload your first PDF, or head to the vault first to fill in your details. You're all set!",
            side: 'top',
            align: 'start',
          },
        },
      ],
    });

    localStorage.setItem(TOUR_KEY, '1');
    d.drive();
  }, []);

  const triggerIfFirst = useCallback(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      // Small delay so the page is fully painted
      setTimeout(startTour, 600);
    }
  }, [startTour]);

  return { startTour, triggerIfFirst };
}
