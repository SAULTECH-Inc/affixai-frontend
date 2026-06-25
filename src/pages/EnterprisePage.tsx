import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Key,
  Plus,
  Copy,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Users,
  FileText,
  Activity,
  Terminal,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/cn';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface Enterprise {
  id: string;
  name: string;
  contact_email: string | null;
  status: string;
  plan: string;
  max_users: number;
  max_documents: number;
  max_api_calls: number;
  created_at: string;
}

type ApiKeyType = 'test' | 'live';

interface ApiKey {
  id: string;
  name: string;
  description: string | null;
  key_type: ApiKeyType;
  status: 'active' | 'inactive' | 'revoked';
  usage_count: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface EnterpriseStats {
  users: number;
  documents: number;
  api_calls: number;
  active_api_keys: number;
  limits: {
    max_users: number;
    max_documents: number;
    max_api_calls: number;
  };
}

interface EnterpriseDoc {
  id: string;
  original_file_name: string;
  file_size: number;
  status: string;
  document_type: string;
  completed_at: string | null;
  created_at: string;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EnterprisePage() {
  const user = useAuthStore((s) => s.user);
  const enterpriseId = user?.enterprise_id ?? null;

  if (!enterpriseId) {
    return <NoEnterprise />;
  }

  return <EnterpriseManager enterpriseId={enterpriseId} />;
}

function NoEnterprise() {
  const qc = useQueryClient();
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', contact_email: '' });

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Enterprise>('/enterprises', form);
      return data;
    },
    onSuccess: async () => {
      // Backend binds the user to the new enterprise and bumps them to admin.
      // Re-fetch the user so `user.enterprise_id` is populated locally, which
      // flips this page over to the admin panel without a manual refresh.
      await fetchUser();
      qc.invalidateQueries();
      toast.success('Enterprise created');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Could not create');
    },
  });

  return (
    <div>
      <PageHeader
        title="Enterprise"
        description="Create an enterprise to manage API keys for the bulk-sign API."
      />
      {!open ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Building2 className="h-6 w-6" />}
              title="No enterprise yet"
              description="Create one to issue API keys for programmatic document signing."
              action={
                <Button onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create enterprise
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-xl">
          <CardContent>
            <h2 className="font-display text-lg font-semibold mb-1 text-fg">
              New enterprise
            </h2>
            <p className="text-sm text-fg-muted mb-5">
              You'll be the admin. You can add users and keys after.
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="ent-name">Name</Label>
                <Input
                  id="ent-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Acme Inc."
                />
              </div>
              <div>
                <Label htmlFor="ent-email">Contact email</Label>
                <Input
                  id="ent-email"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contact_email: e.target.value }))
                  }
                  placeholder="ops@acme.com"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => create.mutate()}
                loading={create.isPending}
                disabled={!form.name || !form.contact_email}
              >
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EnterpriseManager({ enterpriseId }: { enterpriseId: string }) {
  const qc = useQueryClient();

  const { data: enterprise } = useQuery({
    queryKey: ['enterprise', enterpriseId],
    queryFn: async () => {
      const { data } = await api.get<Enterprise>(`/enterprises/${enterpriseId}`);
      return data;
    },
  });

  const { data: keys, isLoading } = useQuery({
    queryKey: ['enterprise', enterpriseId, 'keys'],
    queryFn: async () => {
      const { data } = await api.get<ApiKey[]>(
        `/enterprises/${enterpriseId}/api-keys`
      );
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['enterprise', enterpriseId, 'stats'],
    queryFn: async () => {
      const { data } = await api.get<EnterpriseStats>(
        `/enterprises/${enterpriseId}/stats`
      );
      return data;
    },
    // Auto-refresh every 30s so live API usage shows up quickly in the panel.
    refetchInterval: 30_000,
  });

  const { data: recentDocs } = useQuery({
    queryKey: ['enterprise', enterpriseId, 'docs'],
    queryFn: async () => {
      const { data } = await api.get<EnterpriseDoc[]>(
        `/enterprises/${enterpriseId}/documents`,
        { params: { limit: 10 } }
      );
      return data;
    },
    refetchInterval: 30_000,
  });

  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState<ApiKeyType>('test');
  const [createdKey, setCreatedKey] = useState<{
    plaintext: string;
    type: ApiKeyType;
  } | null>(null);

  const createKey = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ api_key: ApiKey; key: string }>(
        `/enterprises/${enterpriseId}/api-keys`,
        { name: newKeyName, key_type: newKeyType }
      );
      return data;
    },
    onSuccess: (data) => {
      setCreatedKey({ plaintext: data.key, type: data.api_key.key_type });
      setNewKeyName('');
      qc.invalidateQueries({ queryKey: ['enterprise', enterpriseId, 'keys'] });
    },
    onError: (err: any) => {
      // 402 = payment required (live key on a non-paying account)
      toast.error(err?.response?.data?.detail || 'Could not create key');
    },
  });

  const revokeKey = useMutation({
    mutationFn: async (keyId: string) =>
      api.delete(`/enterprises/${enterpriseId}/api-keys/${keyId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enterprise', enterpriseId, 'keys'] });
      toast.success('Key revoked');
    },
  });

  return (
    <div>
      <PageHeader
        title="Enterprise"
        description="Manage your organization's API keys and limits."
      />

      {enterprise && (
        <Card className="mb-6">
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-brand grid place-items-center text-white">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-fg">
                    {enterprise.name}
                  </h2>
                  <div className="text-sm text-fg-muted flex items-center gap-2 mt-0.5">
                    <span>{enterprise.contact_email}</span>
                    <span>·</span>
                    <Badge tone="brand">{enterprise.plan}</Badge>
                    <Badge
                      tone={
                        enterprise.status === 'active'
                          ? 'success'
                          : enterprise.status === 'trial'
                            ? 'brand'
                            : 'warning'
                      }
                    >
                      {enterprise.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <UsageStat
                icon={<Users className="h-4 w-4" />}
                label="Users"
                used={stats?.users ?? 0}
                limit={stats?.limits.max_users ?? enterprise.max_users}
              />
              <UsageStat
                icon={<FileText className="h-4 w-4" />}
                label="Documents"
                used={stats?.documents ?? 0}
                limit={stats?.limits.max_documents ?? enterprise.max_documents}
              />
              <UsageStat
                icon={<Activity className="h-4 w-4" />}
                label="API calls"
                used={stats?.api_calls ?? 0}
                limit={stats?.limits.max_api_calls ?? enterprise.max_api_calls}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <ApiQuickstart enterpriseId={enterpriseId} />

      <RecentDocs docs={recentDocs ?? []} />

      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-lg font-semibold text-fg">
                API keys
              </h2>
              <p className="text-sm text-fg-muted">
                Used to authenticate calls to the bulk-sign endpoints.
              </p>
            </div>
            <Button onClick={() => setShowNewKey(true)}>
              <Plus className="h-4 w-4" />
              New key
            </Button>
          </div>

          {showNewKey && (
            <div className="mb-5 p-4 rounded-2xl border border-brand-500/30 bg-gradient-brand-soft">
              {createdKey ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-brand-400" />
                    <span className="text-sm font-medium text-fg">
                      {createdKey.type === 'live' ? 'Live' : 'Test'} key created
                      — copy it now, you won't see it again
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-bg-elevated border border-border text-xs font-mono text-fg overflow-auto">
                      {createdKey.plaintext}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(createdKey.plaintext);
                        toast.success('Copied to clipboard');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="mt-3 flex items-start gap-2 text-xs text-fg-muted">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                    <span>
                      We only store a hashed version. If you lose this key,
                      revoke it and create a new one.
                    </span>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowNewKey(false);
                        setCreatedKey(null);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Mode</Label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <KeyTypeOption
                      active={newKeyType === 'test'}
                      onClick={() => setNewKeyType('test')}
                      title="Test"
                      prefix="sk_test_…"
                      subtitle="Free during trial. Use in dev & staging."
                    />
                    <KeyTypeOption
                      active={newKeyType === 'live'}
                      onClick={() => setNewKeyType('live')}
                      title="Live"
                      prefix="sk_live_…"
                      subtitle="Real production traffic. Requires a paid plan."
                      tone="live"
                    />
                  </div>
                  <Label htmlFor="kn">Key name</Label>
                  <Input
                    id="kn"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production bulk-signer"
                  />
                  {newKeyType === 'live' && (
                    <p className="text-xs text-fg-muted mt-3 flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-warning shrink-0 mt-0.5" />
                      Live keys are only issued to paid subscriptions. If you
                      haven't upgraded yet, this will fail with{' '}
                      <code>402 Payment Required</code>.
                    </p>
                  )}
                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setShowNewKey(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => createKey.mutate()}
                      loading={createKey.isPending}
                      disabled={!newKeyName}
                    >
                      Create {newKeyType} key
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-fg-muted">Loading…</p>
          ) : !keys || keys.length === 0 ? (
            <EmptyState
              icon={<Key className="h-6 w-6" />}
              title="No API keys yet"
              description="Create one to start using the bulk-sign API."
            />
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-bg-inset"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Key className="h-4 w-4 text-fg-muted shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-fg truncate flex items-center gap-2 flex-wrap">
                        {k.name}
                        <Badge tone={k.key_type === 'live' ? 'success' : 'neutral'}>
                          {k.key_type}
                        </Badge>
                        <Badge
                          tone={
                            k.status === 'active'
                              ? 'success'
                              : k.status === 'revoked'
                                ? 'danger'
                                : 'neutral'
                          }
                        >
                          {k.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-fg-subtle">
                        {k.usage_count} call{k.usage_count === 1 ? '' : 's'} ·{' '}
                        {k.last_used_at
                          ? `last used ${new Date(k.last_used_at).toLocaleDateString()}`
                          : 'never used'}
                      </div>
                    </div>
                  </div>
                  {k.status !== 'revoked' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeKey.mutate(k.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Stripe-style segmented picker for test/live API keys.
function KeyTypeOption({
  active,
  onClick,
  title,
  prefix,
  subtitle,
  tone = 'test',
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  prefix: string;
  subtitle: string;
  tone?: 'test' | 'live';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left p-3 rounded-xl border transition',
        active
          ? tone === 'live'
            ? 'border-success/40 bg-success/5'
            : 'border-brand-500/40 bg-brand-500/5'
          : 'border-border bg-bg-base hover:border-fg-muted/30'
      )}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-sm font-medium text-fg">{title}</span>
        <code
          className={cn(
            'text-[10px] font-mono px-1.5 py-0.5 rounded',
            tone === 'live'
              ? 'bg-success/15 text-success'
              : 'bg-bg-inset text-fg-muted'
          )}
        >
          {prefix}
        </code>
      </div>
      <div className="text-xs text-fg-muted leading-snug">{subtitle}</div>
    </button>
  );
}

function UsageStat({
  icon,
  label,
  used,
  limit,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number;
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const tone =
    pct >= 90
      ? 'bg-danger'
      : pct >= 70
        ? 'bg-warning'
        : 'bg-gradient-brand';
  return (
    <div className="p-3 rounded-xl bg-bg-inset border border-border">
      <div className="flex items-center gap-2 text-xs text-fg-subtle uppercase tracking-wider">
        <span className="text-fg-muted">{icon}</span>
        {label}
      </div>
      <div className="font-display font-semibold text-fg mt-1 flex items-baseline gap-1">
        <span>{used.toLocaleString()}</span>
        <span className="text-xs text-fg-subtle font-normal">
          / {limit.toLocaleString()}
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
        <div
          className={cn('h-full transition-all', tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Quickstart card — shows ready-to-copy curl snippets so devs can test the
// API from their terminal without hunting for docs. The example key is
// always `sk_…` so users know to swap it for the one they generated above.
function ApiQuickstart({ enterpriseId: _enterpriseId }: { enterpriseId: string }) {
  const [tab, setTab] = useState<'sign' | 'batch' | 'js'>('sign');
  const examples = {
    sign: `curl -X POST ${API_BASE}/public/sign \\
  -H "X-API-Key: sk_test_YOUR_KEY" \\
  -F "file=@form.pdf" \\
  -F 'user_data={"first_name":"Ada","last_name":"Lovelace","email":"ada@example.com"}'`,
    batch: `curl -X POST ${API_BASE}/public/sign/batch \\
  -H "X-API-Key: sk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "documents": [
      {
        "file_name": "form.pdf",
        "file_b64": "JVBERi0xLjQK...",
        "user_data": {"first_name":"Ada","last_name":"Lovelace"}
      }
    ]
  }'`,
    js: `const form = new FormData();
form.append('file', pdfBlob, 'form.pdf');
form.append('user_data', JSON.stringify({
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
}));

const res = await fetch('${API_BASE}/public/sign', {
  method: 'POST',
  headers: { 'X-API-Key': 'sk_test_YOUR_KEY' },
  body: form,
});
const { document_id, file_url } = await res.json();`,
  };

  const tabs: { id: 'sign' | 'batch' | 'js'; label: string }[] = [
    { id: 'sign', label: 'Sign one (curl)' },
    { id: 'batch', label: 'Batch sign (curl)' },
    { id: 'js', label: 'JavaScript' },
  ];

  return (
    <Card className="mb-6">
      <CardContent>
        <div className="flex items-center gap-2 mb-1">
          <Terminal className="h-4 w-4 text-brand-400" />
          <h2 className="font-display text-lg font-semibold text-fg">
            API quickstart
          </h2>
        </div>
        <p className="text-sm text-fg-muted mb-4">
          Authenticate with the <code className="text-xs">X-API-Key</code>{' '}
          header. The platform fills in vault data, signature & passport photo
          automatically.
        </p>
        <div className="flex items-center gap-1 mb-3 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-3 py-2 text-xs font-medium border-b-2 -mb-px transition',
                tab === t.id
                  ? 'border-brand-500 text-fg'
                  : 'border-transparent text-fg-muted hover:text-fg'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <pre className="text-xs font-mono p-4 rounded-xl bg-bg-base border border-border text-fg overflow-x-auto whitespace-pre">
            {examples[tab]}
          </pre>
          <Button
            size="sm"
            variant="outline"
            className="absolute top-2 right-2"
            onClick={() => {
              navigator.clipboard.writeText(examples[tab]);
              toast.success('Copied to clipboard');
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-xs text-fg-subtle mt-3">
          Need the full reference?{' '}
          <a
            href={`${API_BASE.replace(/\/api\/v1$/, '')}/docs`}
            target="_blank"
            rel="noreferrer"
            className="text-brand-400 hover:underline"
          >
            Open API docs ↗
          </a>
        </p>
      </CardContent>
    </Card>
  );
}

const DOC_STATUS_TONE: Record<
  string,
  'success' | 'warning' | 'danger' | 'neutral' | 'brand'
> = {
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

function RecentDocs({ docs }: { docs: EnterpriseDoc[] }) {
  return (
    <Card className="mb-6">
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-fg">
              Recent API documents
            </h2>
            <p className="text-sm text-fg-muted">
              The latest documents signed through your enterprise API keys.
            </p>
          </div>
        </div>
        {docs.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="No API documents yet"
            description="Documents signed through /public/sign will show up here."
          />
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-bg-inset"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-bg-elevated border border-border grid place-items-center text-fg-muted shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-fg truncate">
                      {d.original_file_name}
                    </div>
                    <div className="text-xs text-fg-subtle flex items-center gap-2">
                      <span>{fmtSize(d.file_size)}</span>
                      <span>·</span>
                      <span>{new Date(d.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <Badge tone={DOC_STATUS_TONE[d.status] || 'neutral'}>
                  {d.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
