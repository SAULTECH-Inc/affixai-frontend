import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Briefcase,
  Database,
  FileSignature,
  Info,
  Scale,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/layout/PageHeader';

interface TemplateSummary {
  slug: string;
  title: string;
  category: string;
  summary: string;
  placeholder_count: number;
}

interface Placeholder {
  key: string;
  label: string;
  kind: string;
  required: boolean;
  help?: string | null;
  value?: string | null;
  prefilled_from_vault: boolean;
}

interface TemplateDetail {
  slug: string;
  title: string;
  category: string;
  summary: string;
  disclaimer: string;
  placeholders: Placeholder[];
  missing_required: string[];
}

const CATEGORY_META: Record<string, { label: string; icon: typeof Briefcase }> = {
  hiring: { label: 'Hiring & onboarding', icon: Briefcase },
  contracts: { label: 'Contracts', icon: Scale },
};

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');

  const list = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data } = await api.get<{ templates: TemplateSummary[]; disclaimer: string }>(
        '/templates'
      );
      return data;
    },
  });

  const detail = useQuery({
    queryKey: ['templates', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await api.get<TemplateDetail>(`/templates/${slug}`);
      // Seed the form with what the server would use anyway — vault values,
      // defaults, today's date — so the user only fills the gaps.
      const seeded: Record<string, string> = {};
      for (const p of data.placeholders) if (p.value) seeded[p.key] = p.value;
      setValues(seeded);
      setTitle(data.title);
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ id: string }>(`/templates/${slug}/use`, {
        values,
        title: title.trim() || null,
      });
      return data;
    },
    onSuccess: (doc) => {
      toast.success('Document created');
      navigate(`/documents/${doc.id}/edit`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail || 'Could not create the document'),
  });

  const grouped = useMemo(() => {
    const out: Record<string, TemplateSummary[]> = {};
    for (const t of list.data?.templates ?? []) {
      (out[t.category] ??= []).push(t);
    }
    return out;
  }, [list.data]);

  // Which required fields are still empty — mirrors the server's check so the
  // user sees it before submitting rather than as a 400.
  const stillMissing = (detail.data?.placeholders ?? []).filter(
    (p) => p.required && !(values[p.key] ?? '').trim()
  );

  // ---- Fill view ----------------------------------------------------------
  if (slug) {
    return (
      <div>
        <PageHeader
          title={detail.data?.title ?? 'Template'}
          description={detail.data?.summary}
          actions={
            <Button variant="outline" onClick={() => setSlug(null)}>
              <ArrowLeft className="h-4 w-4" />
              All templates
            </Button>
          }
        />

        {detail.isLoading ? (
          <Card>
            <CardContent className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
            <Card>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-title">Document name</Label>
                  <Input
                    id="tpl-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                  />
                </div>

                <div className="h-px bg-border" />

                {detail.data?.placeholders.map((p) => {
                  const id = `f-${p.key}`;
                  const empty = !(values[p.key] ?? '').trim();
                  return (
                    <div key={p.key} className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label htmlFor={id}>
                          {p.label}
                          {p.required && <span className="text-danger ml-0.5">*</span>}
                        </Label>
                        {p.prefilled_from_vault && (
                          <Badge tone="brand">
                            <Database className="h-3 w-3" />
                            From your vault
                          </Badge>
                        )}
                      </div>
                      {p.kind === 'multiline' ? (
                        <Textarea
                          id={id}
                          rows={3}
                          value={values[p.key] ?? ''}
                          onChange={(e) =>
                            setValues((v) => ({ ...v, [p.key]: e.target.value }))
                          }
                        />
                      ) : (
                        <Input
                          id={id}
                          value={values[p.key] ?? ''}
                          onChange={(e) =>
                            setValues((v) => ({ ...v, [p.key]: e.target.value }))
                          }
                          className={cn(
                            p.required && empty && 'border-danger/50'
                          )}
                        />
                      )}
                      {p.help && (
                        <p className="text-xs text-fg-subtle">{p.help}</p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="space-y-4 lg:sticky lg:top-4">
              <Card>
                <CardContent className="space-y-3">
                  <h3 className="text-sm font-semibold text-fg-muted uppercase tracking-wider">
                    Ready to create
                  </h3>
                  {stillMissing.length > 0 ? (
                    <p className="text-sm text-fg-muted">
                      {stillMissing.length} required{' '}
                      {stillMissing.length === 1 ? 'field' : 'fields'} left:{' '}
                      <span className="text-fg">
                        {stillMissing.map((p) => p.label).join(', ')}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-fg-muted">
                      Everything required is filled in. Blank optional fields
                      become a ruled line you can complete by hand or in the
                      editor.
                    </p>
                  )}
                  <Button
                    fullWidth
                    disabled={stillMissing.length > 0 || create.isPending}
                    loading={create.isPending}
                    onClick={() => create.mutate()}
                  >
                    {!create.isPending && <FileSignature className="h-4 w-4" />}
                    Create &amp; open in editor
                  </Button>
                </CardContent>
              </Card>

              {detail.data?.disclaimer && (
                <div className="flex gap-2.5 p-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07]">
                  <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <p className="text-xs text-fg-muted leading-relaxed">
                    {detail.data.disclaimer}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- Gallery ------------------------------------------------------------
  return (
    <div>
      <PageHeader
        title="Templates"
        description="Start from standard wording for new hires and new contracts, then edit and download."
        actions={
          <Badge tone="brand">
            <Sparkles className="h-3 w-3" />
            Vault-prefilled
          </Badge>
        }
      />

      {list.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => {
            const meta = CATEGORY_META[category] ?? {
              label: category,
              icon: Briefcase,
            };
            const Icon = meta.icon;
            return (
              <section key={category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-brand-400" />
                  <h2 className="text-sm font-semibold text-fg-muted uppercase tracking-wider">
                    {meta.label}
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((t) => (
                    <button
                      key={t.slug}
                      onClick={() => setSlug(t.slug)}
                      className="text-left p-4 rounded-2xl border border-border bg-bg-surface hover:border-brand-500/30 hover:bg-bg-inset transition shadow-card"
                    >
                      <h3 className="font-display font-semibold text-fg">
                        {t.title}
                      </h3>
                      <p className="mt-1 text-sm text-fg-muted">{t.summary}</p>
                      <div className="mt-3 text-xs text-fg-subtle">
                        {t.placeholder_count} fields to fill
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}

          {list.data?.disclaimer && (
            <div className="flex gap-2.5 p-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07]">
              <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <p className="text-xs text-fg-muted leading-relaxed">
                {list.data.disclaimer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
