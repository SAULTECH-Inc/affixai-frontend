import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, FileType2, ImageIcon, NotebookPen, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ContextFields,
  Mode,
  ModePicker,
  NoteEditor,
  StepTitle,
  Warnings,
  errorDetail,
  isPaymentError,
  shrinkImage,
} from './shared';

interface HandwrittenResponse {
  mode: Mode;
  note_markdown: string;
  pages: { page: number; text: string; provider: string }[];
  providers_used: string[];
  illegible_count: number;
  warnings: string[];
}

// Keep in step with the backend (NOTES_MAX_PAGES, MAX_FILE_SIZE_MB).
const MAX_FILES = 10;
const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf';

const isAccepted = (f: File) => /\.(jpe?g|png|webp|pdf)$/i.test(f.name);
const isImage = (f: File) => /\.(jpe?g|png|webp)$/i.test(f.name);

export default function HandwritingNotes() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<Mode>('rewrite');
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [result, setResult] = useState<HandwrittenResponse | null>(null);
  const [note, setNote] = useState('');
  const [leftTab, setLeftTab] = useState<'original' | 'transcript'>('original');
  const [viewIndex, setViewIndex] = useState(0);

  // Object URLs for the photo previews; revoked when the file list changes.
  const previews = useMemo(
    () => files.map((f) => (isImage(f) ? URL.createObjectURL(f) : null)),
    [files]
  );
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews]);

  const generate = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      const prepared = await Promise.all(files.map((f) => (isImage(f) ? shrinkImage(f) : f)));
      prepared.forEach((f) => form.append('files', f));
      form.append('mode', mode);
      form.append('subject', subject);
      form.append('class_level', classLevel);
      const { data } = await api.post<HandwrittenResponse>('/notes/handwritten', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      setNote(data.note_markdown);
      setViewIndex(0);
      setLeftTab(previews.some(Boolean) ? 'original' : 'transcript');
      if (!data.note_markdown) toast.warning('No writing was found on these pages.');
      else toast.success('Your note is ready to review.');
    },
    onError: (err) => toast.error(errorDetail(err, "Couldn't read your notes. Please try again.")),
  });

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    const rejected = incoming.filter((f) => !isAccepted(f) || f.size > MAX_BYTES);
    if (rejected.length) {
      toast.error(
        rejected.some((f) => /\.hei[cf]$/i.test(f.name))
          ? 'HEIC photos aren’t supported. Set your camera to JPEG, or export the photo as JPEG.'
          : 'Use JPEG, PNG or WebP photos, or a PDF, under 50MB each.'
      );
    }
    const ok = incoming.filter((f) => isAccepted(f) && f.size <= MAX_BYTES);
    setFiles((prev) => {
      const next = [...prev, ...ok];
      if (next.length > MAX_FILES) {
        toast.error(`Up to ${MAX_FILES} pages at a time.`);
        return next.slice(0, MAX_FILES);
      }
      return next;
    });
  }

  function startOver() {
    setFiles([]);
    setResult(null);
    setNote('');
    generate.reset();
    if (fileRef.current) fileRef.current.value = '';
  }

  const imageIndexes = previews.map((u, i) => (u ? i : -1)).filter((i) => i >= 0);

  if (result) {
    return (
      <>
        <Card className="mb-4">
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-bold text-fg">
                  Check your note before you share it.
                </h2>
                <p className="mt-0.5 text-sm text-fg-muted">
                  Compare it with your original pages and edit anything that's wrong.
                  {result.mode === 'expand' &&
                    ' Sections marked (added) were written by the AI, not taken from your notes.'}
                </p>
              </div>
              {result.illegible_count > 0 && (
                <Badge tone="warning" className="sm:shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  {result.illegible_count} unreadable{' '}
                  {result.illegible_count === 1 ? 'word' : 'words'}
                </Badge>
              )}
            </div>
            <Warnings items={result.warnings} />
            {result.illegible_count > 0 && (
              <p className="mt-3 text-xs text-fg-subtle">
                Search the note for <code className="text-fg">[illegible]</code> and{' '}
                <code className="text-fg">[?]</code> to find words that couldn't be read or were
                guessed.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Card>
            <CardContent>
              <div className="flex gap-1 mb-3 p-1 rounded-xl bg-bg-inset border border-border w-fit">
                {(
                  [
                    ['original', 'Your pages'],
                    ['transcript', 'What the AI read'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setLeftTab(id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition',
                      leftTab === id ? 'bg-bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {leftTab === 'original' ? (
                imageIndexes.length ? (
                  <>
                    <img
                      src={previews[imageIndexes[viewIndex] ?? imageIndexes[0]]!}
                      alt={`Page ${(imageIndexes[viewIndex] ?? 0) + 1}`}
                      className="w-full max-h-[70vh] object-contain rounded-xl border border-border bg-bg-inset"
                    />
                    {imageIndexes.length > 1 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {imageIndexes.map((fileIdx, i) => (
                          <button
                            key={fileIdx}
                            onClick={() => setViewIndex(i)}
                            className={cn(
                              'h-8 min-w-8 px-2 rounded-lg border text-xs font-semibold',
                              i === viewIndex
                                ? 'border-brand-500/40 bg-gradient-brand-soft text-brand-400'
                                : 'border-border bg-bg-inset text-fg-muted hover:text-fg'
                            )}
                          >
                            {fileIdx + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-fg-muted py-8 text-center">
                    PDF pages can't be previewed here. Open “What the AI read” to see each page's
                    text.
                  </p>
                )
              ) : (
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                  {result.pages.map((p) => (
                    <div key={p.page} className="rounded-xl border border-border bg-bg-inset p-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle mb-1.5">
                        Page {p.page}
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-sm text-fg">{p.text}</pre>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <NoteEditor note={note} onChange={setNote} onStartOver={startOver} />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <Card>
        <CardContent>
          <StepTitle n={1}>Add your pages</StepTitle>

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
              if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
            }}
            className={cn(
              'rounded-2xl border-2 border-dashed text-center cursor-pointer transition',
              files.length ? 'p-5' : 'p-8 sm:p-12',
              dragging
                ? 'border-brand-500 bg-gradient-brand-soft scale-[1.01]'
                : 'border-border hover:border-brand-500/40'
            )}
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-brand-soft grid place-items-center text-brand-400 mb-3">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-semibold text-fg">
              {files.length ? 'Add more pages' : 'Drop photos of your notes here'}
            </h3>
            <p className="mt-1 text-sm text-fg-muted">or click to choose. One photo per page, in order.</p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-fg-subtle">
              <ImageIcon className="h-3.5 w-3.5" />
              JPEG · PNG · WebP · PDF · up to {MAX_FILES} pages
            </div>
          </div>

          {files.length > 0 && (
            <ol className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="relative rounded-xl border border-border bg-bg-inset overflow-hidden aspect-[3/4]"
                >
                  {previews[i] ? (
                    <img src={previews[i]!} alt={`Page ${i + 1}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center p-2 text-center">
                      <div>
                        <FileType2 className="h-6 w-6 mx-auto text-red-400" />
                        <div className="mt-1 text-[11px] text-fg-muted break-all line-clamp-2">
                          {f.name}
                        </div>
                      </div>
                    </div>
                  )}
                  <span className="absolute left-1.5 top-1.5 px-1.5 rounded-md bg-black/60 text-white text-[11px] font-semibold">
                    {i + 1}
                  </span>
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    disabled={generate.isPending}
                    aria-label={`Remove page ${i + 1}`}
                    className="absolute right-1.5 top-1.5 h-6 w-6 grid place-items-center rounded-md bg-black/60 text-white opacity-80 hover:opacity-100 disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ol>
          )}

          <p className="mt-4 text-xs text-fg-subtle">
            For best results, photograph each page flat, in good light, with the whole page in the
            frame.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <StepTitle n={2}>Choose what you get back</StepTitle>
          <ModePicker mode={mode} onChange={setMode} disabled={generate.isPending} />
          {mode !== 'transcribe' && (
            <div className="mt-4">
              <ContextFields
                subject={subject}
                classLevel={classLevel}
                onSubject={setSubject}
                onClassLevel={setClassLevel}
              />
            </div>
          )}

          <Button
            className="mt-5"
            fullWidth
            disabled={!files.length || generate.isPending}
            loading={generate.isPending}
            onClick={() => generate.mutate()}
          >
            {generate.isPending ? (
              'Reading your pages…'
            ) : (
              <>
                <NotebookPen className="h-4 w-4" />
                Create note
              </>
            )}
          </Button>
          {generate.isPending && (
            <p className="mt-2 text-xs text-fg-muted text-center">
              This takes about half a minute per page. Keep this tab open.
            </p>
          )}
          {isPaymentError(generate.error) && (
            <p className="mt-2 text-xs text-center text-fg-muted">
              <Link to="/billing" className="text-brand-400 underline">
                Choose a plan
              </Link>{' '}
              to use AI notes.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
