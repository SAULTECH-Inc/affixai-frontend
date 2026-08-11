import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowRightLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileCode,
  FileText,
  FileType2,
  Info,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/layout/PageHeader';

type Format = 'pdf' | 'docx' | 'txt' | 'md';

/** Which targets each source format can be converted to. Mirrors the routing
 *  table in the backend's `convert_document()` — keep the two in sync. */
const TARGETS: Record<Format, Format[]> = {
  pdf: ['docx', 'txt', 'md'],
  docx: ['pdf', 'txt', 'md'],
  txt: ['pdf', 'docx'],
  md: ['pdf', 'docx', 'txt'],
};

const META: Record<
  Format,
  { label: string; blurb: string; icon: typeof FileText; accent: string }
> = {
  pdf: {
    label: 'PDF',
    blurb: 'Portable, print-ready',
    icon: FileType2,
    accent: 'text-red-400',
  },
  docx: {
    label: 'Word',
    blurb: 'Editable .docx',
    icon: FileText,
    accent: 'text-blue-400',
  },
  txt: {
    label: 'Text',
    blurb: 'Plain .txt',
    icon: FileText,
    accent: 'text-fg-muted',
  },
  md: {
    label: 'Markdown',
    blurb: 'Structured .md',
    icon: FileCode,
    accent: 'text-emerald-400',
  },
};

/** Every extension we let through the picker, mapped to its canonical format. */
const EXT_TO_FORMAT: Record<string, Format> = {
  pdf: 'pdf',
  docx: 'docx',
  doc: 'docx',
  txt: 'txt',
  text: 'txt',
  log: 'txt',
  md: 'md',
  markdown: 'md',
};

const ACCEPT = '.pdf,.docx,.doc,.txt,.md,.markdown';
const MAX_BYTES = 50 * 1024 * 1024;

