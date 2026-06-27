/**
 * Magic-link landing page for participants invited to a document.
 *
 * Unauthenticated — the URL token IS the credential. The page:
 *   1. Resolves the token → document info via GET /shared/{token}
 *   2. Shows sender + document summary + this participant's state
 *   3. Lets the participant sign (canvas-draw) or decline
 *
 * Out of scope for v1:
 *   - Drag-and-drop signature placement (we stamp bottom-right for now)
 *   - Multi-step wizard (review → sign → confirm)
 *   - Inline PDF rendering of the latest stamped page (we link to download)
 */
import { useMemo, useRef, useState } from 'react';
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

// We use a bare axios instance (no JWT interceptor) — the guest is by
// definition unauthenticated. The token in the URL is the only credential.
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

  const sigPadRef = useRef<SignatureCanvas | null>(null);
  const [mode, setMode] = useState<'idle' | 'signing' | 'declining'>('idle');
  const [declineReason, setDeclineReason] = useState('');

  const sign = useMutation({
    mutationFn: async () => {
      if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
        throw new Error('Please draw your signature first');
      }
      // Capture the trimmed signature as a PNG blob.
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
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Could not decline');
    },
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
    if (terminal) {
      if (me.status === 'signed' || me.status === 'approved') {
        return {
          tone: 'success' as const,
          icon: CheckCircle2,
          text: 'You signed this',
        };
      }
      if (me.status === 'declined') {
        return {
          tone: 'danger' as const,
          icon: XCircle,
          text: 'You declined this',
        };
      }
      if (routing_status === 'completed') {
        return {
          tone: 'success' as const,
          icon: CheckCircle2,
          text: 'Document completed',
        };
      }
      if (routing_status === 'expired') {
        return {
          tone: 'danger' as const,
          icon: Clock,
          text: 'Invitation expired',
        };
      }
      return {
        tone: 'neutral' as const,
        icon: XCircle,
        text: 'No longer active',
      };
    }
    if (canSign) {
      return {
        tone: 'brand' as const,
        icon: Pen,
        text: me.role === 'signer' ? 'Your signature is needed' : 'Your review is needed',
      };
    }
    if (routing_mode === 'sequential') {
      return {
        tone: 'warning' as const,
        icon: Clock,
        text: 'Waiting for someone before you',
      };
    }
    return {
      tone: 'neutral' as const,
      icon: Clock,
      text: 'Pending',
    };
  })();
  const StatusIcon = statusPill.icon;

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
                  {sender_name ? `${sender_name} sent you this document` : 'A document was shared with you'}
                  {' · '}
                  Role: <span className="capitalize">{me.role}</span>
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

        {/* Actions */}
        {!terminal && canSign && mode === 'idle' && (
          <Card>
            <CardContent>
              <h2 className="font-display text-lg font-semibold text-fg mb-2">
                Ready to sign?
              </h2>
              <p className="text-sm text-fg-muted mb-4">
                {data.my_targets.length > 0
                  ? `The sender has reserved ${data.my_targets.length} ` +
                    `spot${data.my_targets.length === 1 ? '' : 's'} on the ` +
                    `document for you. We'll place your signature there ` +
                    `automatically when you submit.`
                  : me.role === 'signer'
                    ? 'Draw your signature on the next step. We\'ll stamp it on the document and notify the sender.'
                    : 'Approve or decline this document.'}
              </p>

              {/* Visual summary of the reserved spots so the user knows what
                  they're committing to. Each chip shows page + kind. */}
              {data.my_targets.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {data.my_targets.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-bg-inset border border-border text-xs text-fg-muted"
                    >
                      <Pen className="h-3 w-3 text-brand-400" />
                      {t.kind === 'signature'
                        ? 'Signature'
                        : t.kind === 'initials'
                          ? 'Initials'
                          : t.kind === 'date'
                            ? 'Date'
                            : 'Text'}
                      <span className="text-fg-subtle">
                        · page {t.page + 1}
                      </span>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => setMode('signing')}>
                  <Pen className="h-4 w-4" />
                  {me.role === 'signer' ? 'Sign document' : 'Approve'}
                </Button>
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
                Use your mouse or trackpad. We'll stamp it on the document
                automatically.
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => sigPadRef.current?.clear()}
                >
                  Clear
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setMode('idle')}
                    disabled={sign.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => sign.mutate()}
                    loading={sign.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Submit signature
                  </Button>
                </div>
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
                The sender will be notified. The workflow stops here — no
                other signers will be asked.
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
                <Button
                  variant="ghost"
                  onClick={() => setMode('idle')}
                  disabled={decline.isPending}
                >
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

        {/* Already-acted state */}
        {terminal && (
          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-fg-muted" />
                <p className="text-sm text-fg-muted">
                  Thanks — nothing more is needed from you. You can{' '}
                  <a
                    href={downloadUrl}
                    className="text-brand-400 hover:underline"
                  >
                    download the current version
                  </a>
                  .
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
