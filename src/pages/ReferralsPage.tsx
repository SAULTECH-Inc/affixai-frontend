import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Copy,
  Check,
  Users,
  DollarSign,
  Clock,
  Sparkles,
  Twitter,
  Linkedin,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/cn';

// ----- Types ----------------------------------------------------------------

type ReferralStatus = 'signed_up' | 'converted' | 'expired' | 'void';

interface ReferralRow {
  id: string;
  referred_email_masked: string;
  status: ReferralStatus;
  signed_up_at: string;
  commission_started_at: string | null;
  commission_expires_at: string | null;
  total_commission: string;
  commission_currency: string;
}

interface ReferralsMineOut {
  code: string;
  share_url: string;
  total_referred: number;
  total_converted: number;
  total_earned: string;
  total_paid_out: string;
  pending_payout: string;
  currency: string;
  rate_percent: number;
  window_months: number;
  rows: ReferralRow[];
}

const STATUS_TONE: Record<ReferralStatus, 'neutral' | 'success' | 'brand' | 'danger'> = {
  signed_up: 'neutral',
  converted: 'success',
  expired: 'neutral',
  void: 'danger',
};

const STATUS_LABEL: Record<ReferralStatus, string> = {
  signed_up: 'Signed up',
  converted: 'Paying — earning',
  expired: 'Window closed',
  void: 'Voided',
};

// ----- Page -----------------------------------------------------------------

export default function ReferralsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['referrals', 'me'],
    queryFn: async () => {
      const { data } = await api.get<ReferralsMineOut>('/referrals/me');
      return data;
    },
  });

  return (
    <div>
      <PageHeader
        title="Refer & earn"
        description={
          data
            ? `Earn ${data.rate_percent}% of every paying user's plan — for ${data.window_months} months.`
            : 'Share AffixAI and earn for every paying customer you bring in.'
        }
      />

      {isLoading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <ShareCard data={data} />
          <StatsRow data={data} />
          <ReferralTable rows={data.rows} />
        </>
      )}
    </div>
  );
}

// ----- Share card -----------------------------------------------------------

