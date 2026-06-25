import { Outlet } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-bg-base text-fg">
      {/* Brand panel — visible on lg+ */}
      <div className="hidden lg:flex relative flex-1 items-center justify-center p-12 overflow-hidden bg-bg-surface border-r border-border">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(60% 50% at 30% 30%, rgba(168,85,247,0.35), transparent 70%), radial-gradient(50% 40% at 70% 70%, rgba(236,72,153,0.3), transparent 70%)',
          }}
        />
        <div className="relative max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-2xl bg-gradient-brand grid place-items-center shadow-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight">
              Affix<span className="text-gradient-brand">AI</span>
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight glow-brand">
            Sign documents <br /> in <span className="text-gradient-brand">one click.</span>
          </h1>
          <p className="mt-4 text-fg-muted">
            Capture your data once. Our AI auto-affixes it to any document —
            forms, contracts, applications — wherever it's needed.
          </p>
          <div className="mt-10 space-y-3 text-sm">
            {[
              'AI-powered field extraction from your IDs',
              'Auto-fill any form by matching to your vault',
              'Bank-grade AES-256 encryption end-to-end',
            ].map((line) => (
              <div key={line} className="flex items-center gap-3 text-fg-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-brand" />
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-xl bg-gradient-brand grid place-items-center shadow-glow">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-bold text-xl">
              Affix<span className="text-gradient-brand">AI</span>
            </span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
