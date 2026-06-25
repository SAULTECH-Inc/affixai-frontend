import { useState } from 'react';
import { LogOut, ChevronDown, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/cn';

export function Topbar({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);

  const initials =
    (user?.first_name?.[0] ?? '') + (user?.last_name?.[0] ?? '') ||
    user?.email?.[0]?.toUpperCase() ||
    '?';

  return (
    <header className="h-16 shrink-0 border-b border-border bg-bg-base/60 backdrop-blur-sm flex items-center justify-between gap-3 px-3 sm:px-6 pl-safe pr-safe">
      {/* Mobile menu trigger */}
      <button
        onClick={onOpenMenu}
        className="lg:hidden h-9 w-9 grid place-items-center rounded-xl border border-border hover:bg-bg-inset"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4 text-fg" />
      </button>

      {/* Spacer (pushes content right on desktop) */}
      <div className="hidden lg:block flex-1" />

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-xl border border-border hover:bg-bg-inset transition"
          >
            <div className="h-7 w-7 rounded-lg bg-gradient-brand grid place-items-center text-white text-xs font-semibold">
              {initials}
            </div>
            <span className="text-sm text-fg max-w-[120px] truncate hidden sm:block">
              {user?.first_name || user?.email}
            </span>
            <ChevronDown className="h-4 w-4 text-fg-muted" />
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpen(false)}
              />
              <div
                className={cn(
                  'absolute right-0 mt-2 w-56 z-20',
                  'bg-bg-elevated border border-border rounded-2xl shadow-card overflow-hidden'
                )}
              >
                <div className="px-4 py-3 border-b border-border">
                  <div className="text-sm font-medium text-fg truncate">
                    {user?.first_name
                      ? `${user.first_name} ${user.last_name ?? ''}`.trim()
                      : 'Account'}
                  </div>
                  <div className="text-xs text-fg-muted truncate">
                    {user?.email}
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    window.location.href = '/login';
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-fg hover:bg-bg-inset"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
