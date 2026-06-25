import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  FileText,
  Sparkles,
  Edit3,
  Check,
  X,
  Loader2,
  ChevronRight,
  CloudOff,
  UploadCloud,
  Plus,
  Trash2,
  Pencil,
  Type,
  Hash,
  File as FileIcon,
  FolderPlus,
  Download,
  Building2,
  User as UserIcon,
  Tag,
  Shield,
  Briefcase,
  Heart,
  Car,
  Home,
  Award,
  Bookmark,
  Globe,
  Phone,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/cn';
import type {
  SegmentRegistryEntry,
  SegmentData,
  ExtractPreview,
  VaultSegment,
  FieldRegistryEntry,
  VaultEntryOut,
} from '@/types';

// `active` can either be a built-in VaultSegment string OR a custom-section
// id prefixed with "custom:" so the sidebar knows what to render.
type ActiveSelection =
  | { kind: 'builtin'; segment: VaultSegment }
  | { kind: 'custom'; sectionId: string };

interface CustomFieldOut {
  id: string;
  section_id: string;
  name: string;
  key: string;
  field_type: 'text' | 'number' | 'file';
  aliases: string[] | null;
  placeholder: string | null;
  required: boolean;
  display_order: number;
  created_at: string;
  value?: string | null;
  has_value: boolean;
  file_download_url?: string | null;
}

interface CustomSectionOut {
  id: string;
  name: string;
  key: string;
  icon: string | null;
  display_order: number;
  scope: 'user' | 'enterprise';
  enterprise_id: string | null;
  can_edit: boolean;
  created_at: string;
  fields: CustomFieldOut[];
}

export default function DataVaultPage() {
  const qc = useQueryClient();
  const [active, setActive] = useState<ActiveSelection>({
    kind: 'builtin',
    segment: 'personal',
  });
  const [showNewSection, setShowNewSection] = useState(false);

  const { data: schema } = useQuery({
    queryKey: ['vault', 'schema'],
    queryFn: async () => {
      const { data } = await api.get<SegmentRegistryEntry[]>(
        '/data-vault/schema'
      );
      return data;
    },
  });

  const { data: segments, isLoading } = useQuery({
    queryKey: ['vault', 'segments'],
    queryFn: async () => {
      const { data } = await api.get<SegmentData[]>('/data-vault/segments');
      return data;
    },
  });

  const { data: customSections } = useQuery({
    queryKey: ['vault', 'custom-sections'],
    queryFn: async () => {
      const { data } = await api.get<CustomSectionOut[]>(
        '/data-vault/custom/sections'
      );
      return data;
    },
  });

  const activeSchema =
    active.kind === 'builtin'
      ? schema?.find((s) => s.segment === active.segment)
      : undefined;
  const activeData =
    active.kind === 'builtin'
      ? segments?.find((s) => s.segment === active.segment)
      : undefined;
  const activeCustomSection =
    active.kind === 'custom'
      ? customSections?.find((s) => s.id === active.sectionId)
      : undefined;

  return (
    <div>
      <PageHeader
        title="Data Vault"
        description="Save your data once. We'll use it to auto-fill every document you sign."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Segment list */}
        <Card>
          <div className="p-3">
            {isLoading || !schema ? (
              Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-12 mb-1" />
              ))
            ) : (
              <>
                {schema.map((s) => {
                  const count = segments?.find((d) => d.segment === s.segment)
                    ?.fields
                    ? Object.keys(
                        segments.find((d) => d.segment === s.segment)!.fields
                      ).length
                    : 0;
                  const isActive =
                    active.kind === 'builtin' && active.segment === s.segment;
                  return (
                    <button
                      key={s.segment}
                      onClick={() =>
                        setActive({ kind: 'builtin', segment: s.segment })
                      }
                      className={cn(
                        'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm transition',
                        isActive
                          ? 'bg-gradient-brand-soft border border-brand-500/20 text-fg'
                          : 'text-fg-muted hover:bg-bg-inset hover:text-fg'
                      )}
                    >
                      <div className="text-left">
                        <div className="font-medium">{s.label}</div>
                        <div className="text-xs text-fg-subtle">
                          {count} / {s.fields.length} saved
                        </div>
                      </div>
                      <ChevronRight
                        className={cn(
                          'h-4 w-4',
                          isActive ? 'text-brand-400' : 'text-fg-subtle'
                        )}
                      />
                    </button>
                  );
                })}

                {/* Divider between built-in segments and user-created ones. */}
                {customSections && customSections.length > 0 && (
                  <div className="mt-3 mb-2 px-3 text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">
                    Custom
                  </div>
                )}
                {customSections?.map((s) => {
                  const filled = s.fields.filter((f) => f.has_value).length;
                  const isActive =
                    active.kind === 'custom' && active.sectionId === s.id;
                  const isEnterprise = s.scope === 'enterprise';
                  const IconCmp =
                    (s.icon && SECTION_ICONS[s.icon]) || Tag;
                  return (
                    <button
                      key={s.id}
                      onClick={() =>
                        setActive({ kind: 'custom', sectionId: s.id })
                      }
                      className={cn(
                        'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm transition',
                        isActive
                          ? 'bg-gradient-brand-soft border border-brand-500/20 text-fg'
                          : 'text-fg-muted hover:bg-bg-inset hover:text-fg'
                      )}
                    >
                      <div className="text-left min-w-0">
                        <div className="font-medium truncate flex items-center gap-1.5">
                          <IconCmp
                            className={cn(
                              'h-3.5 w-3.5 shrink-0',
                              isActive ? 'text-brand-400' : 'text-fg-subtle'
                            )}
                          />
                          {s.name}
                          {isEnterprise && (
                            <Building2
                              className="h-3 w-3 text-brand-400 shrink-0"
                              aria-label="enterprise-wide section"
                            />
                          )}
                        </div>
                        <div className="text-xs text-fg-subtle">
                          {filled} / {s.fields.length} saved
                        </div>
                      </div>
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isActive ? 'text-brand-400' : 'text-fg-subtle'
                        )}
                      />
                    </button>
                  );
                })}

                {/* + Add section */}
                <button
                  onClick={() => setShowNewSection(true)}
                  className="mt-2 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-fg-muted hover:bg-bg-inset hover:text-fg transition border border-dashed border-border"
                >
                  <FolderPlus className="h-4 w-4" />
                  Add section
                </button>
              </>
            )}
          </div>
        </Card>

        {/* Segment editor — keyed on selection so state resets cleanly when
            switching. CRITICAL: we don't mount SegmentEditor until the
            `segments` query has finished its first load. Otherwise we'd
            race: the editor mounts with data=undefined, initializes its
            local `values` to {}, and when `segments` resolves moments
            later the autosave diff thinks the user just cleared every
            field — and saves nulls back. That's what was silently wiping
            Personal info every so often. */}
        {activeSchema && (
          activeSchema.multi_entry ? (
            <MultiEntryEditor
              key={`m-${activeSchema.segment}`}
              schema={activeSchema}
            />
          ) : segments === undefined ? (
            <Card>
              <CardContent>
                <Skeleton className="h-12 mb-5" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <SegmentEditor
              key={`b-${activeSchema.segment}`}
              schema={activeSchema}
              data={activeData}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ['vault', 'segments'] });
              }}
            />
          )
        )}
        {activeCustomSection && (
          <CustomSectionEditor
            key={`c-${activeCustomSection.id}`}
            section={activeCustomSection}
            onChanged={() => {
              qc.invalidateQueries({ queryKey: ['vault', 'custom-sections'] });
            }}
            onDeleted={() => {
              setActive({ kind: 'builtin', segment: 'personal' });
              qc.invalidateQueries({ queryKey: ['vault', 'custom-sections'] });
            }}
          />
        )}
      </div>

      {showNewSection && (
        <NewSectionModal
          onClose={() => setShowNewSection(false)}
          onCreated={(newSection) => {
            setShowNewSection(false);
            qc.invalidateQueries({ queryKey: ['vault', 'custom-sections'] });
            setActive({ kind: 'custom', sectionId: newSection.id });
          }}
        />
      )}
    </div>
  );
}

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