function ShareCard({ data }: { data: ReferralsMineOut }) {
  const [copied, setCopied] = useState(false);

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const tweetText = encodeURIComponent(
    `I sign all my documents with @affixai — fills PDFs from an encrypted vault in seconds. ${data.rate_percent}% off (and I get ${data.rate_percent}% too):`
  );
  const linkedInText = encodeURIComponent(
    `AffixAI auto-fills any PDF from an encrypted vault. Highly recommend.`
  );
  const emailSubject = encodeURIComponent('Try AffixAI — auto-sign any document');
  const emailBody = encodeURIComponent(
    `Hey, I've been using AffixAI to auto-fill and sign PDFs. It actually works. Here's my invite link: ${data.share_url}`
  );

  return (
    <Card className="mb-6">
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Code + copy */}
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest text-fg-subtle mb-2">
              Your share link
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate font-mono text-sm bg-bg-inset border border-border rounded-lg px-3 py-2.5">
                {data.share_url}
              </code>
              <Button
                onClick={() => copy(data.share_url)}
                variant="outline"
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div className="mt-2 text-xs text-fg-subtle">
              Code: <span className="font-mono text-fg">{data.code}</span> · Anyone
              who signs up via this link is yours.
            </div>

            {/* One-click share */}
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(data.share_url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated hover:bg-bg-inset px-3 py-1.5 text-xs font-medium text-fg transition"
              >
                <Twitter className="h-3.5 w-3.5" />
                Share on X
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.share_url)}&summary=${linkedInText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated hover:bg-bg-inset px-3 py-1.5 text-xs font-medium text-fg transition"
              >
                <Linkedin className="h-3.5 w-3.5" />
                LinkedIn
              </a>
              <a
                href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated hover:bg-bg-inset px-3 py-1.5 text-xs font-medium text-fg transition"
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </a>
            </div>
          </div>

          {/* How it works */}
          <div className="lg:w-[320px] lg:border-l lg:border-border lg:pl-6">
            <div className="text-xs uppercase tracking-widest text-fg-subtle mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-brand-400" />
              How it works
            </div>
            <ul className="space-y-2 text-sm text-fg-muted">
              <li className="flex gap-2">
                <span className="text-brand-400 font-mono">1.</span> Share your
                link with a friend, colleague, or audience
              </li>
              <li className="flex gap-2">
                <span className="text-brand-400 font-mono">2.</span> They sign
                up and start their 30-day Pro trial
              </li>
              <li className="flex gap-2">
                <span className="text-brand-400 font-mono">3.</span> When they
                upgrade, you earn <strong className="text-fg">{data.rate_percent}%</strong>
                {' '}of every payment for <strong className="text-fg">{data.window_months} months</strong>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-400 font-mono">4.</span> Payouts
                process monthly via bank transfer / Wise / Stripe
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ----- Stats row ------------------------------------------------------------

function StatsRow({ data }: { data: ReferralsMineOut }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <StatCard
        icon={<Users className="h-4 w-4" />}
        label="Referred"
        value={data.total_referred}
      />
      <StatCard
        icon={<Sparkles className="h-4 w-4" />}
        label="Paying"
        value={data.total_converted}
        hint={
          data.total_referred > 0
            ? `${Math.round((data.total_converted / data.total_referred) * 100)}% conversion`
            : undefined
        }
      />
      <StatCard
        icon={<DollarSign className="h-4 w-4" />}
        label="Total earned"
        value={fmtMoney(data.total_earned, data.currency)}
      />
      <StatCard
        icon={<Clock className="h-4 w-4" />}
        label="Pending payout"
        value={fmtMoney(data.pending_payout, data.currency)}
        hint={
          data.total_paid_out !== '0'
            ? `${fmtMoney(data.total_paid_out, data.currency)} paid out`
            : 'Paid monthly'
        }
      />
    </div>
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
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-2 text-xs text-fg-subtle mb-1">
          {icon}
          {label}
        </div>
        <div className="font-display text-2xl font-bold text-fg">{value}</div>
        {hint && <div className="mt-0.5 text-xs text-fg-subtle">{hint}</div>}
      </CardContent>
    </Card>
  );
}

// ----- Table ---------------------------------------------------------------

function ReferralTable({ rows }: { rows: ReferralRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No referrals yet"
            description="Share your link to get started — your first paying referee earns you commission."
          />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent>
        <h3 className="font-display font-semibold mb-4">Recent referrals</h3>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-fg-subtle uppercase tracking-wider">
                <th className="px-2 py-2 text-left font-medium">User</th>
                <th className="px-2 py-2 text-left font-medium">Status</th>
                <th className="px-2 py-2 text-left font-medium">Joined</th>
                <th className="px-2 py-2 text-right font-medium">Earned</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-border hover:bg-bg-inset/40 transition"
                >
                  <td className="px-2 py-3 font-mono text-fg-muted">
                    {r.referred_email_masked}
                  </td>
                  <td className="px-2 py-3">
                    <Badge tone={STATUS_TONE[r.status]}>
                      {STATUS_LABEL[r.status]}
                    </Badge>
                  </td>
                  <td className="px-2 py-3 text-fg-subtle">
                    {new Date(r.signed_up_at).toLocaleDateString()}
                  </td>
                  <td
                    className={cn(
                      'px-2 py-3 text-right font-medium',
                      parseFloat(r.total_commission) > 0
                        ? 'text-success'
                        : 'text-fg-subtle'
                    )}
                  >
                    {fmtMoney(r.total_commission, r.commission_currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ----- Helpers -------------------------------------------------------------

function fmtMoney(amount: string, currency: string): string {
  const n = parseFloat(amount);
  if (Number.isNaN(n)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}
