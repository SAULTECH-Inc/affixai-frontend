import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  ArrowRight,
  CheckCircle2,
  Eye,
  PenLine,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';

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
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function RoleIcon({ role }: { role: string }) {
  if (role === 'viewer') return <Eye className="h-4 w-4 text-fg-muted" />;
  return <PenLine className="h-4 w-4 text-brand-400" />;
}

function roleTone(role: string): 'brand' | 'default' {
  return role === 'signer' ? 'brand' : 'default';
}

function roleLabel(role: string): string {
  return { signer: 'Signer', reviewer: 'Reviewer', viewer: 'Viewer' }[role] ?? role;
}

function actionLabel(role: string): string {
  return role === 'viewer' ? 'View document' : 'Sign now';
}

export default function InboxPage() {
  const { data: pending, isLoading } = useQuery({
    queryKey: ['documents', 'pending-mine'],
    queryFn: async () => {
      const { data } = await api.get<PendingDoc[]>('/documents/pending-mine');
      return data;
    },
    staleTime: 60_000,
  });

  return (
    <div>
      <PageHeader
        title="Signing Inbox"
        description="Documents waiting for your signature or review."
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : !pending?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-bg-inset grid place-items-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <div>
              <div className="font-semibold text-lg text-fg">All caught up</div>
              <p className="text-sm text-fg-muted mt-1 max-w-xs">
                No documents are waiting for your signature right now. When someone
                invites you to sign, they'll appear here.
              </p>
            </div>
            <Link to="/documents">
              <Button variant="outline" size="sm">
                View my documents
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-fg-muted mb-4">
            {pending.length} document{pending.length !== 1 ? 's' : ''} waiting for you
          </p>
          <div className="space-y-3">
            {pending.map((doc) => (
              <Card
                key={doc.document_id}
                className="hover:border-brand-500/30 transition"
              >
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-bg-inset grid place-items-center shrink-0">
                      <FileText className="h-5 w-5 text-brand-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-fg truncate">
                        {doc.document_title}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                        <span className="text-sm text-fg-muted">
                          From{' '}
                          <span className="text-fg">
                            {doc.sender_name || doc.sender_email || 'Unknown'}
                          </span>
                        </span>
                        <Badge tone={roleTone(doc.role)}>
                          <RoleIcon role={doc.role} />
                          {roleLabel(doc.role)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-fg-subtle">
                        <Clock className="h-3 w-3" />
                        Invited {timeSince(doc.created_at)}
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/documents/${doc.document_id}/sign?token=${doc.invite_token}`}
                    className="shrink-0 self-end sm:self-auto"
                  >
                    <Button size="sm">
                      {actionLabel(doc.role)}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