function SegmentEditor({
  schema,
  data,
  onSaved,
}: {
  schema: SegmentRegistryEntry;
  data?: SegmentData;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<'manual' | 'extract'>('manual');
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(data?.fields ?? {}).map(([k, v]) => [k, v.value])
    )
  );
  const [status, setStatus] = useState<SaveStatus>('idle');
  const isDirtyRef = useRef(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function diffPayload(): Record<string, string | null> {
    const payload: Record<string, string | null> = {};
    for (const f of schema.fields) {
      const current = data?.fields[f.name]?.value ?? '';
      const next = values[f.name] ?? '';
      if (current !== next) {
        payload[f.name] = next === '' ? null : next;
      }
    }
    return payload;
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = diffPayload();
      if (Object.keys(payload).length === 0) return null;
      const { data: res } = await api.put(
        `/data-vault/segments/${schema.segment}`,
        { fields: payload, source: 'user_input' }
      );
      return res;
    },
    onMutate: () => setStatus('saving'),
    onSuccess: (res) => {
      if (res === null) {
        setStatus('idle');
        return;
      }
      setStatus('saved');
      isDirtyRef.current = false;
      onSaved();
      // Fade the "Saved" indicator back to idle after a couple seconds.
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setStatus('idle'), 2000);
    },
    onError: (err: any) => {
      setStatus('error');
      toast.error(err?.response?.data?.detail || 'Could not save — your edits are unsaved');
    },
  });

  // Debounced auto-save: schedule a save 800ms after the user stops typing.
  // Every keystroke clears the previous timer (via cleanup) and starts a new one.
  useEffect(() => {
    const payload = diffPayload();
    if (Object.keys(payload).length === 0) {
      if (isDirtyRef.current) {
        // Values came back into sync (after a successful save). No-op.
        isDirtyRef.current = false;
      }
      return;
    }
    isDirtyRef.current = true;
    setStatus('dirty');
    const id = setTimeout(() => {
      save.mutate();
    }, 800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, data]);

  // Cleanup the "Saved" fade timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  return (
    <Card>
      <CardContent>
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row mb-1">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-xl font-bold text-fg">
                {schema.label}
              </h2>
              <SaveBadge status={status} />
            </div>
            <p className="text-sm text-fg-muted">
              All fields are optional. Changes save automatically.
            </p>
          </div>
          <div className="inline-flex p-1 rounded-xl bg-bg-inset border border-border shrink-0">
            {(['manual', 'extract'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'px-3 h-8 rounded-lg text-xs font-medium transition flex items-center gap-1.5',
                  mode === m
                    ? 'bg-bg-elevated text-fg shadow-card'
                    : 'text-fg-muted hover:text-fg'
                )}
              >
                {m === 'manual' ? (
                  <Edit3 className="h-3.5 w-3.5" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {m === 'manual' ? 'Manual entry' : 'Extract from file'}
              </button>
            ))}
          </div>
        </div>

        {mode === 'manual' ? (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {schema.fields.map((f) => (
              <FieldEditor
                key={f.name}
                field={f}
                value={values[f.name] ?? ''}
                source={data?.fields[f.name]?.source}
                onChange={(v) =>
                  setValues((prev) => ({ ...prev, [f.name]: v }))
                }
              />
            ))}
          </div>
        ) : (
          <ExtractFlow segment={schema.segment} onApplied={onSaved} />
        )}
      </CardContent>
    </Card>
  );
}

