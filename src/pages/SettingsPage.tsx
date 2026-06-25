import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  ExternalLink,
  Copy,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Webhook,
  Send,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/cn';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [form, setForm] = useState({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    phone_number: user?.phone_number ?? '',
  });
  const [saving, setSaving] = useState(false);

  // OAuth callback ping. After Google bounces the user back, the backend
  // redirects to /settings?integration_connected=google_drive — surface that
  // as a toast so the user sees the result.
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const connected = params.get('integration_connected');
    const error = params.get('integration_error');
    if (connected) {
      toast.success(`Connected ${connected.replace('_', ' ')}`);
      params.delete('integration_connected');
      setParams(params, { replace: true });
    }
    if (error) {
      toast.error(`Integration error: ${error}`);
      params.delete('integration_error');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  async function save() {
    setSaving(true);
    try {
      await updateUser(form);
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Manage your account and preferences." />

      <Card className="mb-6">
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-lg font-semibold text-fg">
                Profile
              </h2>
              <p className="text-sm text-fg-muted">
                This information is private and only used for your account.
              </p>
            </div>
            {user?.email_verified && (
              <Badge tone="success">Email verified</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                value={form.first_name ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, first_name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                value={form.last_name ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, last_name: e.target.value }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email ?? ''} disabled />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                value={form.phone_number ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone_number: e.target.value }))
                }
                placeholder="+1 555 000 0000"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={save} loading={saving}>
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent>
          <h2 className="font-display text-lg font-semibold text-fg mb-1">
            Account
          </h2>
          <p className="text-sm text-fg-muted mb-6">
            Manage your account-level actions.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl border border-border">
              <div>
                <div className="font-medium text-fg">Role</div>
                <div className="text-sm text-fg-muted capitalize">
                  {user?.role?.replace('_', ' ')}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl border border-border">
              <div>
                <div className="font-medium text-fg">Account status</div>
                <div className="text-sm text-fg-muted capitalize">
                  {user?.status?.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <IntegrationsCard />

      <WebhooksCard />
    </div>
  );
}

// ============================================================================
// Cloud integrations card
// ============================================================================
//
// Lists providers (Google Drive / Dropbox / OneDrive / 365). For each:
//   - If the server has OAuth keys but no connection → "Connect" button
//   - If connected → account email + "Disconnect" button
//   - If the server has no OAuth keys → "Not configured" disabled state
// Clicking "Connect" hits POST /integrations/cloud/<provider>/connect to get
// the authorize URL, then redirects the browser to it. Google bounces back
// to /settings with ?integration_connected=google_drive which fires a toast.

interface CloudProviderInfo {
  id: 'google_drive' | 'dropbox' | 'onedrive' | 'ms365';
  label: string;
  configured: boolean;
}

interface CloudConnection {
  id: string;
  provider: 'google_drive' | 'dropbox' | 'onedrive' | 'ms365';
  account_email: string | null;
  account_name: string | null;
  scopes: string[] | null;
  expires_at: string | null;
  created_at: string;
}

const PROVIDER_ICONS: Record<string, string> = {
  google_drive: '📁',
  dropbox: '📦',
  onedrive: '☁️',
  ms365: '🏢',
};

function IntegrationsCard() {
  const qc = useQueryClient();

  const { data: providers } = useQuery({
    queryKey: ['integrations', 'providers'],
    queryFn: async () => {
      const { data } = await api.get<CloudProviderInfo[]>(
        '/integrations/cloud/providers'
      );
      return data;
    },
  });

  const { data: connections, refetch } = useQuery({
    queryKey: ['integrations', 'connections'],
    queryFn: async () => {
      const { data } = await api.get<CloudConnection[]>(
        '/integrations/cloud/connections'
      );
      return data;
    },
  });

  const connectMap = new Map(
    (connections || []).map((c) => [c.provider, c])
  );

  const connect = useMutation({
    mutationFn: async (provider: string) => {
      const { data } = await api.post<{ authorize_url: string }>(
        `/integrations/cloud/${provider}/connect`
      );
      return data;
    },
    onSuccess: (data) => {
      // Full-page redirect to the OAuth provider so we don't lose state.
      window.location.href = data.authorize_url;
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Could not start OAuth');
    },
  });

  const disconnect = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/integrations/cloud/connections/${id}`);
    },
    onSuccess: () => {
      toast.success('Disconnected');
      refetch();
      qc.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  return (
    <Card className="mb-6">
      <CardContent>
        <div className="flex items-center gap-2 mb-1">
          <Cloud className="h-4 w-4 text-brand-400" />
          <h2 className="font-display text-lg font-semibold text-fg">
            Cloud integrations
          </h2>
        </div>
        <p className="text-sm text-fg-muted mb-5">
          Export signed documents to your preferred cloud storage. We only see
          files we create on your behalf.
        </p>

        <div className="space-y-2">
          {(providers || []).map((p) => {
            const conn = connectMap.get(p.id);
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-bg-inset"
              >
                <div className="h-10 w-10 rounded-xl bg-bg-elevated border border-border grid place-items-center text-lg shrink-0">
                  {PROVIDER_ICONS[p.id] || '☁️'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-fg flex items-center gap-2 flex-wrap">
                    {p.label}
                    {!p.configured && (
                      <Badge tone="neutral">Not configured</Badge>
                    )}
                    {conn && <Badge tone="success">Connected</Badge>}
                  </div>
                  {conn ? (
                    <div className="text-xs text-fg-subtle truncate">
                      {conn.account_email || conn.account_name || 'Connected account'}
                    </div>
                  ) : !p.configured ? (
                    <div className="text-xs text-fg-subtle">
                      Server-side OAuth credentials aren't set up.
                    </div>
                  ) : (
                    <div className="text-xs text-fg-subtle">
                      One-click connect via OAuth.
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {conn ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Disconnect ${p.label}? You'll need to re-authorize to export there again.`
                          )
                        ) {
                          disconnect.mutate(conn.id);
                        }
                      }}
                      loading={disconnect.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => connect.mutate(p.id)}
                      loading={connect.isPending}
                      disabled={!p.configured}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Webhooks card
