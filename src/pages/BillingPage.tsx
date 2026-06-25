import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Check,
  ExternalLink,
  Sparkles,
  Calendar,
  Receipt,
  Download,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/cn';
import type { PlanOut, SubscriptionState, InvoiceOut } from '@/types';

const STATUS_TONE: Record<
  string,
  'success' | 'brand' | 'warning' | 'danger' | 'neutral'
> = {
  active: 'success',
  trialing: 'brand',
  past_due: 'warning',
  canceled: 'danger',
  expired: 'danger',
  incomplete: 'warning',
};

function fmtMoney(amount: string | number | null | undefined, currency: string) {
  if (amount == null) return '—';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export default function BillingPage() {
  const { data: state } = useQuery({
    queryKey: ['subscription', 'me'],
    queryFn: async () => {
      const { data } = await api.get<SubscriptionState>('/subscriptions/me');
      return data;
    },
  });

  const { data: plans } = useQuery({
    queryKey: ['subscription', 'plans'],
    queryFn: async () => {
      const { data } = await api.get<PlanOut[]>('/subscriptions/plans');
      return data;
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ['subscription', 'invoices'],
    queryFn: async () => {
      const { data } = await api.get<InvoiceOut[]>('/subscriptions/invoices');
      return data;
    },
  });

  const checkout = useMutation({
    mutationFn: async (plan: 'pro' | 'enterprise') => {
      const { data } = await api.post<{ checkout_url: string }>(
        '/subscriptions/checkout',
        { plan }
      );
      return data.checkout_url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.detail?.toString() || 'Could not start checkout'
      );
    },
  });

  const portal = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ portal_url: string }>(
        '/subscriptions/portal',
        {}
      );
      return data.portal_url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.detail || 'Could not open billing portal'
      );
    },
  });

  const providerLabel = (p: string | null | undefined) =>
    p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Stripe';
  const providerSupportsPortal = state?.active_provider === 'stripe';
  const currency = state?.currency || 'USD';

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Manage your subscription and review your payment history."
      />

      {/* Current status */}
      {state && (
        <Card className="mb-6 overflow-hidden">
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-brand-soft grid place-items-center text-brand-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-semibold text-fg capitalize">
                      {state.plan} plan
                    </span>
                    <Badge tone={STATUS_TONE[state.status] || 'neutral'}>
                      {state.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-fg-subtle">
                      via {providerLabel(state.active_provider)}
                    </span>
                  </div>
                  <p className="text-sm text-fg-muted mt-0.5">
                    {state.status === 'trialing' && state.days_left != null
                      ? `${state.days_left} days remaining on your trial`
                      : state.status === 'active' && state.current_period_end
                        ? `Renews ${new Date(state.current_period_end).toLocaleDateString()}`
                        : state.status === 'past_due'
                          ? 'Payment failed — please update your card'
                          : state.has_paid_features
                            ? 'You have full access'
                            : 'Paid features are locked'}
                  </p>
                </div>
              </div>

              {(state.status === 'active' || state.status === 'past_due') &&
                providerSupportsPortal && (
                  <Button
                    variant="outline"
                    onClick={() => portal.mutate()}
                    loading={portal.isPending}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Manage in {providerLabel(state.active_provider)}
                  </Button>
                )}
            </div>

            {/* Trial-expiring nudge */}
            {state.status === 'trialing' &&
              state.days_left != null &&
              state.days_left <= 7 && (
                <div className="mt-4 p-3 rounded-xl bg-warning/10 border border-warning/20 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-fg font-medium">
                      Your trial ends in {state.days_left} day
                      {state.days_left === 1 ? '' : 's'}.
                    </p>
                    <p className="text-fg-muted text-xs mt-0.5">
                      Upgrade now to keep auto-affix, vault extraction, and
                      bulk-sign working without interruption.
                    </p>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* Plans */}
      <h2 className="font-display text-xl font-bold mb-4 text-fg">
        {state?.plan === 'trial' || !state?.has_paid_features
          ? 'Upgrade'
          : 'Change plan'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {plans?.map((p) => {
          const isCurrent = state?.plan === p.plan;
          const isPaid = p.plan !== 'trial';
          // Note: we DON'T require price_id to enable the button anymore.
          // If the provider isn't configured the click will produce a clear
          // backend error toast ("No stripe price configured for plan ...")
          // which is far more debuggable than a silent disabled button.
          const canCheckout = isPaid && !isCurrent;
          return (
            <Card
              key={p.plan}
              className={cn(
                'relative overflow-hidden flex flex-col',
                p.plan === 'pro' && 'border-brand-500/40'
              )}
            >
              {p.plan === 'pro' && (
                <div className="absolute top-3 right-3">
                  <Badge tone="brand">
                    <Sparkles className="h-3 w-3" />
                    Most popular
                  </Badge>
                </div>
              )}
              <CardContent className="flex flex-col flex-1">
                <h3 className="font-display text-lg font-bold text-fg capitalize">
                  {p.name}
                </h3>
                <div className="mt-1.5 flex items-baseline gap-1">
                  {p.plan === 'trial' ? (
                    <span className="font-display text-2xl font-bold text-fg">
                      Free
                    </span>
                  ) : (
                    <>
                      <span className="font-display text-2xl font-bold text-fg">
                        {fmtMoney(p.amount ?? null, p.currency || currency)}
                      </span>
                      <span className="text-xs text-fg-subtle">
                        / {p.interval || 'month'}
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-sm text-fg-muted">{p.description}</p>
                <ul className="mt-5 space-y-2 flex-1">
                  {(p.features ?? []).map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-fg"
                    >
                      <Check className="h-4 w-4 text-brand-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {isCurrent ? (
                    <Button variant="outline" disabled fullWidth>
                      Current plan
                    </Button>
                  ) : !isPaid ? (
                    <Button variant="outline" disabled fullWidth>
                      Included on signup
                    </Button>
                  ) : (
                    <Button
                      onClick={() =>
                        checkout.mutate(p.plan as 'pro' | 'enterprise')
                      }
                      loading={checkout.isPending}
                      disabled={!canCheckout}
                      fullWidth
                      variant={p.plan === 'pro' ? 'primary' : 'outline'}
                    >
                      <CreditCard className="h-4 w-4" />
                      Upgrade to {p.name}
                    </Button>
                  )}
                  {/* Hint when provider isn't configured yet — helps in dev. */}
                  {isPaid && !p.price_id && !isCurrent && (
                    <p className="text-[11px] text-fg-subtle mt-2 text-center">
                      Provider price not configured yet — click to see what's
                      missing.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Invoice history */}
      <h2 className="font-display text-xl font-bold mb-4 text-fg flex items-center gap-2">
        <Receipt className="h-5 w-5 text-fg-muted" />
        Payment history
      </h2>
      <Card>
        <CardContent>
          {!invoices || invoices.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-6 w-6" />}
              title="No invoices yet"
              description="Your payment receipts will appear here once you upgrade."
            />
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-fg-subtle uppercase tracking-wider">
                    <th className="px-2 py-2 text-left font-medium">Date</th>
                    <th className="px-2 py-2 text-left font-medium">
                      Description
                    </th>
                    <th className="px-2 py-2 text-right font-medium">Amount</th>
                    <th className="px-2 py-2 text-left font-medium">Status</th>
                    <th className="px-2 py-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-t border-border hover:bg-bg-inset transition"
                    >
                      <td className="px-2 py-3 text-fg-muted whitespace-nowrap">
                        {new Date(
                          inv.paid_at || inv.created_at
                        ).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-3 text-fg">
                        {inv.description || 'Subscription charge'}
                        <span className="ml-2 text-[10px] text-fg-subtle uppercase">
                          {inv.provider}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right font-medium text-fg">
                        {fmtMoney(inv.amount, inv.currency)}
                      </td>
                      <td className="px-2 py-3">
                        <Badge
                          tone={
                            inv.status === 'paid'
                              ? 'success'
                              : inv.status === 'failed'
                                ? 'danger'
                                : inv.status === 'refunded'
                                  ? 'neutral'
                                  : 'warning'
                          }
                        >
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 text-right">
                        {inv.pdf_url ? (
                          <a
                            href={inv.pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-400 hover:underline"
                          >
                            <Download className="h-3 w-3" />
                            PDF
                          </a>
                        ) : inv.hosted_url ? (
                          <a
                            href={inv.hosted_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-400 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
