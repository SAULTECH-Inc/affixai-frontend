import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Database,
  FileSignature,
  FileText,
  Sparkles,
  ArrowUpRight,
  Calendar,
  ShieldCheck,
  HelpCircle,
  Inbox,
  PenLine,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { useTour } from '@/hooks/useTour';
import type { SegmentData, SubscriptionState } from '@/types';

interface PendingDoc {
  document_id: string;
  document_title: string;
  invite_token: string;
  sender_name: string | null;
  sender_email: string | null;
  role: 'signer' | 'reviewer' | 'viewer';
  created_at: string;
}

function timeSince(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  to,
}: {
  icon: typeof Database;
  label: string;
  value: string | number;
  hint?: string;
  to?: string;
}) {
  const body = (
    <Card className="hover:border-brand-500/30 transition group">
      <CardContent className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-fg-muted text-sm">
            <Icon className="h-4 w-4" />
            {label}
          </div>
          <div className="mt-3 text-3xl font-display font-bold text-fg">
            {value}
          </div>
          {hint && (
            <div className="mt-1 text-xs text-fg-subtle">{hint}</div>
          )}
        </div>
        {to && (
          <ArrowUpRight className="h-4 w-4 text-fg-subtle group-hover:text-brand-400 transition" />
        )}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { startTour, triggerIfFirst } = useTour();

  useEffect(() => {
    triggerIfFirst();
  }, [triggerIfFirst]);

  const { data: segments, isLoading: segLoading } = useQuery({
    queryKey: ['vault', 'segments'],
    queryFn: async () => {
      const { data } = await api.get<SegmentData[]>('/data-vault/segments');
      return data;
    },
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', 'me'],
    queryFn: async () => {
      const { data } = await api.get<SubscriptionState>('/subscriptions/me');
      return data;
    },
  });

  const { data: pendingDocs } = useQuery({
    queryKey: ['documents', 'pending-mine'],
    queryFn: async () => {
      const { data } = await api.get<PendingDoc[]>('/documents/pending-mine');
      return data;
    },
    staleTime: 60_000,
  });

  const filledFields = segments?.reduce(
    (sum, s) => sum + Object.keys(s.fields).length,
    0
  );
  const totalFields = 60; // approximate sum across the registry
  const completion = filledFields
    ? Math.min(100, Math.round((filledFields / totalFields) * 100))
    : 0;

  return (
    <div>
      <PageHeader
        title={`Welcome${user?.first_name ? `, ${user.first_name}` : ''}.`}
        description="Your vault, your documents, your shortcuts — all in one place."
        actions={
          <button
            onClick={startTour}
            title="Take a guided tour"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-fg-muted hover:text-fg hover:border-brand-500/40 transition"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Tour
          </button>
        }
      />

      {/* Trial banner */}
      {subscription?.status === 'trialing' && (
        <Card className="mb-6 border-brand-500/30 bg-gradient-brand-soft">
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-bg-elevated grid place-items-center text-brand-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-fg">
                  You're on the free trial
                </div>
                <p className="text-sm text-fg-muted">
                  {subscription.days_left ?? 0} days left. Upgrade anytime to keep
                  unlimited access.
                </p>
              </div>
            </div>
            <Link to="/billing">
              <Button>Upgrade plan</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {segLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatCard
              icon={Database}
              label="Vault completion"
              value={`${completion}%`}
              hint={`${filledFields ?? 0} fields saved`}
              to="/data-vault"
            />
            <StatCard
              icon={FileSignature}
              label="Auto-sign ready"
              value={completion >= 30 ? 'Yes' : 'Not yet'}
              hint={completion >= 30 ? 'Vault has enough data' : 'Fill more fields first'}
              to="/auto-sign"
            />
            <StatCard
              icon={ShieldCheck}
              label="Encryption"
              value="AES-256"
              hint="All fields encrypted at rest"
            />
          </>
        )}
      </div>

      {/* Hero CTA */}
      <Card className="overflow-hidden" data-tour="hero-cta">
        <div className="relative p-8 sm:p-10">
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background:
                'radial-gradient(50% 50% at 80% 20%, rgba(168,85,247,0.35), transparent 70%), radial-gradient(40% 60% at 20% 80%, rgba(236,72,153,0.3), transparent 70%)',
            }}
          />
          <div className="relative max-w-2xl">
            <Badge tone="brand" className="mb-4">
              <Sparkles className="h-3 w-3" />
              AI-powered
            </Badge>
            <h2 className="font-display text-2xl sm:text-3xl font-bold leading-tight text-fg">
              Drop a document.{' '}
              <span className="text-gradient-brand">We sign it for you.</span>
            </h2>
            <p className="mt-3 text-fg-muted">
              Upload any form, contract, or application. We detect the fields,
              fill them with your vault data, and stamp your signature — all in
              under 10 seconds.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3">
              <Link to="/auto-sign">
                <Button size="lg">
                  <FileSignature className="h-4 w-4" />
                  Auto-sign a document
                </Button>
              </Link>
              <Link to="/data-vault">
                <Button variant="outline" size="lg">
                  <Database className="h-4 w-4" />
                  Manage vault
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Pending signatures inbox widget — only shown when there are items */}
      {pendingDocs && pendingDocs.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg font-semibold text-fg flex items-center gap-2">
              <Inbox className="h-5 w-5 text-brand-400" />
              Waiting for your signature
              <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-brand-500 text-[11px] font-bold text-white">
                {pendingDocs.length}
              </span>
            </h3>
            <Link
              to="/inbox"
              className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {pendingDocs.slice(0, 3).map((doc) => (
              <Card key={doc.document_id} className="hover:border-brand-500/30 transition">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-bg-inset grid place-items-center shrink-0">
                      <PenLine className="h-4 w-4 text-brand-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-fg truncate">
                        {doc.document_title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-fg-muted">
                          From {doc.sender_name || doc.sender_email || 'Unknown'}
                        </span>
                        <Badge tone={doc.role === 'signer' ? 'brand' : 'neutral'}>
                          {doc.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden sm:flex items-center gap-1 text-xs text-fg-subtle">
                      <Clock className="h-3 w-3" />
                      {timeSince(doc.created_at)}
                    </span>
                    <Link to={`/documents/${doc.document_id}/sign?token=${doc.invite_token}`}>
                      <Button size="sm">
                        Sign
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {pendingDocs.length > 3 && (
            <Link
              to="/inbox"
              className="mt-2 block text-center text-xs text-fg-muted hover:text-fg py-2"
            >
              +{pendingDocs.length - 3} more in your inbox
            </Link>
          )}
        </div>
      )}

      {/* Segment progress */}
      <div className="mt-8">
        <h3 className="font-display text-lg font-semibold mb-3 text-fg">
          Vault segments
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {segLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))
            : segments?.map((s) => {
                const count = Object.keys(s.fields).length;
                return (
                  <Link
                    key={s.segment}
                    to="/data-vault"
                    className="block"
                  >
                    <Card className="hover:border-brand-500/30 transition group">
                      <CardContent className="flex items-center justify-between py-4">
                        <div>
                          <div className="font-medium text-fg">{s.label}</div>
                          <div className="text-xs text-fg-muted">
                            {count} {count === 1 ? 'field' : 'fields'} saved
                          </div>
                        </div>
                        <FileText className="h-4 w-4 text-fg-subtle group-hover:text-brand-400 transition" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
        </div>
      </div>
    </div>
  );
}