function detectFormat(file: File): Format | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_FORMAT[ext] ?? null;
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ConverterPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<Format | null>(null);
  const [target, setTarget] = useState<Format | null>(null);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState<{ name: string; size: number } | null>(null);

  const convert = useMutation({
    mutationFn: async ({ selected, to }: { selected: File; to: Format }) => {
      const form = new FormData();
      form.append('file', selected);
      form.append('target_format', to);
      const resp = await api.post('/documents/convert', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });
      const base = selected.name.replace(/\.[^.]+$/, '') || 'document';
      return { blob: resp.data as Blob, name: `${base}.${to}` };
    },
    onSuccess: ({ blob, name }) => {
      // Hand the file straight to the browser — the conversion is stateless
      // server-side, so there's nothing to come back for later.
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone({ name, size: blob.size });
      toast.success(`Converted to ${name.split('.').pop()?.toUpperCase()}`);
    },
    onError: async (err: any) => {
      // The response is a Blob (responseType: 'blob'), so the JSON error body
      // has to be read back out before we can show `detail`.
      let detail = 'Conversion failed';
      const data = err?.response?.data;
      try {
        if (data instanceof Blob) {
          const parsed = JSON.parse(await data.text());
          detail = parsed?.detail || detail;
        } else if (data?.detail) {
          detail = data.detail;
        }
      } catch {
        /* keep the generic message */
      }
      toast.error(detail);
    },
  });

  function accept(f: File) {
    const fmt = detectFormat(f);
    if (!fmt) {
      toast.error('Unsupported file. Use PDF, DOCX, TXT, or MD.');
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error('That file is over the 50MB limit.');
      return;
    }
    setFile(f);
    setSource(fmt);
    setTarget(null);
    setDone(null);
    convert.reset();
  }

  function reset() {
    setFile(null);
    setSource(null);
    setTarget(null);
    setDone(null);
    convert.reset();
    if (fileRef.current) fileRef.current.value = '';
  }

  const SourceIcon = source ? META[source].icon : Upload;

  return (
    <div>
      <PageHeader
        title="Converter"
        description="Turn a document into another format. PDF, Word, plain text, and Markdown — in any supported direction."
        actions={
          <Badge tone="brand">
            <ArrowRightLeft className="h-3 w-3" />
            Any direction
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        {/* ---- Step 1: the file ------------------------------------- */}
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <span className="h-6 w-6 rounded-lg bg-bg-inset border border-border grid place-items-center text-xs font-bold text-fg-muted">
                1
              </span>
              <h2 className="text-sm font-semibold text-fg uppercase tracking-wider">
                Pick a file
              </h2>
            </div>

            {!file ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) accept(f);
                }}
                className={cn(
                  'rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition',
                  dragging
                    ? 'border-brand-500 bg-gradient-brand-soft scale-[1.01]'
                    : 'border-border hover:border-brand-500/40'
                )}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) accept(f);
                  }}
                />
                <div
                  className={cn(
                    'mx-auto h-16 w-16 rounded-2xl bg-gradient-brand-soft grid place-items-center text-brand-400 mb-4 transition',
                    dragging && 'scale-110'
                  )}
                >
                  <Upload className="h-7 w-7" />
                </div>
                <h3 className="font-display text-xl font-semibold text-fg">
                  {dragging ? 'Drop it' : 'Drop a document here'}
                </h3>
                <p className="mt-1.5 text-sm text-fg-muted">
                  or click to browse your files
                </p>
                <div className="mt-6 inline-flex items-center gap-2 text-xs text-fg-subtle">
                  <FileText className="h-3.5 w-3.5" />
                  PDF · DOCX · TXT · MD · max 50MB
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-bg-inset p-4 flex items-center gap-3">
                <div
                  className={cn(
                    'h-11 w-11 shrink-0 rounded-xl bg-bg-surface border border-border grid place-items-center',
                    source && META[source].accent
                  )}
                >
                  <SourceIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-fg truncate">
                    {file.name}
                  </div>
                  <div className="text-xs text-fg-muted">
                    {source && META[source].label} · {humanSize(file.size)}
                  </div>
                </div>
                <button
                  onClick={reset}
                  disabled={convert.isPending}
                  aria-label="Remove file"
                  className="h-8 w-8 shrink-0 grid place-items-center rounded-lg text-fg-subtle hover:text-fg hover:bg-bg-surface transition disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- Step 2: the target ----------------------------------- */}
        <Card className={cn(!source && 'opacity-60')}>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <span className="h-6 w-6 rounded-lg bg-bg-inset border border-border grid place-items-center text-xs font-bold text-fg-muted">
                2
              </span>
              <h2 className="text-sm font-semibold text-fg uppercase tracking-wider">
                Convert to
              </h2>
            </div>

            {!source ? (
              <p className="text-sm text-fg-muted py-8 text-center">
                Pick a file first — we'll show what it can become.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {TARGETS[source].map((t) => {
                    const Icon = META[t].icon;
                    const active = target === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setTarget(t)}
                        disabled={convert.isPending}
                        className={cn(
                          'group text-left p-3 rounded-xl border transition disabled:cursor-not-allowed',
                          active
                            ? 'border-brand-500/40 bg-gradient-brand-soft shadow-glow'
                            : 'border-border bg-bg-inset hover:border-brand-500/30 hover:bg-bg-surface'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            className={cn(
                              'h-4 w-4',
                              active ? 'text-brand-400' : META[t].accent
                            )}
                          />
                          <span className="text-sm font-semibold text-fg">
                            {META[t].label}
                          </span>
                          {active && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-brand-400 ml-auto" />
                          )}
                        </div>
                        <div className="mt-1 text-xs text-fg-muted">
                          {META[t].blurb}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Direction summary + action */}
                <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-fg-muted">
                    <span className="px-2 py-1 rounded-lg bg-bg-inset border border-border text-fg text-xs font-semibold uppercase">
                      {source}
                    </span>
                    <ArrowRight className="h-4 w-4 text-brand-400" />
                    <span
                      className={cn(
                        'px-2 py-1 rounded-lg border text-xs font-semibold uppercase',
                        target
                          ? 'bg-gradient-brand-soft border-brand-500/30 text-brand-400'
                          : 'bg-bg-inset border-border text-fg-subtle'
                      )}
                    >
                      {target ?? '—'}
                    </span>
                  </div>
                  <Button
                    className="sm:ml-auto"
                    disabled={!file || !target || convert.isPending}
                    loading={convert.isPending}
                    onClick={() =>
                      file && target && convert.mutate({ selected: file, to: target })
                    }
                  >
                    {/* Button renders its own spinner when `loading` — don't
                        add a second one here. */}
                    {convert.isPending ? (
                      'Converting…'
                    ) : (
                      <>
                        <ArrowRightLeft className="h-4 w-4" />
                        Convert
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- Result ------------------------------------------------- */}
      {done && (
        <Card className="mt-4">
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 grid place-items-center text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-bold text-fg">
                  Converted.{' '}
                  <span className="text-gradient-brand">Your download started.</span>
                </h3>
                <p className="mt-0.5 text-sm text-fg-muted truncate">
                  {done.name} · {humanSize(done.size)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:shrink-0">
                <Button
                  variant="outline"
                  onClick={() =>
                    file &&
                    target &&
                    convert.mutate({ selected: file, to: target })
                  }
                >
                  <Download className="h-4 w-4" />
                  Download again
                </Button>
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="h-4 w-4" />
                  Convert another
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- What's supported --------------------------------------- */}
      <Card className="mt-4">
        <CardContent>
          <h3 className="text-sm font-semibold text-fg-muted uppercase tracking-wider mb-4">
            Supported conversions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.keys(TARGETS) as Format[]).map((s) => (
              <div
                key={s}
                className="px-3 py-2.5 rounded-xl border border-border bg-bg-inset flex items-center gap-2 flex-wrap"
              >
                <span className="text-xs font-bold uppercase text-fg">{s}</span>
                <ArrowRight className="h-3.5 w-3.5 text-fg-subtle" />
                {TARGETS[s].map((t) => (
                  <Badge key={t} tone={s === source ? 'brand' : 'neutral'}>
                    {t.toUpperCase()}
                  </Badge>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-fg-subtle">
            Files are converted in-memory and streamed straight back — nothing is
            saved to your document library.
          </p>

          {/* Honest expectations. A PDF stores positioned glyphs rather than
              structure, so converting *out* of PDF is a reconstruction, not a
              lossless change of container. Saying so here costs less than a
              user assuming their layout will survive intact. */}
          {source === 'pdf' && target && target !== 'pdf' && (
            <div className="mt-4 flex gap-2.5 p-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07]">
              <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="text-xs text-fg-muted leading-relaxed">
                <span className="font-semibold text-fg">
                  Converting out of PDF rebuilds the layout.
                </span>{' '}
                PDFs store positioned text, not structure, so we reconstruct
                paragraphs and columns. Text-heavy documents convert cleanly.
                Multi-column designs — CVs, brochures, anything from a design
                tool — keep their text but may reflow, change page count, or
                lose decorative styling.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