// ============================================================================

interface WebhookEndpoint {
  id: string;
  url: string;
  name: string | null;
  events: string[] | null;
  status: 'active' | 'paused' | 'disabled';
  delivery_attempts: number;
  delivery_successes: number;
  delivery_failures: number;
  consecutive_failures: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_failure_reason: string | null;
  created_at: string;
}

interface NewWebhookResult extends WebhookEndpoint {
  secret: string;
}

function WebhooksCard() {
  const [showForm, setShowForm] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<NewWebhookResult | null>(
    null
  );

  const { data: endpoints, refetch } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const { data } = await api.get<WebhookEndpoint[]>('/webhooks');
      return data;
    },
  });

  const { data: eventTypes } = useQuery({
    queryKey: ['webhooks', 'event-types'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/webhooks/event-types');
      return data;
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/webhooks/${id}`),
    onSuccess: () => {
      toast.success('Webhook deleted');
      refetch();
    },
  });

  const toggle = useMutation({
    mutationFn: async (ep: WebhookEndpoint) => {
      const next = ep.status === 'active' ? 'paused' : 'active';
      await api.put(`/webhooks/${ep.id}`, { status: next });
    },
    onSuccess: () => refetch(),
  });

  const sendTest = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/webhooks/${id}/test`);
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.ok) {
        toast.success(`Test ping ok (HTTP ${data.status_code})`);
      } else {
        toast.error(
          `Test failed: ${data?.body?.slice(0, 100) || data?.status_code}`
        );
      }
      refetch();
    },
  });

  return (
    <>
      <Card className="mb-6">
        <CardContent>
          <div className="flex items-start justify-between mb-1 gap-3">
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-brand-400" />
              <h2 className="font-display text-lg font-semibold text-fg">
                Webhooks
              </h2>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setShowForm(true);
                setCreatedSecret(null);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add endpoint
            </Button>
          </div>
          <p className="text-sm text-fg-muted mb-5">
            Receive HTTP POSTs when documents are signed, declined, or
            completed. Every request is HMAC-SHA256 signed.
          </p>

          {showForm && (
            <NewWebhookForm
              eventTypes={eventTypes || []}
              onCancel={() => setShowForm(false)}
              onCreated={(created) => {
                setCreatedSecret(created);
                setShowForm(false);
                refetch();
              }}
            />
          )}

          {createdSecret && (
            <SecretReveal
              endpoint={createdSecret}
              onClose={() => setCreatedSecret(null)}
            />
          )}

          {!endpoints || endpoints.length === 0 ? (
            !showForm && (
              <p className="text-sm text-fg-muted italic text-center py-6">
                No webhooks configured yet.
              </p>
            )
          ) : (
            <div className="space-y-2">
              {endpoints.map((ep) => (
                <WebhookRow
                  key={ep.id}
                  endpoint={ep}
                  onTest={() => sendTest.mutate(ep.id)}
                  onToggle={() => toggle.mutate(ep)}
                  onDelete={() => {
                    if (window.confirm(`Delete webhook for ${ep.url}?`)) {
                      remove.mutate(ep.id);
                    }
                  }}
                  testPending={sendTest.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function WebhookRow({
  endpoint: ep,
  onTest,
  onToggle,
  onDelete,
  testPending,
}: {
  endpoint: WebhookEndpoint;
  onTest: () => void;
  onToggle: () => void;
  onDelete: () => void;
  testPending: boolean;
}) {
  const failing = ep.consecutive_failures > 0 && ep.status === 'active';
  return (
    <div className="rounded-xl border border-border bg-bg-inset p-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-fg truncate flex items-center gap-2 flex-wrap">
            {ep.name || ep.url}
            <Badge
              tone={
                ep.status === 'active'
                  ? failing
                    ? 'warning'
                    : 'success'
                  : ep.status === 'paused'
                    ? 'neutral'
                    : 'danger'
              }
            >
              {ep.status === 'active' && failing
                ? `${ep.consecutive_failures} failing`
                : ep.status}
            </Badge>
          </div>
          {ep.name && (
            <code className="text-[10px] text-fg-subtle font-mono truncate block mt-0.5">
              {ep.url}
            </code>
          )}
          <div className="text-[11px] text-fg-subtle mt-1">
            {ep.events && ep.events.length > 0
              ? `${ep.events.length} event${ep.events.length === 1 ? '' : 's'}`
              : 'all events'}
            {' · '}
            {ep.delivery_successes}/{ep.delivery_attempts} delivered
            {ep.last_success_at && (
              <>
                {' · last ok '}
                {new Date(ep.last_success_at).toLocaleString()}
              </>
            )}
          </div>
          {ep.status === 'disabled' && ep.last_failure_reason && (
            <div className="mt-2 text-[11px] text-danger flex items-start gap-1">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span className="truncate">
                Auto-disabled: {ep.last_failure_reason}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onTest}
            loading={testPending}
            title="Send a test ping"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            title={ep.status === 'active' ? 'Pause' : 'Resume'}
          >
            {ep.status === 'active' ? (
              <PauseCircle className="h-3.5 w-3.5" />
            ) : (
              <PlayCircle className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function NewWebhookForm({
  eventTypes,
  onCancel,
  onCreated,
}: {
  eventTypes: string[];
  onCancel: () => void;
  onCreated: (created: NewWebhookResult) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [url, setUrl] = useState('https://');
  const [name, setName] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [scope, setScope] = useState<'user' | 'enterprise'>('user');

  const canEnterprise =
    !!user?.enterprise_id &&
    (user.role === 'enterprise_admin' || user.role === 'super_admin');

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<NewWebhookResult>('/webhooks', {
        url,
        name: name.trim() || null,
        events: selectedEvents,
        scope,
      });
      return data;
    },
    onSuccess: onCreated,
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail || 'Could not create'),
  });

  // Group events into prefixes (document.*, participant.*, subscription.*)
  // for the picker UI.
  const grouped = eventTypes.reduce<Record<string, string[]>>((acc, e) => {
    const prefix = e.split('.')[0];
    (acc[prefix] = acc[prefix] || []).push(e);
    return acc;
  }, {});

  return (
    <div className="rounded-2xl border border-brand-500/30 bg-gradient-brand-soft p-4 mb-5">
      <h3 className="text-sm font-semibold text-fg mb-3">New webhook</h3>
      <div className="space-y-3">
        <div>
          <Label htmlFor="wh-url">URL</Label>
          <Input
            id="wh-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-server.com/webhooks/affixai"
          />
          <p className="text-[10px] text-fg-subtle mt-1">
            Must be https. We'll POST signed JSON here for each subscribed event.
          </p>
        </div>
        <div>
          <Label htmlFor="wh-name">Name (optional)</Label>
          <Input
            id="wh-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Production receiver, Slack bridge…"
          />
        </div>
        {canEnterprise && (
          <div>
            <Label>Scope</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('user')}
                className={cn(
                  'text-left p-2 rounded-lg border transition',
                  scope === 'user'
                    ? 'border-brand-500/40 bg-brand-500/5'
                    : 'border-border bg-bg-base hover:border-fg-muted/30'
                )}
              >
                <div className="text-xs font-medium text-fg">Just me</div>
                <div className="text-[10px] text-fg-subtle">My events only.</div>
              </button>
              <button
                type="button"
                onClick={() => setScope('enterprise')}
                className={cn(
                  'text-left p-2 rounded-lg border transition',
                  scope === 'enterprise'
                    ? 'border-brand-500/40 bg-brand-500/5'
                    : 'border-border bg-bg-base hover:border-fg-muted/30'
                )}
              >
                <div className="text-xs font-medium text-fg">Whole org</div>
                <div className="text-[10px] text-fg-subtle">
                  Every member's events.
                </div>
              </button>
            </div>
          </div>
        )}
        <div>
          <Label>Events</Label>
          <p className="text-[10px] text-fg-subtle mb-2">
            Leave empty to receive ALL events.
          </p>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {Object.entries(grouped).map(([prefix, events]) => (
              <div key={prefix}>
                <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold mb-1">
                  {prefix}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {events.map((e) => (
                    <label
                      key={e}
                      className="flex items-center gap-2 text-xs text-fg cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(e)}
                        onChange={(ev) => {
                          setSelectedEvents((prev) =>
                            ev.target.checked
                              ? [...prev, e]
                              : prev.filter((x) => x !== e)
                          );
                        }}
                        className="accent-brand-500"
                      />
                      <code className="font-mono">{e}</code>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={create.isPending}>
          Cancel
        </Button>
        <Button
          onClick={() => create.mutate()}
          loading={create.isPending}
          disabled={!url.startsWith('https://')}
        >
          Create webhook
        </Button>
      </div>
    </div>
  );
}

function SecretReveal({
  endpoint,
  onClose,
}: {
  endpoint: NewWebhookResult;
  onClose: () => void;
}) {
  return (
    <div className="rounded-2xl border border-success/30 bg-success/5 p-4 mb-5">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <span className="text-sm font-medium text-fg">
          Webhook created — copy the secret now, you won't see it again
        </span>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <code className="flex-1 px-3 py-2 rounded-lg bg-bg-elevated border border-border text-xs font-mono text-fg overflow-auto">
          {endpoint.secret}
        </code>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(endpoint.secret);
            toast.success('Copied to clipboard');
          }}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="mt-3 text-xs text-fg-muted space-y-1">
        <p>
          Verify each delivery: compute{' '}
          <code className="font-mono">HMAC-SHA256(secret, "&lt;X-AffixAI-Timestamp&gt;." + body)</code>{' '}
          and compare with the <code className="font-mono">X-AffixAI-Signature</code> header
          (prefixed with <code className="font-mono">sha256=</code>).
        </p>
        <p>Reject signatures older than 5 minutes to prevent replays.</p>
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
