import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  FileSignature,
  FileText,
  CreditCard,
  Settings,
  Sparkles,
  Building2,
  PenTool,
  Camera,
  ShieldCheck,
  Gift,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  accent?: boolean;
  superAdminOnly?: boolean;
  tourId?: string;
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/data-vault', label: 'Data Vault', icon: Database, tourId: 'nav-vault' },
  { to: '/auto-sign', label: 'Auto-Sign', icon: FileSignature, accent: true, tourId: 'nav-autosign' },
  { to: '/documents', label: 'Documents', icon: FileText, tourId: 'nav-documents' },
  { to: '/signatures', label: 'Signatures', icon: PenTool, tourId: 'nav-signatures' },
  { to: '/passport-photo', label: 'Passport Photo', icon: Camera },
  { to: '/enterprise', label: 'Enterprise', icon: Building2 },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/referrals', label: 'Refer & earn', icon: Gift },
  // Admin link is filtered out at render time for non-super-admins so the
  // route exists for them but the nav doesn't reveal it.
  { to: '/admin', label: 'Admin', icon: ShieldCheck, superAdminOnly: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const role = useAuthStore((s) => s.user?.role);
  const isSuperAdmin = role === 'super_admin';
  const visibleNav = NAV.filter((n) => !n.superAdminOnly || isSuperAdmin);
  return (
    <>
      <div className="h-16 px-6 flex items-center justify-between gap-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-brand grid place-items-center shadow-glow">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">
            Affix<span className="text-gradient-brand">AI</span>
          </span>
        </div>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="lg:hidden h-8 w-8 grid place-items-center rounded-lg text-fg-muted hover:text-fg hover:bg-bg-inset"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            {...(item.tourId ? { 'data-tour': item.tourId } : {})}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                isActive
                  ? 'bg-gradient-brand-soft text-fg border border-brand-500/20'
                  : 'text-fg-muted hover:text-fg hover:bg-bg-inset'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'h-4 w-4',
                    isActive
                      ? 'text-brand-400'
                      : 'text-fg-subtle group-hover:text-fg-muted'
                  )}
                />
                <span>{item.label}</span>
                {item.accent && (
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-brand-400 font-semibold">
                    AI
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <div className="rounded-2xl p-4 bg-gradient-brand-soft border border-brand-500/20">
          <div className="text-xs font-semibold text-fg">Need more docs?</div>
          <p className="text-xs text-fg-muted mt-1">
            Upgrade to Pro for unlimited signing and extractions.
          </p>
          <a
            href="/billing"
            className="mt-3 inline-block text-xs font-semibold text-brand-400 hover:text-brand-300"
          >
            View plans →
          </a>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border bg-bg-surface">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-40 lg:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black/60 transition-opacity',
          open ? 'opacity-100' : 'opacity-0'
        )}
      />
      {/* Panel */}
      <aside
        className={cn(
          'absolute inset-y-0 left-0 flex flex-col w-72 bg-bg-surface border-r border-border transition-transform',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  );
}
