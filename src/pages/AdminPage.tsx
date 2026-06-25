import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Users,
  Activity,
  DollarSign,
  FileText,
  Search,
  Clock,
  Gift,
  Building2,
  Receipt,
  Inbox,
  Mail,
  Briefcase,
  Archive,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Label } from '@/components/ui/Label';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';

interface AdminStats {
  total_users: number;
  active_subscriptions: number;
  trialing: number;
  documents_this_month: number;
  invoices_this_month: number;
  revenue_this_month: string;
  currency: string;
  enterprises: number;
}

interface AdminUserRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  enterprise_id: string | null;
  plan: 'trial' | 'pro' | 'enterprise' | null;
  sub_status: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  last_login_at: string | null;
  created_at: string;
}

interface AdminUsersOut {
  items: AdminUserRow[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 25;

function fmtMoney(amount: string | number, currency: string) {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return `${currency} 0`;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  if (user && user.role !== 'super_admin') {
    return (
      <EmptyState
        icon={<ShieldCheck className="h-6 w-6" />}
        title="Admin access required"
        description="This page is only available to platform administrators."
      />
    );
  }

  return <AdminPanel />;
}

type AdminTab = 'users' | 'leads';

function AdminPanel() {
  const [tab, setTab] = useState<AdminTab>('users');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [extending, setExtending] = useState<AdminUserRow | null>(null);

  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<AdminStats>('/admin/stats');
      return data;
    },
    refetchInterval: 60_000,
  });

  // Lightweight badge count for the Leads tab — uses the same endpoint but
  // capped to 1 row so the network cost is trivial. Refetched periodically
  // so a new submission shows up without a page reload.
  const { data: leadsBadge } = useQuery({
    queryKey: ['admin', 'leads', 'badge'],
    queryFn: async () => {
      const { data } = await api.get<AdminLeadsOut>('/admin/leads', {
        params: { status: 'new', limit: 1 },
      });
      return data.new_count;
    },
    refetchInterval: 60_000,
  });

  const { data: usersPage, isLoading } = useQuery({
    queryKey: ['admin', 'users', search, offset],
    queryFn: async () => {
      const { data } = await api.get<AdminUsersOut>('/admin/users', {
        params: {
          q: search.trim() || undefined,
          limit: PAGE_SIZE,
          offset,
        },
      });
      return data;
    },
    // Keep previous data while typing in search to avoid layout flicker.
    placeholderData: (prev) => prev,
  });

  return (
    <div>
      <PageHeader
        title="Admin"
        description="Manage users, extend trials, and review platform health."
      />

      {/* Tab strip — keeps the stats grid visible at all times so the
          admin always has a pulse on the platform, regardless of which
          tab they're viewing. */}
      <div className="mb-5 inline-flex p-1 rounded-xl bg-bg-inset border border-border">
        {(
          [
            { id: 'users', label: 'Users', icon: Users },
            { id: 'leads', label: 'Leads', icon: Inbox },
          ] as { id: AdminTab; label: string; icon: any }[]
        ).map((t) => {
          const active = tab === t.id;
          const badge = t.id === 'leads' ? leadsBadge ?? 0 : 0;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-3 h-9 rounded-lg text-sm font-medium transition flex items-center gap-2',
                active
                  ? 'bg-bg-elevated text-fg shadow-card'
                  : 'text-fg-muted hover:text-fg'
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {badge > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Users"
          value={stats?.total_users ?? '—'}
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Active subs"
          value={stats?.active_subscriptions ?? '—'}
          hint={
            stats ? `${stats.trialing} trialing` : undefined
          }
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Revenue (MTD)"
          value={
            stats
              ? fmtMoney(stats.revenue_this_month, stats.currency)
              : '—'
          }
          hint={stats ? `${stats.invoices_this_month} paid` : undefined}
        />
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="Docs (MTD)"
          value={stats?.documents_this_month ?? '—'}
          hint={stats ? `${stats.enterprises} enterprises` : undefined}
        />
      </div>

      {tab === 'leads' && <LeadsTab />}

      {tab === 'users' && (
        <>
      {/* Users table */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle" />
              <Input
                placeholder="Search users by email or name…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOffset(0);
                }}
                className="pl-9"
              />
            </div>
            {usersPage && (
              <div className="text-xs text-fg-muted shrink-0">
                {usersPage.total} user{usersPage.total === 1 ? '' : 's'}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : !usersPage || usersPage.items.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No users match"
              description={
                search
                  ? 'Try a different search term.'
                  : 'No users on the platform yet.'
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-fg-subtle uppercase tracking-wider">
                      <th className="px-2 py-2 text-left font-medium">User</th>
                      <th className="px-2 py-2 text-left font-medium">Plan</th>
                      <th className="px-2 py-2 text-left font-medium">
                        Subscription
                      </th>
                      <th className="px-2 py-2 text-left font-medium">
                        Last login
                      </th>
                      <th className="px-2 py-2 text-right font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {usersPage.items.map((u) => (
                      <UserRow
                        key={u.id}
                        user={u}
                        onExtend={() => setExtending(u)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <div className="text-xs text-fg-muted">
                  {offset + 1}–
                  {Math.min(offset + usersPage.items.length, usersPage.total)}{' '}
                  of {usersPage.total}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset + PAGE_SIZE >= usersPage.total}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {extending && (
        <ExtendTrialModal
          user={extending}
          onClose={() => setExtending(null)}
        />
      )}
        </>
      )}
    </div>
  );
}

// ---- Leads tab -------------------------------------------------------------

type LeadKind = 'contact' | 'careers';
type LeadStatus = 'new' | 'reviewed' | 'archived';

interface AdminLeadRow {
  id: string;
  kind: LeadKind;
  status: LeadStatus;
  name: string;
  email: string;
  topic: string | null;
  message: string;
  extra: Record<string, string> | null;
  ip_address: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface AdminLeadsOut {
  total: number;
  new_count: number;
  rows: AdminLeadRow[];
}

function LeadsTab() {
  const qc = useQueryClient();
  const [kindFilter, setKindFilter] = useState<LeadKind | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('new');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'leads', kindFilter, statusFilter],
    queryFn: async () => {
      const { data } = await api.get<AdminLeadsOut>('/admin/leads', {
        params: {
          kind: kindFilter === 'all' ? undefined : kindFilter,
          status: statusFilter === 'all' ? undefined : statusFilter,
          limit: 200,
        },
      });
      return data;
    },
    refetchInterval: 60_000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: LeadStatus;
    }) => {
      const { data } = await api.patch<AdminLeadRow>(`/admin/leads/${id}`, {
        status,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'leads'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Could not update lead');
    },
  });

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <div className="inline-flex p-1 rounded-xl bg-bg-inset border border-border">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'contact', label: 'Contact' },
                { id: 'careers', label: 'Careers' },
              ] as { id: LeadKind | 'all'; label: string }[]
            ).map((k) => {
              const active = kindFilter === k.id;
              return (
                <button
                  key={k.id}
                  onClick={() => setKindFilter(k.id)}
                  className={cn(
                    'px-3 h-8 rounded-lg text-xs font-medium transition',
                    active
                      ? 'bg-bg-elevated text-fg shadow-card'
                      : 'text-fg-muted hover:text-fg'
                  )}
                >
                  {k.label}
                </button>
              );
            })}
          </div>
          <div className="inline-flex p-1 rounded-xl bg-bg-inset border border-border">
            {(
              [
                { id: 'new', label: 'New' },
                { id: 'reviewed', label: 'Reviewed' },
                { id: 'archived', label: 'Archived' },
                { id: 'all', label: 'All' },
              ] as { id: LeadStatus | 'all'; label: string }[]
            ).map((s) => {
              const active = statusFilter === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={cn(
                    'px-3 h-8 rounded-lg text-xs font-medium transition',
                    active
                      ? 'bg-bg-elevated text-fg shadow-card'
                      : 'text-fg-muted hover:text-fg'
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          {data && (
            <div className="text-xs text-fg-muted sm:ml-auto">
              {data.rows.length} shown · {data.new_count} new total
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : !data || data.rows.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title="Inbox zero"
            description={
              statusFilter === 'new'
                ? 'No new leads. Try the Reviewed or Archived filter.'
                : 'Nothing here.'
            }
          />
        ) : (
          <div className="space-y-2">
            {data.rows.map((row) => (
              <LeadRow
                key={row.id}
                row={row}
                expanded={expanded === row.id}
                onToggle={() =>
                  setExpanded(expanded === row.id ? null : row.id)
                }
                onUpdate={(status) =>
                  updateStatus.mutate({ id: row.id, status })
                }
                busy={updateStatus.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LeadRow({
  row,
  expanded,
  onToggle,
  onUpdate,
  busy,
}: {
  row: AdminLeadRow;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (status: LeadStatus) => void;
  busy: boolean;
}) {
  const KindIcon = row.kind === 'contact' ? Mail : Briefcase;
  const created = new Date(row.created_at);
  const ago = relativeTime(created);

  return (
    <div className="rounded-xl border border-border bg-bg-elevated overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 hover:bg-bg-inset/40 transition flex items-center gap-3"
      >
        <div
          className={cn(
            'h-9 w-9 rounded-xl grid place-items-center shrink-0',
            row.kind === 'contact'
              ? 'bg-brand-500/15 text-brand-300'
              : 'bg-accent-500/15 text-accent-300'
          )}
        >
          <KindIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-fg">{row.name}</span>
            <span className="text-xs text-fg-subtle truncate">
              {row.email}
            </span>
            {row.status === 'new' && <Badge tone="brand">new</Badge>}
            {row.status === 'reviewed' && (
              <Badge tone="success">reviewed</Badge>
            )}
            {row.status === 'archived' && (
              <Badge tone="neutral">archived</Badge>
            )}
          </div>
          <div className="text-xs text-fg-subtle truncate">
            {row.topic && <span>{row.topic} · </span>}
            <span className="italic">{row.message}</span>
          </div>
        </div>
        <div className="text-xs text-fg-subtle shrink-0">{ago}</div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          <div className="text-sm text-fg whitespace-pre-wrap break-words leading-relaxed">
            {row.message}
          </div>
          {row.extra && Object.keys(row.extra).length > 0 && (
            <div className="rounded-lg bg-bg-inset/60 border border-border p-3 text-xs">
              <div className="text-fg-subtle uppercase tracking-widest text-[10px] mb-1.5">
                Extras
              </div>
              {Object.entries(row.extra).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-fg-subtle">{k}:</span>
                  {/^https?:\/\//.test(v) ? (
                    <a
                      href={v}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-300 hover:text-brand-200 underline underline-offset-2 break-all"
                    >
                      {v}
                    </a>
                  ) : (
                    <span className="text-fg break-all">{v}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="text-xs text-fg-subtle">
            From {row.ip_address || 'unknown'} ·{' '}
            {created.toLocaleString()}
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <a
              href={`mailto:${row.email}?subject=Re: ${row.topic ?? 'your message'}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-base hover:bg-bg-inset px-3 py-1.5 text-xs font-medium text-fg transition"
            >
              <Mail className="h-3.5 w-3.5" />
              Reply via email
            </a>
            <div className="flex items-center gap-2">
              {row.status !== 'new' && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => onUpdate('new')}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Mark new
                </Button>
              )}
              {row.status !== 'reviewed' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onUpdate('reviewed')}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark reviewed
                </Button>
              )}
              {row.status !== 'archived' && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => onUpdate('archived')}
                  className="text-fg-muted"
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function relativeTime(d: Date): string {
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

function UserRow({
  user,
  onExtend,
}: {
  user: AdminUserRow;
  onExtend: () => void;
}) {
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || '—';
  return (
    <tr className="border-t border-border hover:bg-bg-inset transition">
      <td className="px-2 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-brand-soft border border-border grid place-items-center text-brand-400 shrink-0 text-xs font-bold">
            {(user.email[0] || '?').toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm text-fg truncate flex items-center gap-2">
              <span className="font-medium">{user.email}</span>
              {user.role === 'super_admin' && (
                <Badge tone="brand">admin</Badge>
              )}
              {user.enterprise_id && (
                <Badge tone="neutral">
                  <Building2 className="h-3 w-3" />
                  ent
                </Badge>
              )}
            </div>
            <div className="text-xs text-fg-subtle truncate">
              {name} · {user.status}
            </div>
          </div>
        </div>
      </td>
      <td className="px-2 py-3">
        <Badge
          tone={
            user.plan === 'pro' || user.plan === 'enterprise'
              ? 'success'
              : 'neutral'
          }
        >
          {user.plan ?? '—'}
        </Badge>
      </td>
      <td className="px-2 py-3 text-fg-muted text-xs">
        {user.sub_status ? (
          <>
            <div className="capitalize">{user.sub_status.replace('_', ' ')}</div>
            {user.sub_status === 'trialing' && user.trial_ends_at && (
              <div className="text-fg-subtle">
                Trial ends {new Date(user.trial_ends_at).toLocaleDateString()}
              </div>
            )}
            {user.sub_status === 'active' && user.current_period_end && (
              <div className="text-fg-subtle">
                Renews{' '}
                {new Date(user.current_period_end).toLocaleDateString()}
              </div>
            )}
          </>
        ) : (
          '—'
        )}
      </td>
      <td className="px-2 py-3 text-fg-muted text-xs">
        {user.last_login_at ? (
          <span>
            {new Date(user.last_login_at).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-fg-subtle">never</span>
        )}
      </td>
      <td className="px-2 py-3 text-right">
        <Button variant="outline" size="sm" onClick={onExtend}>
          <Clock className="h-3.5 w-3.5" />
          Trial
        </Button>
      </td>
    </tr>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-2 text-xs text-fg-subtle uppercase tracking-wider">
          <span className="text-fg-muted">{icon}</span>
          {label}
        </div>
        <div className="font-display text-2xl font-bold text-fg mt-1.5">
          {value}
        </div>
        {hint && <div className="text-xs text-fg-subtle mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function ExtendTrialModal({
  user,
  onClose,
}: {
  user: AdminUserRow;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState('');

  const extend = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(
        `/admin/users/${user.id}/extend-trial`,
        { days, reason: reason.trim() || null }
      );
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(
        `Trial extended — now ends ${new Date(data.trial_ends_at).toLocaleDateString()}`
      );
      qc.invalidateQueries({ queryKey: ['admin'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Could not extend trial');
    },
  });

  const grant = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(
        `/admin/users/${user.id}/grant-access`
      );
      return data;
    },
    onSuccess: () => {
      toast.success(`Granted comp access to ${user.email}`);
      qc.invalidateQueries({ queryKey: ['admin'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Could not grant access');
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !extend.isPending && !grant.isPending && onClose()}
    >
      <div
        className="bg-bg-elevated border border-border rounded-2xl shadow-card max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-gradient-brand grid place-items-center text-white shrink-0">
            <Gift className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold text-fg">
              Adjust subscription
            </h3>
            <p className="text-xs text-fg-muted truncate">
              <strong>{user.email}</strong>
              {user.trial_ends_at && (
                <>
                  {' '}
                  · current trial ends{' '}
                  {new Date(user.trial_ends_at).toLocaleDateString()}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="days">Extend trial by (days)</Label>
            <Input
              id="days"
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 0)}
            />
            <div className="flex gap-2 mt-2 flex-wrap">
              {[7, 14, 30, 60, 90].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDays(n)}
                  className="px-2 py-0.5 rounded-md border border-border text-xs text-fg-muted hover:text-fg hover:bg-bg-inset"
                >
                  +{n}d
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="reason">Reason (audit trail)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. sales pilot, support credit…"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button
            onClick={() => extend.mutate()}
            loading={extend.isPending}
            disabled={days <= 0 || extend.isPending || grant.isPending}
            fullWidth
          >
            <Clock className="h-4 w-4" />
            Extend trial by {days} day{days === 1 ? '' : 's'}
          </Button>
          <Button
            onClick={() => {
              if (
                window.confirm(
                  `Grant ${user.email} 10-year complimentary access? This bypasses billing.`
                )
              ) {
                grant.mutate();
              }
            }}
            variant="outline"
            loading={grant.isPending}
            disabled={extend.isPending || grant.isPending}
            fullWidth
          >
            <Receipt className="h-4 w-4" />
            Grant comp access (10y)
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={extend.isPending || grant.isPending}
            fullWidth
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
