/**
 * Magic-link landing page for participants invited to a document.
 *
 * Unauthenticated — the URL token IS the credential.
 *   1. Resolves token → document info via GET /shared/{token}
 *   2. Shows document summary + participant's turn state
 *   3. Sign (canvas draw), Reject-back (routes to prev signer), or Decline (halts)
 *   4. Comment thread — view + add + delete own comments
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SignatureCanvas from 'react-signature-canvas';
import {
  ShieldCheck,
  Pen,
  XCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  FileText,
  Download,
  MessageSquare,
  Send,
  Trash2,
  CornerDownLeft,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const guestApi = axios.create({ baseURL: API_BASE });

interface GuestDocument {
  document_id: string;
  original_file_name: string;
  file_mime_type: string;
  file_size: number;
  routing_status:
    | 'draft'
    | 'sent'
    | 'in_progress'
    | 'completed'
    | 'declined'
    | 'expired'
    | 'voided';
  routing_mode: 'parallel' | 'sequential';
  sent_at: string | null;
  expires_at: string | null;
  completed_at: string | null;
  sender_name: string | null;
  me: {
    id: string;
    email: string;
    name: string | null;
    role: 'signer' | 'reviewer' | 'viewer';
    status:
      | 'invited'
      | 'viewed'
      | 'signed'
      | 'approved'
      | 'declined'
      | 'rejected'
      | 'revoked';
    sequence_order: number;
    message: string | null;
    is_my_turn: boolean;
  };
  my_targets: SigningTarget[];
}

interface SigningTarget {
  id: string;
  kind: 'signature' | 'initials' | 'date' | 'text';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string | null;
  sort_order: number;
  filled_at: string | null;
}

interface GuestComment {
  id: string;
  document_id: string;
  participant_id: string | null;
  author_name: string | null;
  author_email: string | null;
  body: string;
  page: number | null;
  x: number | null;
  y: number | null;
  field_key: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  is_mine: boolean;
}

type PageMode = 'idle' | 'signing' | 'declining' | 'rejecting';

export default function GuestSignPage() {
  const { token } = useParams<{ token: string }>();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['guest', token],
    queryFn: async () => {
      const { data } = await guestApi.get<GuestDocument>(`/shared/${token}`);
      return data;
    },
    enabled: !!token,
    retry: false,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['guest', token, 'comments'],
    queryFn: async () => {
      const { data } = await guestApi.get<GuestComment[]>(
        `/shared/${token}/comments`
      );
      return data;
    },
    enabled: !!token,
  });

  const sigPadRef = useRef<SignatureCanvas | null>(null);
  const [mode, setMode] = useState<PageMode>('idle');
  const [declineReason, setDeclineReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [commentBody, setCommentBody] = useState('');

  // Clear signature canvas when switching to signing mode.
  useEffect(() => {
    if (mode === 'signing') sigPadRef.current?.clear();
  }, [mode]);

  const sign = useMutation({
    mutationFn: async () => {
      if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
        throw new Error('Please draw your signature first');
      }
      const canvas =
        sigPadRef.current.getTrimmedCanvas() ||
        (sigPadRef.current as any).getCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fd = new FormData();
      fd.append('signature_image', blob, 'signature.png');
      const { data } = await guestApi.post(`/shared/${token}/sign`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Signature submitted');
      qc.invalidateQueries({ queryKey: ['guest', token] });
      setMode('idle');
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.detail || err?.message || 'Could not sign'
      );
    },
  });

  const decline = useMutation({
    mutationFn: async () => {
      const { data } = await guestApi.post(`/shared/${token}/decline`, {
        reason: declineReason.trim() || null,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Decline recorded');
      qc.invalidateQueries({ queryKey: ['guest', token] });
      setMode('idle');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail || 'Could not decline'),
  });

  const reject = useMutation({
    mutationFn: async () => {
      const { data } = await guestApi.post(`/shared/${token}/reject`, {
        reason: rejectReason.trim() || null,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Sent back for changes');
      qc.invalidateQueries({ queryKey: ['guest', token] });
      setMode('idle');
      setRejectReason('');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail || 'Could not reject'),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { data } = await guestApi.post(`/shared/${token}/comments`, {
        body: commentBody.trim(),
      });
      return data;
    },
    onSuccess: () => {
      setCommentBody('');
      refetchComments();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail || 'Could not add comment'),
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      await guestApi.delete(`/shared/${token}/comments/${commentId}`);
    },
    onSuccess: () => refetchComments(),
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail || 'Could not delete comment'),
  });

  const downloadUrl = useMemo(
    () => (token ? `${API_BASE}/shared/${token}/file` : ''),
    [token]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <Card className="max-w-md w-full">
          <CardContent>
            <div className="text-center">
              <XCircle className="h-10 w-10 text-danger mx-auto mb-2" />
              <h1 className="font-display text-lg font-semibold text-fg">
                Invitation not found
              </h1>
              <p className="text-sm text-fg-muted mt-2">
                This link is invalid, revoked, or has expired. Please ask the
                sender for a new one.
              </p>
              <Link to="/login">
                <Button className="mt-4" variant="outline">
                  Go to sign in
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { me, routing_status, sender_name, routing_mode, expires_at } = data;
  const canSign = me.is_my_turn && me.role !== 'viewer';
  const isSequential = routing_mode === 'sequential';
  const terminal =
    me.status === 'signed' ||
    me.status === 'approved' ||
    me.status === 'declined' ||
    me.status === 'revoked' ||
    routing_status === 'completed' ||
    routing_status === 'declined' ||
    routing_status === 'expired' ||
    routing_status === 'voided';

  const statusPill = (() => {
    if (me.status === 'rejected') {
      return { tone: 'warning' as const, icon: CornerDownLeft, text: 'Sent back for changes' };
    }
    if (terminal) {
      if (me.status === 'signed' || me.status === 'approved')
        return { tone: 'success' as const, icon: CheckCircle2, text: 'You signed this' };
      if (me.status === 'declined')
        return { tone: 'danger' as const, icon: XCircle, text: 'You declined this' };
      if (routing_status === 'completed')
        return { tone: 'success' as const, icon: CheckCircle2, text: 'Document completed' };
      if (routing_status === 'expired')
        return { tone: 'danger' as const, icon: Clock, text: 'Invitation expired' };
      return { tone: 'neutral' as const, icon: XCircle, text: 'No longer active' };
    }
    if (canSign)
      return {
        tone: 'brand' as const,
        icon: Pen,
        text: me.role === 'signer' ? 'Your signature is needed' : 'Your review is needed',
      };
    if (isSequential)
      return { tone: 'warning' as const, icon: Clock, text: 'Waiting for someone before you' };
    return { tone: 'neutral' as const, icon: Clock, text: 'Pending' };
  })();
  const StatusIcon = statusPill.icon;

  const myUnresolvedCount = comments.filter((c) => c.is_mine && !c.resolved).length;

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Top brand bar */}
      <div className="h-14 sm:h-16 px-4 sm:px-6 flex items-center gap-2 border-b border-border">
        <div className="h-8 w-8 rounded-xl bg-gradient-brand grid place-items-center shadow-glow">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="font-display font-bold text-lg tracking-tight">
          Affix<span className="text-gradient-brand">AI</span>
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Document summary */}
        <Card>
          <CardContent>
            <div className="flex items-start gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-brand-soft border border-border grid place-items-center text-brand-400 shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-xl font-bold text-fg truncate">
                  {data.original_file_name}
                </h1>
                <p className="text-sm text-fg-muted mt-1">
                  {sender_name
                    ? `${sender_name} sent you this document`
                    : 'A document was shared with you'}
                  {' · '}
                  Role: <span className="capitalize">{me.role}</span>
                  {isSequential && (
                    <> · Sequential (step {me.sequence_order})</>
                  )}
                </p>
              </div>
              <Badge tone={statusPill.tone}>
                <StatusIcon className="h-3 w-3" />
                {statusPill.text}
              </Badge>
            </div>

            {me.message && (
              <div className="mt-3 p-3 rounded-xl bg-bg-inset border border-border text-sm text-fg">
                <p className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold mb-1">
                  Message
                </p>
                {me.message}
              </div>
            )}

            <div className="mt-4 flex items-center flex-wrap gap-3">
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-brand-400 hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                Open document
              </a>
              {expires_at && (
                <span className="text-xs text-fg-muted">
                  Expires {new Date(expires_at).toLocaleString()}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unresolved comment warning */}
        {myUnresolvedCount > 0 && canSign && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning/10 border border-warning/30 text-sm text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              You have <strong>{myUnresolvedCount}</strong> unresolved comment{myUnresolvedCount > 1 ? 's' : ''}.
              Delete or resolve them before signing.
            </span>
          </div>
        )}

        {/* Actions: idle call-to-action */}
        {!terminal && canSign && mode === 'idle' && (
          <Card>
            <CardContent>
              <h2 className="font-display text-lg font-semibold text-fg mb-2">
                Ready to {me.role === 'signer' ? 'sign' : 'review'}?
              </h2>
              <p className="text-sm text-fg-muted mb-4">
                {data.my_targets.length > 0
                  ? `The sender reserved ${data.my_targets.length} spot${data.my_targets.length === 1 ? '' : 's'} on the document for you.`
                  : me.role === 'signer'
                    ? "Draw your signature on the next step. We'll stamp it on the document."
                    : 'Approve or decline this document.'}
              </p>

              {data.my_targets.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {data.my_targets.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-bg-inset border border-border text-xs text-fg-muted"
                    >
                      <Pen className="h-3 w-3 text-brand-400" />
                      {t.kind === 'signature' ? 'Signature'
                        : t.kind === 'initials' ? 'Initials'
                        : t.kind === 'date' ? 'Date'
                        : 'Text'}
                      <span className="text-fg-subtle">· page {t.page + 1}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => setMode('signing')}
                  disabled={myUnresolvedCount > 0}
                  title={myUnresolvedCount > 0 ? 'Resolve your comments first' : undefined}
                >
                  <Pen className="h-4 w-4" />
                  {me.role === 'signer' ? 'Sign document' : 'Approve'}
                </Button>
                {isSequential && me.sequence_order > 1 && (
                  <Button variant="outline" onClick={() => setMode('rejecting')}>
                    <CornerDownLeft className="h-4 w-4" />
                    Request changes
                  </Button>
                )}
                <Button variant="outline" onClick={() => setMode('declining')}>
                  <XCircle className="h-4 w-4" />
                  Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signing canvas */}
        {mode === 'signing' && (
          <Card>
            <CardContent>
              <h2 className="font-display text-lg font-semibold text-fg mb-2">
                Draw your signature
              </h2>
              <p className="text-xs text-fg-muted mb-3">
                Use your mouse, trackpad, or finger. We'll stamp it on the document.
              </p>
              <div className="rounded-xl border-2 border-dashed border-border bg-white p-2">
                <SignatureCanvas
                  ref={sigPadRef}
                  canvasProps={{
                    width: 600,
                    height: 200,
                    className: 'w-full h-[200px] rounded',
                  }}
                  penColor="#111"
                />
              </div>
              <div className="mt-3 flex justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={() => sigPadRef.current?.clear()}>
                  Clear
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setMode('idle')} disabled={sign.isPending}>
                    Cancel
                  </Button>
                  <Button onClick={() => sign.mutate()} loading={sign.isPending}>
                    <CheckCircle2 className="h-4 w-4" />
                    Submit signature
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Request changes (reject-back) form */}
        {mode === 'rejecting' && (
          <Card>
            <CardContent>
              <h2 className="font-display text-lg font-semibold text-fg mb-2 flex items-center gap-2">
                <CornerDownLeft className="h-5 w-5 text-warning" />
                Request changes
              </h2>
              <p className="text-sm text-fg-muted mb-3">
                This will send the document back to the previous signer for fixes.
                The workflow stays open — nothing is terminated.
              </p>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">
                Describe the issue (optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g. The address in section 3 is incorrect."
                className="w-full px-3 py-2 rounded-xl border border-border bg-bg-base text-sm text-fg resize-y"
                autoFocus
              />
              <p className="text-[11px] text-fg-subtle mt-1.5">
                Tip: add a comment below to pin your feedback to a specific field.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setMode('idle')} disabled={reject.isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={() => reject.mutate()}
                  loading={reject.isPending}
                  className="bg-warning/90 hover:bg-warning text-black border-0"
                >
                  Send back for changes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Decline form */}
        {mode === 'declining' && (
          <Card>
            <CardContent>
              <h2 className="font-display text-lg font-semibold text-fg mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Decline this document?
              </h2>
              <p className="text-sm text-fg-muted mb-3">
                The sender will be notified and the workflow will halt. This cannot be undone.
              </p>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">
                Reason (optional)
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
                placeholder="e.g. The terms are not what we discussed."
                className="w-full px-3 py-2 rounded-xl border border-border bg-bg-base text-sm text-fg resize-y"
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setMode('idle')} disabled={decline.isPending}>
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => decline.mutate()}
                  loading={decline.isPending}
                  className={cn('text-danger')}
                >
                  Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Terminal state */}
        {(terminal || me.status === 'rejected') && (
          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-fg-muted" />
                <p className="text-sm text-fg-muted">
                  {me.status === 'rejected'
                    ? 'You sent this document back for changes. The prior signer has been notified.'
                    : 'Thanks — nothing more is needed from you. You can '}
                  {me.status !== 'rejected' && (
                    <a href={downloadUrl} className="text-brand-400 hover:underline">
                      download the current version
                    </a>
                  )}
                  {me.status !== 'rejected' && '.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments thread */}
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-4 w-4 text-brand-400" />
              <h2 className="font-display text-base font-semibold text-fg">
                Comments
              </h2>
              {comments.length > 0 && (
                <span className="text-xs text-fg-subtle ml-auto">
                  {comments.length} comment{comments.length !== 1 ? 's' : ''}
                  {myUnresolvedCount > 0 && (
                    <span className="ml-1.5 text-warning font-medium">
                      · {myUnresolvedCount} unresolved (yours)
                    </span>
                  )}
                </span>
              )}
            </div>

            {comments.length === 0 ? (
              <p className="text-sm text-fg-muted italic mb-4">
                No comments yet.
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      'rounded-xl border p-3',
                      c.resolved
                        ? 'border-border bg-bg-base opacity-60'
                        : c.is_mine
                          ? 'border-brand-500/30 bg-brand-500/5'
                          : 'border-border bg-bg-inset'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="h-7 w-7 rounded-full bg-gradient-brand-soft border border-border grid place-items-center text-brand-400 text-[10px] font-bold shrink-0">
                        {(c.author_name?.[0] || c.author_email?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-fg">
                            {c.author_name || c.author_email || 'Anonymous'}
                          </span>
                          {c.is_mine && (
                            <span className="text-[10px] text-brand-400 font-medium">you</span>
                          )}
                          {c.resolved && (
                            <span className="text-[10px] text-fg-subtle">resolved</span>
                          )}
                          <span className="text-[10px] text-fg-subtle ml-auto">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        {c.field_key && (
                          <div className="text-[10px] text-fg-subtle mt-0.5">
                            Re: <code className="bg-bg-inset px-1 rounded">{c.field_key}</code>
                          </div>
                        )}
                        <p className="text-sm text-fg mt-1 whitespace-pre-wrap break-words">
                          {c.body}
                        </p>
                      </div>
                      {c.is_mine && !c.resolved && (
                        <button
                          onClick={() => deleteComment.mutate(c.id)}
                          className="text-fg-subtle hover:text-danger transition shrink-0 mt-0.5"
                          title="Delete comment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add comment */}
            <div className="flex gap-2">
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                rows={2}
                placeholder="Leave a comment or flag an issue…"
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-bg-base text-sm text-fg resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && commentBody.trim()) {
                    addComment.mutate();
                  }
                }}
              />
              <Button
                onClick={() => addComment.mutate()}
                loading={addComment.isPending}
                disabled={!commentBody.trim()}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-fg-subtle mt-1">
              ⌘/Ctrl+Enter to send · Delete your own comments before signing
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
