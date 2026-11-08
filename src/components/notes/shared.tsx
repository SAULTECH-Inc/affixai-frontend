/** Pieces shared by the handwriting and voice note flows. */
import { useMutation } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  RotateCcw,
  ScanText,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';

export type Mode = 'transcribe' | 'rewrite' | 'expand';

export const MODES: {
  id: Mode;
  label: string;
  blurb: string;
  icon: typeof FileText;
}[] = [
  {
    id: 'transcribe',
    label: 'Transcribe only',
    blurb: 'Type up exactly what you said or wrote. Nothing changed.',
    icon: ScanText,
  },
  {
    id: 'rewrite',
    label: 'Rewrite & format',
    blurb: 'Fix spelling and grammar, add headings and lists. No new content.',
    icon: Wand2,
  },
  {
    id: 'expand',
    label: 'Full lesson note',
    blurb: 'Adds objectives, explanations, examples and exercises. Added parts are marked.',
    icon: BookOpenCheck,
  },
];

export function errorDetail(err: any, fallback: string): string {
  const resp = err?.response;
  if (resp?.status === 402) return 'AI notes need an active plan.';
  const detail = resp?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
}

export function isPaymentError(err: unknown) {
  return (err as any)?.response?.status === 402;
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** First Markdown heading, as a safe filename. */
export function noteFilename(md: string) {
  const title = md.match(/^#\s+(.+)$/m)?.[1] ?? 'lesson-note';
  return (
    title
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 60) || 'lesson-note'
  );
}

export function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="h-6 w-6 rounded-lg bg-bg-inset border border-border grid place-items-center text-xs font-bold text-fg-muted">
        {n}
      </span>
      <h2 className="text-sm font-semibold text-fg uppercase tracking-wider">{children}</h2>
    </div>
  );
}

export function ModePicker({
  mode,
  onChange,
  disabled,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            disabled={disabled}
            className={cn(
              'text-left p-3 rounded-xl border transition flex gap-3 disabled:cursor-not-allowed',
              active
                ? 'border-brand-500/40 bg-gradient-brand-soft shadow-glow'
                : 'border-border bg-bg-inset hover:border-brand-500/30 hover:bg-bg-surface'
            )}
          >
            <Icon
              className={cn('h-5 w-5 mt-0.5 shrink-0', active ? 'text-brand-400' : 'text-fg-muted')}
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-fg flex items-center gap-2">
                {m.label}
                {active && <CheckCircle2 className="h-3.5 w-3.5 text-brand-400" />}
              </div>
              <div className="mt-0.5 text-xs text-fg-muted">{m.blurb}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function ContextFields({
  subject,
  classLevel,
  onSubject,
  onClassLevel,
}: {
  subject: string;
  classLevel: string;
  onSubject: (v: string) => void;
  onClassLevel: (v: string) => void;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div>
        <Label htmlFor="notes-subject">Subject (optional)</Label>
        <Input
          id="notes-subject"
          placeholder="e.g. Basic Science"
          value={subject}
          maxLength={120}
          onChange={(e) => onSubject(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="notes-level">Class (optional)</Label>
        <Input
          id="notes-level"
          placeholder="e.g. JSS 2"
          value={classLevel}
          maxLength={120}
          onChange={(e) => onClassLevel(e.target.value)}
        />
      </div>
    </div>
  );
}

export function Warnings({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((w) => (
        <li
          key={w}
          className="flex gap-2 p-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] text-xs text-fg-muted"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          {w}
        </li>
      ))}
    </ul>
  );
}

/** The editable note plus its export actions. */
export function NoteEditor({
  note,
  onChange,
  onStartOver,
}: {
  note: string;
  onChange: (v: string) => void;
  onStartOver: () => void;
}) {
  const exportAs = useMutation({
    mutationFn: async (format: 'pdf' | 'docx') => {
      const base = noteFilename(note);
      const form = new FormData();
      form.append('file', new File([note], `${base}.md`, { type: 'text/markdown' }));
      form.append('target_format', format);
      const resp = await api.post('/documents/convert', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });
      return { blob: resp.data as Blob, name: `${base}.${format}` };
    },
    onSuccess: ({ blob, name }) => saveBlob(blob, name),
    onError: () => toast.error('Export failed. Try again, or download as Markdown.'),
  });

  async function copyNote() {
    await navigator.clipboard.writeText(note);
    toast.success('Copied to clipboard');
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-fg uppercase tracking-wider">Your note</h3>
        <span className="text-xs text-fg-subtle">Markdown · editable</span>
      </div>
      <Textarea
        value={note}
        onChange={(e) => onChange(e.target.value)}
        rows={24}
        spellCheck
        className="font-mono text-[13px] leading-relaxed min-h-[50vh]"
        aria-label="Lesson note"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          disabled={!note || exportAs.isPending}
          loading={exportAs.isPending && exportAs.variables === 'pdf'}
          onClick={() => exportAs.mutate('pdf')}
        >
          <Download className="h-4 w-4" />
          PDF
        </Button>
        <Button
          variant="outline"
          disabled={!note || exportAs.isPending}
          loading={exportAs.isPending && exportAs.variables === 'docx'}
          onClick={() => exportAs.mutate('docx')}
        >
          <FileText className="h-4 w-4" />
          Word
        </Button>
        <Button
          variant="outline"
          disabled={!note}
          onClick={() =>
            saveBlob(new Blob([note], { type: 'text/markdown' }), `${noteFilename(note)}.md`)
          }
        >
          Markdown
        </Button>
        <Button variant="ghost" disabled={!note} onClick={copyNote}>
          <Copy className="h-4 w-4" />
          Copy
        </Button>
        <Button variant="ghost" className="sm:ml-auto" onClick={onStartOver}>
          <RotateCcw className="h-4 w-4" />
          New note
        </Button>
      </div>
    </>
  );
}

/** Shrink a photo in the browser before upload: long edge 1568px (what the
 *  vision models work at anyway), JPEG. A 4MB phone photo becomes ~300KB,
 *  which matters on mobile data and keeps requests under hosting body
 *  limits. Applies the EXIF rotation via createImageBitmap. Falls back to
 *  the original file if the browser can't decode it. */
export async function shrinkImage(file: File, maxEdge = 1568): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