// ---- Multi-entry editor ----------------------------------------------------
//
// Sections like Education and Employment are LIST-shaped — one degree per
// row, one job per row. We render them as a stack of expandable cards with
// "Add another" at the bottom. Exactly one entry per section can be flagged
// "current" — that's the one auto-affix prefers when filling docs.

function MultiEntryEditor({ schema }: { schema: SegmentRegistryEntry }) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: entries, isLoading } = useQuery({
    queryKey: ['vault', 'entries', schema.segment],
    queryFn: async () => {
      const { data } = await api.get<VaultEntryOut[]>(
        `/data-vault/entries/${schema.segment}`
      );
      return data;
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['vault', 'entries', schema.segment] });
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row mb-4">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-fg">
              {schema.label}
            </h2>
            <p className="text-sm text-fg-muted">
              Add one entry per {schema.segment === 'education' ? 'qualification' : 'role'}.
              Mark the most relevant one as <strong>current</strong> — that's
              the one we'll use to auto-fill documents by default.
            </p>
          </div>
          {!creating && (
            <Button
              onClick={() => setCreating(true)}
              size="sm"
              className="shrink-0"
            >
              <Plus className="h-4 w-4" />
              Add {schema.segment === 'education' ? 'qualification' : 'role'}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : (
          <div className="space-y-3">
            {creating && (
              <EntryCard
                schema={schema}
                entry={null}
                forceOpen
                onClose={() => setCreating(false)}
                onSaved={() => {
                  setCreating(false);
                  invalidate();
                }}
              />
            )}
            {(entries ?? []).map((e) => (
              <EntryCard
                key={e.id}
                schema={schema}
                entry={e}
                onSaved={invalidate}
                onDeleted={invalidate}
              />
            ))}
            {!creating && (entries ?? []).length === 0 && (
              <div className="text-center py-12 text-fg-muted">
                <FileText className="h-10 w-10 mx-auto mb-3 text-fg-subtle" />
                <p className="text-sm">
                  No entries yet — add your{' '}
                  {schema.segment === 'education'
                    ? 'degrees, diplomas, and certifications'
                    : 'past and current roles'}
                  .
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EntryCard({
  schema,
  entry,
  forceOpen = false,
  onClose,
  onSaved,
  onDeleted,
}: {
  schema: SegmentRegistryEntry;
  entry: VaultEntryOut | null;
  forceOpen?: boolean;
  onClose?: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  // Brand-new entries (entry===null) start in the open state. Existing entries
  // start collapsed, with the summary visible.
  const [open, setOpen] = useState<boolean>(forceOpen || entry === null);
  const [values, setValues] = useState<Record<string, string>>(
    () => ({ ...(entry?.fields ?? {}) })
  );
  const [isCurrent, setIsCurrent] = useState<boolean>(entry?.is_current ?? false);
  const [saving, setSaving] = useState(false);

  function field(name: string): string {
    return values[name] ?? '';
  }
  function setField(name: string, v: string) {
    setValues((p) => ({ ...p, [name]: v }));
  }

  // The "currently undergoing / currently working here" toggle is exposed as
  // a real form field (is_current of the schema). Many of the fields are
  // date fields — when currently undergoing/working, the end-date should
  // be cleared because there's no end yet.
  function onCurrentlyToggle(v: boolean) {
    setField('is_current', v ? 'true' : '');
    if (v) {
      setField('end_date', '');
      setField('employment_end_date', '');
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        fields: values,
        is_current: isCurrent,
        sort_order: entry?.sort_order ?? null,
      };
      if (entry) {
        const { data } = await api.put(
          `/data-vault/entries/${schema.segment}/${entry.id}`,
          payload
        );
        return data;
      }
      const { data } = await api.post(
        `/data-vault/entries/${schema.segment}`,
        payload
      );
      return data;
    },
    onMutate: () => setSaving(true),
    onSuccess: () => {
      setSaving(false);
      toast.success(entry ? 'Updated' : 'Added');
      onSaved();
    },
    onError: (err: any) => {
      setSaving(false);
      toast.error(
        err?.response?.data?.detail || 'Could not save — please try again'
      );
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!entry) return;
      await api.delete(`/data-vault/entries/${schema.segment}/${entry.id}`);
    },
    onSuccess: () => {
      toast.success('Removed');
      onDeleted?.();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Could not delete');
    },
  });

  // Pick a sensible summary title for the collapsed view. We try the
  // primary identity field of each section, falling back to whichever field
  // has the longest value so we always show *something* useful.
  const summaryTitle =
    field('institution_name') ||
    field('employer_name') ||
    field('job_title') ||
    Object.values(values).find((v) => v && v.length > 1) ||
    'New entry';
  const summarySub =
    [field('course'), field('qualification')].filter(Boolean).join(' · ') ||
    [field('job_title'), field('city')].filter(Boolean).join(' · ') ||
    [field('start_date'), field('end_date') || (isCurrent ? 'Present' : '')]
      .filter(Boolean)
      .join(' — ');

  return (
    <div className="rounded-2xl border border-border bg-bg-elevated overflow-hidden">
      {/* Header / collapsed summary */}
      <button
        type="button"
        onClick={() => {
          if (forceOpen) return;
          setOpen((o) => !o);
        }}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-inset/40 transition"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-fg truncate">{summaryTitle}</span>
            {isCurrent && (
              <Badge tone="success">
                <Check className="h-3 w-3" />
                Current
              </Badge>
            )}
          </div>
          {summarySub && (
            <div className="text-xs text-fg-subtle truncate">{summarySub}</div>
          )}
        </div>
        <ChevronRight
          className={cn(
            'h-4 w-4 text-fg-subtle transition-transform',
            open && 'rotate-90'
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {schema.fields
              .filter((f) => f.name !== 'is_current')
              .map((f) => (
                <FieldEditor
                  key={f.name}
                  field={f}
                  value={field(f.name)}
                  onChange={(v) => setField(f.name, v)}
                />
              ))}
          </div>

          {/* "Currently undergoing / Currently working here" toggle */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-bg-inset/40 border border-border px-4 py-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={field('is_current') === 'true'}
                onChange={(e) => onCurrentlyToggle(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-brand-500"
              />
              <div>
                <div className="text-sm font-medium text-fg">
                  {schema.segment === 'education'
                    ? 'Currently undergoing'
                    : 'Currently working here'}
                </div>
                <div className="text-xs text-fg-subtle">
                  Clears the end date — leave checked while it's ongoing.
                </div>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => setIsCurrent(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-brand-500"
              />
              <div>
                <div className="text-sm font-medium text-fg">
                  Use this for auto-fill
                </div>
                <div className="text-xs text-fg-subtle">
                  The one we'll plug into documents by default.
                </div>
              </div>
            </label>
          </div>

          {/* Action row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              {entry && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remove this ${schema.segment === 'education' ? 'qualification' : 'role'}? This cannot be undone.`
                      )
                    ) {
                      remove.mutate();
                    }
                  }}
                  className="text-danger hover:bg-danger/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(!entry || forceOpen) && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              )}
              <Button
                onClick={() => save.mutate()}
                disabled={saving}
                size="sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {entry ? 'Save' : 'Add entry'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  const config = {
    dirty: {
      icon: <UploadCloud className="h-3 w-3" />,
      text: 'Unsaved',
      tone: 'neutral' as const,
    },
    saving: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      text: 'Saving…',
      tone: 'neutral' as const,
    },
    saved: {
      icon: <Check className="h-3 w-3" />,
      text: 'Saved',
      tone: 'success' as const,
    },
    error: {
      icon: <CloudOff className="h-3 w-3" />,
      text: "Couldn't save",
      tone: 'danger' as const,
    },
  } as const;
  const c = config[status as Exclude<SaveStatus, 'idle'>];
  return (
    <Badge tone={c.tone}>
      {c.icon}
      {c.text}
    </Badge>
  );
}

function FieldEditor({
  field,
  value,
  source,
  onChange,
}: {
  field: FieldRegistryEntry;
  value: string;
  source?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label htmlFor={field.name} className="mb-0">
          {field.label}
        </Label>
        {source === 'document_extraction' && (
          <Badge tone="brand">
            <Sparkles className="h-3 w-3" />
            extracted
          </Badge>
        )}
      </div>
      {field.type === 'textarea' ? (
        <Textarea
          id={field.name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? ''}
        />
      ) : field.type === 'select' && field.options ? (
        <Select
          id={field.name}
          options={field.options}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Select…"
        />
      ) : (
        <Input
          id={field.name}
          type={
            field.type === 'date'
              ? 'date'
              : field.type === 'email'
                ? 'email'
                : field.type === 'phone'
                  ? 'tel'
                  : field.type === 'number'
                    ? 'number'
                    : 'text'
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? ''}
        />
      )}
      {field.description && (
        <p className="mt-1 text-xs text-fg-subtle">{field.description}</p>
      )}
    </div>
  );
}

function ExtractFlow({
  segment,
  onApplied,
}: {
  segment: VaultSegment;
  onApplied: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ExtractPreview | null>(null);

  const upload = useMutation({
    mutationFn: async (selected: File) => {
      const form = new FormData();
      form.append('file', selected);
      form.append('segment', segment);
      const { data } = await api.post<ExtractPreview>(
        '/data-vault/extract',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data;
    },
    onSuccess: (data) => {
      setPreview(data);
      if (data.error) {
        // OCR or pipeline error — server returned 200 with an error message.
        toast.error(`Extraction error: ${data.error}`);
        return;
      }
      const matched = Object.values(data.segments[segment] ?? {}).length;
      if (matched === 0) {
        toast(
          'No fields matched. Try a clearer document or fill manually.'
        );
      } else {
        toast.success(
          `${matched} field${matched > 1 ? 's' : ''} extracted — review below`
        );
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Extraction failed');
    },
  });

  const apply = useMutation({
    mutationFn: async () => {
      if (!preview) return;
      const fields = Object.fromEntries(
        Object.entries(preview.segments[segment] ?? {}).map(([k, v]) => [
          k,
          v.value,
        ])
      );
      const { data } = await api.post('/data-vault/extract/apply', {
        document_id: preview.document_id,
        segments: { [segment]: fields },
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Saved to vault');
      setPreview(null);
      setFile(null);
      onApplied();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Could not save');
    },
  });

  const matched = preview?.segments[segment] ?? {};

  return (
    <div className="mt-6">
      {!preview ? (
        <div
          className="rounded-2xl border-2 border-dashed border-border p-10 text-center hover:border-brand-500/40 transition cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFile(f);
                upload.mutate(f);
              }
            }}
          />
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-brand-soft grid place-items-center text-brand-400 mb-3">
            {upload.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
          </div>
          <p className="font-medium text-fg">
            {upload.isPending
              ? `Reading ${file?.name}…`
              : 'Drop a PDF or image to extract fields'}
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            We'll OCR it and pre-fill what we recognize. You confirm before saving.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-fg-muted">
                Review the extracted values. Edit anything that looks off.
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setPreview(null);
                setFile(null);
              }}
            >
              <X className="h-4 w-4" />
              Start over
            </Button>
          </div>

          {preview.error ? (
            <div className="py-8 px-4 text-center rounded-xl border border-danger/30 bg-danger/5">
              <p className="text-sm font-medium text-fg">
                Extraction couldn't run
              </p>
              <p className="mt-1 text-xs text-fg-muted max-w-md mx-auto">
                {preview.error}
              </p>
              {preview.error.toLowerCase().includes('tesseract') && (
                <p className="mt-3 text-xs text-fg-muted">
                  On the server: <code className="px-1.5 py-0.5 rounded bg-bg-elevated border border-border">brew install tesseract poppler</code>
                </p>
              )}
            </div>
          ) : Object.keys(matched).length === 0 ? (
            <p className="text-sm text-fg-muted py-8 text-center">
              Nothing recognized in this segment. Try a clearer image, or use
              manual entry on the left tab.
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(matched).map(([fieldName, ext]) => (
                <ExtractRow
                  key={fieldName}
                  fieldName={fieldName}
                  extracted={ext}
                  segment={segment}
                />
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button
              onClick={() => apply.mutate()}
              loading={apply.isPending}
              disabled={Object.keys(matched).length === 0}
            >
              <Check className="h-4 w-4" />
              Save to vault
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExtractRow({
  fieldName,
  extracted,
  segment: _segment,
}: {
  fieldName: string;
  extracted: { value: string; confidence: number; source_label: string };
  segment: VaultSegment;
}) {
  const conf = Math.round(extracted.confidence * 100);
  const tone: 'success' | 'warning' | 'neutral' =
    conf >= 90 ? 'success' : conf >= 70 ? 'warning' : 'neutral';
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-fg">
            {fieldName.replace(/_/g, ' ')}
          </span>
          <Badge tone={tone}>{conf}%</Badge>
          <span className="text-xs text-fg-subtle">
            from "{extracted.source_label}"
          </span>
        </div>
        <div className="text-sm text-fg-muted bg-bg-inset rounded-lg px-3 py-2 border border-border">
          {extracted.value}
        </div>
      </div>
    </div>
  );
}


// =============================================================================
// Custom sections + fields
// =============================================================================
//
// User-defined sections live alongside the built-in vault. Values are written
// into the same /data-vault/segments/{segment}/{field} pipeline as built-in
// fields, with `segment = "custom:<key>"`. File-typed fields use a dedicated
// upload endpoint because they're not text values.

// A small palette of Lucide icon names the user can pick for a section.
// The values match Lucide identifiers; we render them via SECTION_ICONS.
const SECTION_ICON_PALETTE: { id: string; label: string; icon: any }[] = [
  { id: 'shield', label: 'Shield', icon: Shield },
  { id: 'briefcase', label: 'Briefcase', icon: Briefcase },
  { id: 'heart', label: 'Heart', icon: Heart },
  { id: 'car', label: 'Car', icon: Car },
  { id: 'home', label: 'Home', icon: Home },
  { id: 'award', label: 'Award', icon: Award },
  { id: 'bookmark', label: 'Bookmark', icon: Bookmark },
  { id: 'globe', label: 'Globe', icon: Globe },
  { id: 'phone', label: 'Phone', icon: Phone },
  { id: 'mail', label: 'Mail', icon: Mail },
];

// Lookup by id → component (used by sidebar rendering).
const SECTION_ICONS: Record<string, any> = Object.fromEntries(
  SECTION_ICON_PALETTE.map((e) => [e.id, e.icon])
);

function NewSectionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (s: CustomSectionOut) => void;
}) {
  const currentUser = useAuthStore((s) => s.user);
  const [name, setName] = useState('');
  // Enterprise scope is only relevant for enterprise admins. For everyone
  // else we don't render the picker — the section is always user-scope.
  const canPickScope =
    !!currentUser?.enterprise_id &&
    (currentUser.role === 'enterprise_admin' ||
      currentUser.role === 'super_admin');
  const [scope, setScope] = useState<'user' | 'enterprise'>('user');
  const [icon, setIcon] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<CustomSectionOut>(
        '/data-vault/custom/sections',
        { name, scope, icon }
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Section "${data.name}" created`);
      onCreated(data);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Could not create section');
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !create.isPending && onClose()}
    >
      <div
        className="bg-bg-elevated border border-border rounded-2xl shadow-card max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-gradient-brand grid place-items-center text-white shrink-0">
            <FolderPlus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-fg">
              New section
            </h3>
            <p className="text-xs text-fg-muted">
              Group related fields — e.g. "Insurance", "Vehicle", "Memberships".
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="sec-name">Name</Label>
            <Input
              id="sec-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Insurance"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) create.mutate();
              }}
            />
          </div>

          {/* Icon picker — purely cosmetic but helps the section stand out
              in the sidebar and email templates. */}
          <div>
            <Label>Icon (optional)</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIcon(null)}
                className={cn(
                  'h-9 w-9 rounded-lg border grid place-items-center transition',
                  icon === null
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                    : 'border-border bg-bg-base text-fg-muted hover:text-fg'
                )}
                title="No icon"
              >
                <X className="h-4 w-4" />
              </button>
              {SECTION_ICON_PALETTE.map((entry) => {
                const Icon = entry.icon;
                const active = icon === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setIcon(entry.id)}
                    className={cn(
                      'h-9 w-9 rounded-lg border grid place-items-center transition',
                      active
                        ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                        : 'border-border bg-bg-base text-fg-muted hover:text-fg'
                    )}
                    title={entry.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scope picker — only enterprise admins see this. Members of an
              enterprise (non-admins) implicitly create user-scope sections. */}
          {canPickScope && (
            <div>
              <Label>Scope</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScope('user')}
                  className={cn(
                    'text-left p-3 rounded-xl border transition',
                    scope === 'user'
                      ? 'border-brand-500/40 bg-brand-500/5'
                      : 'border-border bg-bg-base hover:border-fg-muted/30'
                  )}
                >
                  <UserIcon
                    className={cn(
                      'h-4 w-4 mb-1',
                      scope === 'user' ? 'text-brand-400' : 'text-fg-muted'
                    )}
                  />
                  <div className="text-sm font-medium text-fg">Just me</div>
                  <div className="text-[10px] text-fg-subtle leading-snug">
                    Only you see this section.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setScope('enterprise')}
                  className={cn(
                    'text-left p-3 rounded-xl border transition',
                    scope === 'enterprise'
                      ? 'border-brand-500/40 bg-brand-500/5'
                      : 'border-border bg-bg-base hover:border-fg-muted/30'
                  )}
                >
                  <Building2
                    className={cn(
                      'h-4 w-4 mb-1',
                      scope === 'enterprise' ? 'text-brand-400' : 'text-fg-muted'
                    )}
                  />
                  <div className="text-sm font-medium text-fg">Whole org</div>
                  <div className="text-[10px] text-fg-subtle leading-snug">
                    All members see + fill their own values.
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={create.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate()}
            loading={create.isPending}
            disabled={!name.trim()}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}

function NewFieldModal({
  sectionId,
  onClose,
  onCreated,
}: {
  sectionId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'file'>(
    'text'
  );
  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(
        `/data-vault/custom/sections/${sectionId}/fields`,
        { name, field_type: fieldType }
      );
      return data;
    },
    onSuccess: () => {
      toast.success(`Field "${name}" added`);
      onCreated();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Could not add field');
    },
  });

  const types: {
    value: 'text' | 'number' | 'file';
    label: string;
    description: string;
    icon: typeof Type;
  }[] = [
    {
      value: 'text',
      label: 'Text',
      description: 'Any string — names, IDs, notes',
      icon: Type,
    },
    {
      value: 'number',
      label: 'Number',
      description: 'Numeric — amounts, ages, counts',
      icon: Hash,
    },
    {
      value: 'file',
      label: 'File',
      description: 'PDF, image, doc — stored encrypted',
      icon: FileIcon,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !create.isPending && onClose()}
    >
      <div
        className="bg-bg-elevated border border-border rounded-2xl shadow-card max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-gradient-brand grid place-items-center text-white shrink-0">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-fg">
              New field
            </h3>
            <p className="text-xs text-fg-muted">
              We'll auto-fill this in forms that ask for it.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="fld-name">Name</Label>
            <Input
              id="fld-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Policy Number"
              autoFocus
            />
          </div>

          <div>
            <Label>Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {types.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setFieldType(t.value)}
                  className={cn(
                    'text-left p-3 rounded-xl border transition',
                    fieldType === t.value
                      ? 'border-brand-500/40 bg-brand-500/5'
                      : 'border-border bg-bg-base hover:border-fg-muted/30'
                  )}
                >
                  <t.icon
                    className={cn(
                      'h-4 w-4 mb-1',
                      fieldType === t.value ? 'text-brand-400' : 'text-fg-muted'
                    )}
                  />
                  <div className="text-sm font-medium text-fg">{t.label}</div>
                  <div className="text-[10px] text-fg-subtle leading-snug">
                    {t.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={create.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate()}
            loading={create.isPending}
            disabled={!name.trim()}
          >
            Add field
          </Button>
        </div>
      </div>
    </div>
  );
}

function CustomSectionEditor({
  section,
  onChanged,
  onDeleted,
}: {
  section: CustomSectionOut;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [showNewField, setShowNewField] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(section.name);

  const rename = useMutation({
    mutationFn: async () => {
      await api.put(`/data-vault/custom/sections/${section.id}`, {
        name: newName,
      });
    },
    onSuccess: () => {
      setRenaming(false);
      onChanged();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Rename failed');
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      await api.delete(`/data-vault/custom/sections/${section.id}`);
    },
    onSuccess: () => {
      toast.success(`Deleted "${section.name}"`);
      onDeleted();
    },
  });

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-5 gap-3">
          <div className="min-w-0 flex-1">
            {renaming ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={() => rename.mutate()}
                  loading={rename.isPending}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNewName(section.name);
                    setRenaming(false);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <h2 className="font-display text-xl font-bold text-fg truncate flex items-center gap-2 flex-wrap">
                {section.name}
                {section.scope === 'enterprise' && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/30 rounded px-1.5 py-0.5"
                    title="Shared with everyone in your enterprise"
                  >
                    <Building2 className="h-3 w-3" />
                    Org-wide
                  </span>
                )}
                {section.can_edit && (
                  <button
                    onClick={() => setRenaming(true)}
                    className="text-fg-subtle hover:text-fg"
                    title="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </h2>
            )}
            <p className="text-xs text-fg-subtle mt-1">
              {section.fields.length} field
              {section.fields.length === 1 ? '' : 's'} ·{' '}
              {section.fields.filter((f) => f.has_value).length} saved
              {!section.can_edit && (
                <span className="ml-2 text-fg-muted italic">
                  · Read-only (admin-managed)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {section.can_edit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (
                    window.confirm(
                      section.scope === 'enterprise'
                        ? `Delete the enterprise-wide section "${section.name}" and ALL members' values? This cannot be undone.`
                        : `Delete section "${section.name}" and all its fields? This cannot be undone.`
                    )
                  ) {
                    remove.mutate();
                  }
                }}
                loading={remove.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete section
              </Button>
            )}
          </div>
        </div>

        {section.fields.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <FolderPlus className="h-6 w-6 text-fg-subtle mx-auto mb-2" />
            <p className="text-sm text-fg-muted">
              {section.can_edit
                ? 'No fields yet.'
                : 'No fields configured for this section.'}
            </p>
            {section.can_edit && (
              <Button
                className="mt-4"
                onClick={() => setShowNewField(true)}
              >
                <Plus className="h-4 w-4" />
                Add first field
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {section.fields.map((f) => (
              <CustomFieldRow
                key={f.id}
                section={section}
                field={f}
                onChanged={onChanged}
              />
            ))}
            {section.can_edit && (
              <button
                onClick={() => setShowNewField(true)}
                className="w-full px-3 py-2.5 rounded-xl border border-dashed border-border text-sm text-fg-muted hover:text-fg hover:bg-bg-inset transition flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add field
              </button>
            )}
          </div>
        )}
      </CardContent>

      {showNewField && (
        <NewFieldModal
          sectionId={section.id}
          onClose={() => setShowNewField(false)}
          onCreated={() => {
            setShowNewField(false);
            onChanged();
          }}
        />
      )}
    </Card>
  );
}

function CustomFieldRow({
  section,
  field,
  onChanged,
}: {
  section: CustomSectionOut;
  field: CustomFieldOut;
  onChanged: () => void;
}) {
  const [value, setValue] = useState(field.value ?? '');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounced save for text/number fields. The custom-vault router has its
  // own upsert endpoint (the built-in one only accepts the seven hardcoded
  // segment names).
  const save = useMutation({
    mutationFn: async (v: string) => {
      await api.put(`/data-vault/custom/sections/${section.id}/values`, {
        fields: { [field.key]: v },
      });
    },
    onMutate: () => setStatus('saving'),
    onSuccess: () => {
      setStatus('saved');
      onChanged();
    },
    onError: () => setStatus('error'),
  });

  useEffect(() => {
    if (field.field_type === 'file') return;
    if ((value ?? '') === (field.value ?? '')) return;
    setStatus('dirty');
    const t = setTimeout(() => save.mutate(value), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const remove = useMutation({
    mutationFn: async () => {
      await api.delete(`/data-vault/custom/fields/${field.id}`);
    },
    onSuccess: () => {
      toast.success(`Removed "${field.name}"`);
      onChanged();
    },
  });

  // Aliases editor — the data model has had `aliases: string[]` since
  // creation, but no UI existed to set it. Surface here so users can
  // teach auto-affix what to recognize for their custom fields.
  const [aliasesOpen, setAliasesOpen] = useState(false);
  const [aliasesDraft, setAliasesDraft] = useState(
    (field.aliases || []).join(', ')
  );
  const saveAliases = useMutation({
    mutationFn: async () => {
      const list = aliasesDraft
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await api.put(`/data-vault/custom/fields/${field.id}`, {
        aliases: list,
      });
    },
    onSuccess: () => {
      toast.success('Aliases saved');
      setAliasesOpen(false);
      onChanged();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail || 'Could not save aliases'),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post(
        `/data-vault/custom/fields/${field.id}/upload`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data;
    },
    onSuccess: () => {
      toast.success('File uploaded');
      onChanged();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Upload failed');
    },
  });

  const TypeIcon =
    field.field_type === 'number'
      ? Hash
      : field.field_type === 'file'
        ? FileIcon
        : Type;

  return (
    <div className="rounded-xl border border-border bg-bg-inset p-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-bg-elevated border border-border grid place-items-center text-fg-muted shrink-0">
        <TypeIcon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <label className="text-xs font-medium text-fg-muted">
            {field.name}
          </label>
          <SaveStatusDot status={status} />
        </div>
        {field.field_type === 'file' ? (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload.mutate(f);
                e.target.value = '';
              }}
            />
            {field.has_value && field.file_download_url ? (
              <>
                <a
                  href={field.file_download_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-400 hover:underline inline-flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Download
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  loading={upload.isPending}
                >
                  Replace
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                loading={upload.isPending}
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload file
              </Button>
            )}
          </div>
        ) : (
          <Input
            type={field.field_type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}…`}
          />
        )}

        {/* Aliases editor — admin-only for enterprise sections (it changes
            the schema). Comma-separated alternative labels auto-affix uses
            when matching this field against arbitrary document text. */}
        {section.can_edit && (
          <div className="mt-1.5">
            {!aliasesOpen ? (
              <button
                type="button"
                onClick={() => {
                  setAliasesDraft((field.aliases || []).join(', '));
                  setAliasesOpen(true);
                }}
                className="inline-flex items-center gap-1 text-[10px] text-fg-subtle hover:text-fg transition"
                title="Alternative labels auto-affix uses to match this field"
              >
                <Tag className="h-3 w-3" />
                {field.aliases && field.aliases.length > 0
                  ? `${field.aliases.length} alias${field.aliases.length === 1 ? '' : 'es'}`
                  : 'Add aliases'}
              </button>
            ) : (
              <div className="space-y-1.5">
                <Input
                  value={aliasesDraft}
                  onChange={(e) => setAliasesDraft(e.target.value)}
                  placeholder="e.g. Policy No, Insurance #, Pol. Number"
                  className="text-xs"
                />
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-fg-subtle">
                    Comma-separated. We match these against form labels.
                  </span>
                  <button
                    onClick={() => saveAliases.mutate()}
                    disabled={saveAliases.isPending}
                    className="ml-auto text-brand-400 hover:underline"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setAliasesOpen(false)}
                    className="text-fg-subtle hover:text-fg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Field-schema delete is admin-only for enterprise sections. Members
          can still clear their VALUE by emptying the input — that's a
          different operation (handled by the debounced save above). */}
      {section.can_edit && (
        <button
          onClick={() => {
            if (window.confirm(`Remove field "${field.name}"?`)) {
              remove.mutate();
            }
          }}
          className="text-fg-subtle hover:text-danger transition shrink-0"
          title="Remove field"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function SaveStatusDot({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  const map = {
    dirty: { color: 'bg-warning', label: 'unsaved' },
    saving: { color: 'bg-fg-muted animate-pulse', label: 'saving…' },
    saved: { color: 'bg-success', label: 'saved' },
    error: { color: 'bg-danger', label: 'failed' },
  } as const;
  const m = map[status];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-fg-subtle uppercase tracking-wider">
      <span className={cn('h-1.5 w-1.5 rounded-full', m.color)} />
      {m.label}
    </span>
  );
}
