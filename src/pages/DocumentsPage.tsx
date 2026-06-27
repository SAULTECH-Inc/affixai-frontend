import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FileText,
  Download,
  Trash2,
  Search,
  FileSignature,
  Filter,
  Mail,
  Pencil,
  Users,
  UserPlus,
  X as XIcon,
  CheckCircle2,
  Clock,
  Eye,
  Send,
  MessageSquare,
  CornerDownRight,
  Check,
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
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/cn';

interface Doc {
  id: string;
  original_file_name: string;
  file_mime_type: string;
  file_size: number;
  status: string;
  document_type: string;
  completed_at?: string | null;
  created_at: string;
  metadata?: Record<string, any> | null;
}

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'brand'> = {
  completed: 'success',
  signed: 'success',
  processing: 'warning',
  uploaded: 'neutral',
  extracted: 'brand',
  draft: 'neutral',
  pending_signature: 'warning',
  failed: 'danger',
  archived: 'neutral',
};

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  // Email modal state — which doc is being emailed (null = closed).
  const [emailDoc, setEmailDoc] = useState<Doc | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  // emailMsg is HTML produced by the Tiptap editor.
  const [emailMsg, setEmailMsg] = useState('');
  // Share/collaborate modal state.
  const [shareDoc, setShareDoc] = useState<Doc | null>(null);

  const sendEmail = useMutation({
    mutationFn: async () => {
      if (!emailDoc) throw new Error('No document');
      const { data } = await api.post(`/documents/${emailDoc.id}/email`, {
        to: emailTo,
        subject: emailSubject.trim() || null,
        message: emailMsg || null,
      });
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Sent to ${data.sent_to}`);
      setEmailDoc(null);
      setEmailTo('');
      setEmailSubject('');
      setEmailMsg('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Email failed');
    },
  });

  const { data: docs, isLoading } = useQuery({
    queryKey: ['documents', statusFilter],
    queryFn: async () => {
      const { data } = await api.get<Doc[]>('/documents', {
        params: statusFilter ? { status: statusFilter } : {},
      });
      return data;
    },
  });

  // Separate query: just the drafts, so we can show a count badge on the
  // Drafts chip even when the user is viewing a different filter. Cheap —
  // most users will have 0–5 drafts. Refetched every 30s so a draft saved
  // in another tab shows up here without a manual refresh.
  const { data: draftDocs } = useQuery({
    queryKey: ['documents', 'draft-count'],
    queryFn: async () => {
      const { data } = await api.get<Doc[]>('/documents', {
        params: { status: 'draft' },
      });
      return data;
    },
    refetchInterval: 30_000,
  });
  const draftCount = draftDocs?.length ?? 0;

  const filtered = useMemo(() => {
    if (!docs) return [];
    const q = search.trim().toLowerCase();
    return docs.filter((d) =>
      q ? d.original_file_name.toLowerCase().includes(q) : true
    );
  }, [docs, search]);

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted');
    },
  });

  async function download(doc: Doc, format?: 'pdf' | 'docx' | 'txt' | 'md') {
    try {
      // Original file: hit /file. Different format: hit /download/<format>
      // (server runs the conversion on demand).
      const url = format
        ? `/documents/${doc.id}/download/${format}`
        : `/documents/${doc.id}/file`;
      const resp = await api.get(url, { responseType: 'blob' });
      const base = doc.original_file_name.replace(/\.[^.]+$/, '');
      const filename = format
        ? `${base}.${format}`
        : doc.original_file_name;
      const objectUrl = URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      // 501 = format requires a tool that isn't installed (e.g. LibreOffice for DOCX→PDF).
      toast.error(
        err?.response?.data?.detail || 'Download failed'
      );
    }
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description="All documents you've uploaded or signed."
        actions={
          <Link to="/auto-sign">
            <Button>
              <FileSignature className="h-4 w-4" />
              Auto-Sign new
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle" />
              <Input
                placeholder="Search by file name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {/* Filter chips: scroll horizontally on phones rather than
                cramming five buttons into a 320px-wide screen. `-mx-3 px-3`
                bleeds the scroll area to the card edge so scroll affordance
                is obvious. */}
            <div className="flex items-center gap-2 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible">
              <Filter className="h-4 w-4 text-fg-muted shrink-0" />
              {['', 'draft', 'completed', 'processing', 'failed'].map((s) => {
                const isDraftChip = s === 'draft';
                return (
                  <button
                    key={s || 'all'}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      // shrink-0 + whitespace-nowrap ensures the chip doesn't
                      // shrink inside the horizontal scroll container.
                      'shrink-0 whitespace-nowrap px-3 h-8 rounded-lg text-xs font-medium border transition capitalize inline-flex items-center gap-1.5',
                      statusFilter === s
                        ? 'bg-gradient-brand-soft border-brand-500/30 text-fg'
                        : 'border-border text-fg-muted hover:text-fg'
                    )}
                  >
                    {s || 'all'}
                    {/* Show the unread-style badge on Drafts so users notice
                        their unfinished work without clicking through to it. */}
                    {isDraftChip && draftCount > 0 && (
                      <span
                        className={cn(
                          'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold',
                          statusFilter === s
                            ? 'bg-brand-500 text-white'
                            : 'bg-warning/20 text-warning'
                        )}
                      >
                        {draftCount > 99 ? '99+' : draftCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title={search ? 'No matches' : 'No documents yet'}
              description={
                search
                  ? 'Try a different search term.'
                  : 'Auto-Sign a document to see it here.'
              }
              action={
                !search && (
                  <Link to="/auto-sign">
                    <Button>Auto-Sign a document</Button>
                  </Link>
                )
              }
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 rounded-xl border border-border bg-bg-inset hover:bg-bg-elevated transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-bg-elevated border border-border grid place-items-center text-fg-muted shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-fg truncate">
                        {d.original_file_name}
                      </div>
                      <div className="text-xs text-fg-subtle flex items-center gap-2">
                        <span>{fmtSize(d.file_size)}</span>
                        <span>·</span>
                        <span>
                          {new Date(d.created_at).toLocaleDateString()}
                        </span>
                        {d.metadata?.purpose && (
                          <>
                            <span>·</span>
                            <span className="capitalize">
                              {d.metadata.purpose.replace('_', ' ')}
                            </span>
                          </>
                        )}
                        {d.status === 'draft' && d.metadata?.draft_saved_at && (
                          <>
                            <span>·</span>
                            <span className="text-warning">
                              Draft saved{' '}
                              {new Date(d.metadata.draft_saved_at).toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 sm:shrink-0 flex-wrap">
                    <Badge tone={STATUS_TONE[d.status] || 'neutral'}>
                      {d.status.replace('_', ' ')}
                    </Badge>
                    {/*
                     * For drafts, the primary action is "resume editing" —
                     * the editor pre-loads field_placements so the user
                     * picks up where they left off. We surface this as a
                     * full button (not a ghost icon) so it's the obvious
                     * next step.
                     */}
                    {d.status === 'draft' && (
                      <Link to={`/documents/${d.id}/edit`}>
                        <Button size="sm" variant="outline">
                          <Pencil className="h-3.5 w-3.5" />
                          Continue
                        </Button>
                      </Link>
                    )}
                    <DownloadMenu doc={d} onDownload={download} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShareDoc(d)}
                      title="Share / invite signers"
                    >
                      <Users className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEmailDoc(d)}
                      title="Email"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove.mutate(d.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {shareDoc && (
        <ShareModal doc={shareDoc} onClose={() => setShareDoc(null)} />
      )}

      {emailDoc && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !sendEmail.isPending && setEmailDoc(null)}
        >
          <div
            className="bg-bg-elevated border border-border rounded-2xl shadow-card max-w-2xl w-full p-6 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-gradient-brand grid place-items-center text-white shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold text-fg">
                  Email document
                </h3>
                <p className="text-xs text-fg-muted truncate">
                  Attaching <strong>{emailDoc.original_file_name}</strong> as a PDF.
                </p>
              </div>
            </div>
            <div className="space-y-4 overflow-y-auto pr-1 -mr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="email-to">Recipient</Label>
                  <Input
                    id="email-to"
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="recipient@example.com"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="email-subject">Subject</Label>
                  <Input
                    id="email-subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder={`Signed document: ${emailDoc.original_file_name}`}
                  />
                </div>
              </div>
              <div>
                <Label>Message</Label>
                <RichTextEditor
                  value={emailMsg}
                  onChange={setEmailMsg}
                  placeholder="Hi, please find the signed document attached…"
                  minHeight={180}
                />
                <p className="text-[11px] text-fg-subtle mt-1.5">
                  Formatting is preserved in the recipient's inbox. Keep it
                  email-safe — bold, italics, lists, and links work everywhere.
                </p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEmailDoc(null)}
                disabled={sendEmail.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => sendEmail.mutate()}
                loading={sendEmail.isPending}
                disabled={!emailTo.trim()}
              >
                {!sendEmail.isPending && <Mail className="h-4 w-4" />}
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ---- Share / collaborate modal --------------------------------------------
//
// Phase C foundation: list existing participants + invite new ones + see
// activity. The richer per-document collaboration panel (anchored comments,
// participant ordering for workflows) lives on the document editor page;
// here we surface the bare minimum so users can fan out a doc from the
// documents list directly.

type ParticipantRole = 'signer' | 'reviewer' | 'viewer';
type ParticipantStatus =
  | 'invited'
  | 'viewed'
  | 'signed'
  | 'approved'
  | 'declined'
  | 'revoked';

interface ParticipantOut {
  id: string;
  document_id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  role: ParticipantRole;
  status: ParticipantStatus;
  sequence_order: number;
  invited_at: string;
  first_viewed_at: string | null;
  completed_at: string | null;
  message: string | null;
}

interface ActivityEntry {
  id: string;
  action: string;
  description: string | null;
  actor_email: string | null;
  actor_name: string | null;
  created_at: string;
}

const ROLE_LABEL: Record<ParticipantRole, string> = {
  signer: 'Signer',
  reviewer: 'Reviewer',
  viewer: 'Viewer',
};

const STATUS_PILL: Record<
  ParticipantStatus,
  { tone: 'success' | 'warning' | 'danger' | 'brand' | 'neutral'; label: string; icon: any }
> = {
  invited: { tone: 'neutral', label: 'Invited', icon: Send },
  viewed: { tone: 'brand', label: 'Viewed', icon: Eye },
  signed: { tone: 'success', label: 'Signed', icon: CheckCircle2 },
  approved: { tone: 'success', label: 'Approved', icon: CheckCircle2 },
  declined: { tone: 'danger', label: 'Declined', icon: XIcon },
  revoked: { tone: 'neutral', label: 'Revoked', icon: XIcon },
};

interface WorkflowStatus {
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
  declined_reason: string | null;
  total_required: number;
  completed_required: number;
  is_complete: boolean;
  is_expired: boolean;
  next_actor_email: string | null;
}

function ShareModal({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const qc = useQueryClient();

  const { data: participants, refetch } = useQuery({
    queryKey: ['document', doc.id, 'participants'],
    queryFn: async () => {
      const { data } = await api.get<ParticipantOut[]>(
        `/documents/${doc.id}/participants`
      );
      return data;
    },
  });

  const { data: workflow, refetch: refetchWorkflow } = useQuery({
    queryKey: ['document', doc.id, 'workflow'],
    queryFn: async () => {
      const { data } = await api.get<WorkflowStatus>(
        `/documents/${doc.id}/workflow`
      );
      return data;
    },
  });

  const [routingMode, setRoutingMode] = useState<'parallel' | 'sequential'>(
    'parallel'
  );
  const [expiresInDays, setExpiresInDays] = useState<number | ''>(7);

  const send = useMutation({
    mutationFn: async () => {
      const expires_at =
        typeof expiresInDays === 'number' && expiresInDays > 0
          ? new Date(
              Date.now() + expiresInDays * 24 * 60 * 60 * 1000
            ).toISOString()
          : null;
      const { data } = await api.post(`/documents/${doc.id}/send`, {
        routing_mode: routingMode,
        expires_at,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Sent for signature');
      refetch();
      refetchWorkflow();
      qc.invalidateQueries({ queryKey: ['document', doc.id, 'activity'] });
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Could not send');
    },
  });

  const voidWorkflow = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/documents/${doc.id}/void`, {});
      return data;
    },
    onSuccess: () => {
      toast.success('Workflow voided');
      refetch();
      refetchWorkflow();
    },
  });

  const remind = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/documents/${doc.id}/remind`);
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Reminders sent');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Remind failed');
    },
  });

  // Tabs control which body section is rendered. "people" = participants +
  // activity (current default). "comments" = thread of comments.
  const [tab, setTab] = useState<'people' | 'comments'>('people');

  const { data: activity } = useQuery({
    queryKey: ['document', doc.id, 'activity'],
    queryFn: async () => {
      const { data } = await api.get<ActivityEntry[]>(
        `/documents/${doc.id}/activity`,
        { params: { limit: 12 } }
      );
      return data;
    },
  });

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ParticipantRole>('signer');
  const [message, setMessage] = useState('');

  const invite = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(
        `/documents/${doc.id}/participants`,
        {
          email: email.trim(),
          role,
          message: message.trim() || null,
        }
      );
      return data;
    },
    onSuccess: () => {
      toast.success(`Invited ${email}`);
      setEmail('');
      setMessage('');
      refetch();
      qc.invalidateQueries({ queryKey: ['document', doc.id, 'activity'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Could not invite');
    },
  });

  const revoke = useMutation({
    mutationFn: async (participantId: string) => {
      await api.delete(
        `/documents/${doc.id}/participants/${participantId}`
      );
    },
    onSuccess: () => {
      toast.success('Invitation revoked');
      refetch();
    },
  });

  const resend = useMutation({
    mutationFn: async (participantId: string) => {
      await api.post(
        `/documents/${doc.id}/participants/${participantId}/resend`
      );
    },
    onSuccess: () => toast.success('Invite re-sent'),
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail || 'Resend failed'),
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !invite.isPending && onClose()}
    >
      <div
        className="bg-bg-elevated border border-border rounded-2xl shadow-card max-w-2xl w-full p-6 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-gradient-brand grid place-items-center text-white shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-semibold text-fg">
              Share document
            </h3>
            <p className="text-xs text-fg-muted truncate">
              <strong>{doc.original_file_name}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-fg-subtle hover:text-fg transition"
            title="Close"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Invite form */}
        <div className="rounded-2xl border border-border p-4 mb-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
            <div>
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="person@example.com"
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as ParticipantRole)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-bg-base text-sm text-fg"
              >
                <option value="signer">Signer</option>
                <option value="reviewer">Reviewer</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="invite-msg">Message (optional)</Label>
            <textarea
              id="invite-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Hi, please sign by EOD…"
              className="w-full px-3 py-2 rounded-xl border border-border bg-bg-base text-sm text-fg resize-y"
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => invite.mutate()}
              loading={invite.isPending}
              disabled={!email.trim()}
            >
              <UserPlus className="h-4 w-4" />
              Send invite
            </Button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 mb-4 border-b border-border">
          {(
            [
              { id: 'people', label: 'People & activity', icon: Users },
              { id: 'comments', label: 'Comments', icon: MessageSquare },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-3 py-2 text-xs font-medium border-b-2 -mb-px transition flex items-center gap-1.5',
                tab === t.id
                  ? 'border-brand-500 text-fg'
                  : 'border-transparent text-fg-muted hover:text-fg'
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'comments' && (
          <CommentsTab documentId={doc.id} />
        )}

        {tab === 'people' && (
        <>
        {/* Workflow controls — only relevant once participants exist */}
        {participants && participants.length > 0 && workflow && (
          <div className="rounded-2xl border border-border p-4 mb-5">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-brand-soft border border-border grid place-items-center text-brand-400 shrink-0">
                <Send className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-fg">
                    Workflow
                  </h4>
                  <Badge
                    tone={
                      workflow.routing_status === 'completed'
                        ? 'success'
                        : workflow.routing_status === 'declined' ||
                            workflow.routing_status === 'expired'
                          ? 'danger'
                          : workflow.routing_status === 'sent' ||
                              workflow.routing_status === 'in_progress'
                            ? 'brand'
                            : 'neutral'
                    }
                  >
                    {workflow.routing_status.replace('_', ' ')}
                  </Badge>
                  {workflow.total_required > 0 && (
                    <span className="text-xs text-fg-subtle">
                      {workflow.completed_required} of{' '}
                      {workflow.total_required} done
                    </span>
                  )}
                </div>

                {workflow.routing_status === 'draft' && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRoutingMode('parallel')}
                        className={cn(
                          'text-left p-2 rounded-lg border transition',
                          routingMode === 'parallel'
                            ? 'border-brand-500/40 bg-brand-500/5'
                            : 'border-border bg-bg-base hover:border-fg-muted/30'
                        )}
                      >
                        <div className="text-xs font-medium text-fg">
                          Parallel
                        </div>
                        <div className="text-[10px] text-fg-subtle">
                          Everyone signs at once.
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoutingMode('sequential')}
                        className={cn(
                          'text-left p-2 rounded-lg border transition',
                          routingMode === 'sequential'
                            ? 'border-brand-500/40 bg-brand-500/5'
                            : 'border-border bg-bg-base hover:border-fg-muted/30'
                        )}
                      >
                        <div className="text-xs font-medium text-fg">
                          Sequential
                        </div>
                        <div className="text-[10px] text-fg-subtle">
                          One at a time, in order.
                        </div>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-fg-muted">
                        Expires in
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={expiresInDays}
                        onChange={(e) =>
                          setExpiresInDays(
                            e.target.value === ''
                              ? ''
                              : parseInt(e.target.value)
                          )
                        }
                        className="w-16 h-7 px-2 rounded-md border border-border bg-bg-base text-xs text-fg text-right"
                      />
                      <span className="text-xs text-fg-muted">
                        days (0 = no expiry)
                      </span>
                    </div>
                    <Button
                      onClick={() => send.mutate()}
                      loading={send.isPending}
                      fullWidth
                    >
                      <Send className="h-4 w-4" />
                      Send for signature
                    </Button>
                  </div>
                )}

                {(workflow.routing_status === 'sent' ||
                  workflow.routing_status === 'in_progress') && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {workflow.next_actor_email && (
                      <span className="text-xs text-fg-muted self-center">
                        Waiting on{' '}
                        <strong>{workflow.next_actor_email}</strong>
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => remind.mutate()}
                      loading={remind.isPending}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Remind pending
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm('Cancel this workflow?')) {
                          voidWorkflow.mutate();
                        }
                      }}
                      loading={voidWorkflow.isPending}
                    >
                      <XIcon className="h-3.5 w-3.5" />
                      Void
                    </Button>
                  </div>
                )}

                {workflow.routing_status === 'declined' && (
                  <p className="text-xs text-fg-muted mt-2">
                    Declined.{' '}
                    {workflow.declined_reason &&
                      `Reason: ${workflow.declined_reason}`}
                  </p>
                )}
                {workflow.routing_status === 'expired' && (
                  <p className="text-xs text-fg-muted mt-2">
                    Expired{' '}
                    {workflow.expires_at &&
                      new Date(workflow.expires_at).toLocaleDateString()}
                    .
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Participants list + activity feed in a tidy two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1 -mr-1">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-fg-subtle mb-2 font-semibold">
              Participants
            </h4>
            {!participants || participants.length === 0 ? (
              <p className="text-sm text-fg-muted italic">
                No one invited yet.
              </p>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => {
                  const pill = STATUS_PILL[p.status];
                  const Icon = pill.icon;
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl border border-border bg-bg-inset p-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-gradient-brand-soft border border-border grid place-items-center text-brand-400 text-xs font-bold shrink-0">
                          {(p.email[0] || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-fg truncate">
                            {p.name || p.email}
                          </div>
                          <div className="text-[11px] text-fg-subtle truncate">
                            {p.email}
                          </div>
                        </div>
                        <Badge tone={pill.tone}>
                          <Icon className="h-3 w-3" />
                          {pill.label}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="text-fg-muted">{ROLE_LABEL[p.role]}</span>
                        {p.status === 'invited' && (
                          <button
                            onClick={() => resend.mutate(p.id)}
                            className="text-brand-400 hover:underline ml-auto"
                          >
                            Resend invite
                          </button>
                        )}
                        {p.status !== 'revoked' && (
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Revoke invitation for ${p.email}?`
                                )
                              ) {
                                revoke.mutate(p.id);
                              }
                            }}
                            className="text-fg-subtle hover:text-danger"
                            title="Revoke"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-fg-subtle mb-2 font-semibold">
              Activity
            </h4>
            {!activity || activity.length === 0 ? (
              <p className="text-sm text-fg-muted italic">
                No activity yet.
              </p>
            ) : (
              <div className="space-y-2">
                {activity.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-border bg-bg-inset p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-fg-subtle shrink-0" />
                      <span className="text-[10px] text-fg-subtle">
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-fg mt-1">
                      {a.description ||
                        a.action.replace(/_/g, ' ').toLowerCase()}
                    </div>
                    {a.actor_email && (
                      <div className="text-[11px] text-fg-subtle mt-0.5">
                        {a.actor_name || a.actor_email}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </>
        )}

        <div className="mt-5 pt-4 border-t border-border flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}


// ---- Comments tab ----------------------------------------------------------
//
// Lightweight comment thread for a document. Top-level comments + 1 level of
// replies (server flattens deeper nesting). Lets the owner / participants
// (eventually — guest comments aren't wired up yet) discuss the doc without
// leaving the modal.

interface CommentOut {
  id: string;
  document_id: string;
  user_id: string | null;
  parent_id: string | null;
  author_name: string;
  author_email: string | null;
  body: string;
  page: number | null;
  x: number | null;
  y: number | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  reply_count: number;
}

function CommentsTab({ documentId }: { documentId: string }) {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<CommentOut | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const { data: comments } = useQuery({
    queryKey: ['document', documentId, 'comments'],
    queryFn: async () => {
      const { data } = await api.get<CommentOut[]>(
        `/documents/${documentId}/comments`
      );
      return data;
    },
  });

  const refresh = () =>
    qc.invalidateQueries({ queryKey: ['document', documentId, 'comments'] });

  const add = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(
        `/documents/${documentId}/comments`,
        {
          body: body.trim(),
          parent_id: replyTo?.id ?? null,
        }
      );
      return data;
    },
    onSuccess: () => {
      setBody('');
      setReplyTo(null);
      refresh();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail || 'Could not post'),
  });

  const toggleResolve = useMutation({
    mutationFn: async (c: CommentOut) => {
      await api.put(`/documents/${documentId}/comments/${c.id}`, {
        resolved: !c.resolved,
      });
    },
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/documents/${documentId}/comments/${id}`);
    },
    onSuccess: refresh,
  });

  // Group: top-level comments + their replies. The server already enforces
  // a flat tree (replies-to-replies get re-parented) so this is one pass.
  const tree = (() => {
    if (!comments) return [];
    const tops = comments.filter((c) => !c.parent_id);
    const byParent: Record<string, CommentOut[]> = {};
    for (const c of comments) {
      if (c.parent_id) {
        (byParent[c.parent_id] = byParent[c.parent_id] || []).push(c);
      }
    }
    return tops
      .filter((c) => showResolved || !c.resolved)
      .map((t) => ({ top: t, replies: byParent[t.id] || [] }));
  })();

  return (
    <div className="space-y-3">
      {/* Composer */}
      <div className="rounded-2xl border border-border p-3">
        {replyTo && (
          <div className="flex items-center gap-2 text-xs text-fg-muted mb-2">
            <CornerDownRight className="h-3 w-3" />
            Replying to{' '}
            <strong className="text-fg truncate">{replyTo.author_name}</strong>
            <button
              onClick={() => setReplyTo(null)}
              className="ml-auto text-fg-subtle hover:text-fg"
              title="Cancel reply"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </div>
        )}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder={
            replyTo ? `Reply to ${replyTo.author_name}…` : 'Add a comment…'
          }
          className="w-full px-3 py-2 rounded-xl border border-border bg-bg-base text-sm text-fg resize-y"
        />
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="accent-brand-500"
            />
            Show resolved
          </label>
          <Button
            size="sm"
            onClick={() => add.mutate()}
            loading={add.isPending}
            disabled={!body.trim()}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {replyTo ? 'Reply' : 'Post'}
          </Button>
        </div>
      </div>

      {/* Thread list */}
      {!comments || comments.length === 0 ? (
        <p className="text-sm text-fg-muted italic text-center py-8">
          No comments yet — start the discussion.
        </p>
      ) : tree.length === 0 ? (
        <p className="text-sm text-fg-muted italic text-center py-6">
          All comments resolved. Enable "Show resolved" to see them.
        </p>
      ) : (
        <div className="space-y-3">
          {tree.map(({ top, replies }) => (
            <CommentBubble
              key={top.id}
              comment={top}
              replies={replies}
              onReply={() => setReplyTo(top)}
              onToggleResolve={() => toggleResolve.mutate(top)}
              onDelete={() => {
                if (window.confirm('Delete this comment?')) {
                  remove.mutate(top.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentBubble({
  comment,
  replies,
  onReply,
  onToggleResolve,
  onDelete,
}: {
  comment: CommentOut;
  replies: CommentOut[];
  onReply: () => void;
  onToggleResolve: () => void;
  onDelete: () => void;
}) {
  const created = new Date(comment.created_at).toLocaleString();
  const anchorBadge =
    comment.page != null && (
      <span className="text-[10px] text-fg-subtle">
        · page {comment.page + 1}
      </span>
    );
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        comment.resolved
          ? 'border-success/20 bg-success/5'
          : 'border-border bg-bg-inset'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-7 w-7 rounded-full bg-gradient-brand-soft border border-border grid place-items-center text-brand-400 text-[10px] font-bold shrink-0">
          {(comment.author_name[0] || '?').toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-fg truncate flex items-center gap-1">
            {comment.author_name}
            {anchorBadge}
            {comment.resolved && (
              <Badge tone="success">
                <Check className="h-3 w-3" />
                Resolved
              </Badge>
            )}
          </div>
          <div className="text-[10px] text-fg-subtle">{created}</div>
        </div>
      </div>
      <div className="mt-2 text-sm text-fg whitespace-pre-wrap">
        {comment.body}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px]">
        <button onClick={onReply} className="text-brand-400 hover:underline">
          Reply
        </button>
        <button
          onClick={onToggleResolve}
          className="text-fg-muted hover:text-fg"
        >
          {comment.resolved ? 'Unresolve' : 'Resolve'}
        </button>
        <button onClick={onDelete} className="text-fg-muted hover:text-danger">
          Delete
        </button>
        {comment.reply_count > 0 && (
          <span className="text-fg-subtle ml-auto">
            {comment.reply_count} repl
            {comment.reply_count === 1 ? 'y' : 'ies'}
          </span>
        )}
      </div>

      {/* Replies — flat list, indented */}
      {replies.length > 0 && (
        <div className="mt-3 pl-5 space-y-2 border-l-2 border-border">
          {replies.map((r) => (
            <div key={r.id} className="text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-6 w-6 rounded-full bg-bg-elevated border border-border grid place-items-center text-fg-muted text-[10px] font-bold shrink-0">
                  {(r.author_name[0] || '?').toUpperCase()}
                </div>
                <span className="text-xs font-medium text-fg truncate">
                  {r.author_name}
                </span>
                <span className="text-[10px] text-fg-subtle">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              <div className="mt-1 ml-8 text-sm text-fg whitespace-pre-wrap">
                {r.body}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ---- Download menu ---------------------------------------------------------
//
// Hover/click reveals format options. Click the icon = original format.
// Click a sub-item = on-the-fly conversion via the backend's
// /documents/:id/download/:format endpoint.

function DownloadMenu({
  doc,
  onDownload,
}: {
  doc: Doc;
  onDownload: (
    doc: Doc,
    format?: 'pdf' | 'docx' | 'txt' | 'md'
  ) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Click-away closes the menu so it doesn't linger when the user moves on.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function go(format?: 'pdf' | 'docx' | 'txt' | 'md') {
    setBusy(true);
    setOpen(false);
    try {
      await onDownload(doc, format);
    } finally {
      setBusy(false);
    }
  }

  const FORMATS: { value: 'pdf' | 'docx' | 'txt' | 'md'; label: string }[] = [
    { value: 'pdf', label: 'PDF' },
    { value: 'docx', label: 'Word (.docx)' },
    { value: 'md', label: 'Markdown' },
    { value: 'txt', label: 'Plain text' },
  ];

  return (
    <div ref={wrapRef} className="relative inline-block">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        title="Download"
        loading={busy}
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-30 w-48 rounded-xl border border-border bg-bg-elevated shadow-card overflow-hidden"
        >
          <button
            onClick={() => go(undefined)}
            className="w-full text-left px-3 py-2 text-sm text-fg hover:bg-bg-inset border-b border-border"
          >
            Original
            <span className="block text-[10px] text-fg-subtle">
              As uploaded / signed
            </span>
          </button>
          <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-fg-subtle">
            Convert to
          </div>
          {FORMATS.map((f) => (
            <button
              key={f.value}
              onClick={() => go(f.value)}
              className="w-full text-left px-3 py-2 text-sm text-fg hover:bg-bg-inset"
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
