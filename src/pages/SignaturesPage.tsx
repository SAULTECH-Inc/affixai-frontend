import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SignaturePad from 'react-signature-canvas';
import {
  Star,
  Trash2,
  PenTool,
  Upload,
  RotateCcw,
  Check,
  Sparkles,
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
import { cn } from '@/lib/cn';

interface Signature {
  id: string;
  type: 'drawn' | 'typed' | 'uploaded' | 'digital_certificate';
  signature_url: string;
  signature_name?: string | null;
  is_default: boolean;
  metadata?: { background_removed?: boolean } | null;
  created_at: string;
}

/** Authenticated image fetch → blob URL; cleans up on unmount. */
function useSignatureImage(id: string) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    (async () => {
      try {
        const resp = await api.get(`/signatures/${id}/file`, {
          responseType: 'blob',
        });
        if (cancelled) return;
        url = URL.createObjectURL(resp.data);
        setSrc(url);
      } catch {
        /* ignore — fallback to placeholder */
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  return src;
}

export default function SignaturesPage() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');

  const { data: signatures, isLoading } = useQuery({
    queryKey: ['signatures'],
    queryFn: async () => {
      const { data } = await api.get<Signature[]>('/signatures');
      return data;
    },
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/signatures/${id}/set-default`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatures'] });
      toast.success('Default signature updated');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/signatures/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatures'] });
      toast.success('Signature removed');
    },
  });

  return (
    <div>
      <PageHeader
        title="Signatures"
        description="Draw or upload signatures. Your default one is used automatically by Auto-Sign."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display text-lg font-semibold text-fg">
                New signature
              </h2>
              <div className="inline-flex p-1 rounded-xl bg-bg-inset border border-border">
                {(['draw', 'upload'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      'px-3 h-8 rounded-lg text-xs font-medium flex items-center gap-1.5 transition',
                      mode === m
                        ? 'bg-bg-elevated text-fg shadow-card'
                        : 'text-fg-muted hover:text-fg'
                    )}
                  >
                    {m === 'draw' ? (
                      <PenTool className="h-3.5 w-3.5" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {m === 'draw' ? 'Draw' : 'Upload'}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-sm text-fg-muted mb-5">
              {mode === 'draw'
                ? 'Draw your signature with mouse or trackpad.'
                : 'Upload a PNG with a transparent background.'}
            </p>

            {mode === 'draw' ? (
              <DrawSignature
                onCreated={() => qc.invalidateQueries({ queryKey: ['signatures'] })}
              />
            ) : (
              <UploadSignature
                onCreated={() => qc.invalidateQueries({ queryKey: ['signatures'] })}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="font-display text-lg font-semibold text-fg mb-1">
              Your signatures
            </h2>
            <p className="text-sm text-fg-muted mb-5">
              {signatures?.length ?? 0} saved.
            </p>
            {isLoading ? (
              <p className="text-sm text-fg-muted">Loading…</p>
            ) : !signatures || signatures.length === 0 ? (
              <EmptyState
                icon={<PenTool className="h-6 w-6" />}
                title="No signatures yet"
                description="Create one on the left to get started."
              />
            ) : (
              <div className="space-y-2">
                {signatures.map((s) => (
                  <SignatureRow
                    key={s.id}
                    sig={s}
                    onSetDefault={() => setDefault.mutate(s.id)}
                    onDelete={() => remove.mutate(s.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SignatureRow({
  sig,
  onSetDefault,
  onDelete,
}: {
  sig: Signature;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  const imageSrc = useSignatureImage(sig.id);
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-bg-inset">
      <div className="min-w-0 flex items-center gap-3">
        <div
          className="h-12 w-20 rounded-lg border border-border grid place-items-center overflow-hidden shrink-0"
          style={{
            backgroundImage:
              'repeating-conic-gradient(rgb(var(--bg-inset)) 0% 25%, rgb(var(--bg-elevated)) 0% 50%) 50% / 8px 8px',
          }}
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={sig.signature_name || 'signature'}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-[10px] text-fg-subtle italic">
              {sig.type}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-fg truncate flex items-center gap-2">
            {sig.signature_name || `${sig.type} signature`}
            {sig.is_default && (
              <Badge tone="brand">
                <Star className="h-3 w-3" />
                Default
              </Badge>
            )}
            {sig.metadata?.background_removed && (
              <Badge tone="success">
                <Sparkles className="h-3 w-3" />
                BG removed
              </Badge>
            )}
          </div>
          <div className="text-xs text-fg-subtle">
            {new Date(sig.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        {!sig.is_default && (
          <Button variant="ghost" size="sm" onClick={onSetDefault} title="Set as default">
            <Star className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDelete} title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function DrawSignature({ onCreated }: { onCreated: () => void }) {
  const padRef = useRef<SignaturePad | null>(null);
  const [name, setName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(true);

  const save = useMutation({
    mutationFn: async () => {
      if (!padRef.current || padRef.current.isEmpty()) {
        throw new Error('Draw your signature first');
      }
      const dataUrl = padRef.current.toDataURL('image/png');
      const { data } = await api.post('/signatures', {
        type: 'drawn',
        signature_name: name || null,
        signature_data: dataUrl,
        is_default: setAsDefault,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Signature saved');
      padRef.current?.clear();
      setName('');
      onCreated();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err.message || 'Save failed');
    },
  });

  return (
    <div>
      <div className="rounded-xl border border-border bg-white">
        <SignaturePad
          ref={padRef}
          canvasProps={{
            className: 'w-full h-44 rounded-xl',
            style: { background: 'white' },
          }}
          penColor="#111827"
        />
      </div>
      <div className="mt-2 flex justify-between">
        <Button variant="ghost" size="sm" onClick={() => padRef.current?.clear()}>
          <RotateCcw className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      <div className="mt-4">
        <Label htmlFor="sig-name">Name (optional)</Label>
        <Input
          id="sig-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Default"
        />
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm text-fg cursor-pointer">
        <input
          type="checkbox"
          checked={setAsDefault}
          onChange={(e) => setSetAsDefault(e.target.checked)}
          className="accent-brand-500"
        />
        Set as default
      </label>
      <div className="mt-5">
        <Button onClick={() => save.mutate()} loading={save.isPending} fullWidth>
          <Check className="h-4 w-4" />
          Save signature
        </Button>
      </div>
    </div>
  );
}

function UploadSignature({ onCreated }: { onCreated: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processedPreview, setProcessedPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [removeBg, setRemoveBg] = useState(true);

  // Whenever the chosen file changes, fetch a server-side bg-removal preview.
  const previewBg = useMutation({
    mutationFn: async (f: File) => {
      const form = new FormData();
      form.append('file', f);
      const resp = await api.post('/signatures/preview-bg-removal', form, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return URL.createObjectURL(resp.data);
    },
    onSuccess: (url) => setProcessedPreview(url),
    onError: () => {
      // Server couldn't isolate a sig — that's OK, we just won't show the
      // processed preview. User can still save the original.
      setProcessedPreview(null);
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error('Pick a file first');
      const { data } = await api.post('/signatures', {
        type: 'uploaded',
        signature_name: name || file?.name || null,
        signature_data: preview,
        is_default: setAsDefault,
        remove_background: removeBg,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Signature saved');
      setFile(null);
      setPreview(null);
      if (processedPreview) URL.revokeObjectURL(processedPreview);
      setProcessedPreview(null);
      setName('');
      onCreated();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err.message || 'Save failed');
    },
  });

  return (
    <div>
      <div className="rounded-xl border-2 border-dashed border-border p-6 text-center hover:border-brand-500/40 transition">
        <input
          id="sig-upload"
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFile(f);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(f);
            if (removeBg) previewBg.mutate(f);
          }}
        />
        {preview ? (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-fg-subtle mb-1.5">
                  Original
                </div>
                <img
                  src={preview}
                  alt="original"
                  className="mx-auto h-24 bg-white rounded-lg p-2 border border-border"
                />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-fg-subtle mb-1.5 flex items-center gap-1 justify-center">
                  <Sparkles className="h-3 w-3 text-brand-400" />
                  Background removed
                </div>
                <div
                  className="mx-auto h-24 rounded-lg p-2 border border-border overflow-hidden"
                  style={{
                    backgroundImage:
                      'repeating-conic-gradient(rgb(var(--bg-inset)) 0% 25%, rgb(var(--bg-elevated)) 0% 50%) 50% / 10px 10px',
                  }}
                >
                  {previewBg.isPending ? (
                    <div className="flex items-center justify-center h-full text-xs text-fg-muted">
                      Processing…
                    </div>
                  ) : processedPreview ? (
                    <img
                      src={processedPreview}
                      alt="processed"
                      className="mx-auto h-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-fg-subtle">
                      Couldn't isolate a signature
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
                if (processedPreview) URL.revokeObjectURL(processedPreview);
                setProcessedPreview(null);
              }}
              className="mt-3 text-xs text-fg-muted hover:text-fg"
            >
              Choose a different image
            </button>
          </div>
        ) : (
          <label htmlFor="sig-upload" className="cursor-pointer block">
            <Upload className="mx-auto h-6 w-6 text-fg-muted mb-2" />
            <span className="text-sm text-fg">Click to upload PNG/JPG</span>
            <p className="text-xs text-fg-subtle mt-1">
              Take a photo of your signature on paper — we'll clean it up.
            </p>
          </label>
        )}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-fg cursor-pointer">
        <input
          type="checkbox"
          checked={removeBg}
          onChange={(e) => {
            setRemoveBg(e.target.checked);
            if (e.target.checked && file) previewBg.mutate(file);
            else setProcessedPreview(null);
          }}
          className="accent-brand-500"
        />
        Auto-remove background
      </label>

      <div className="mt-4">
        <Label htmlFor="up-name">Name (optional)</Label>
        <Input
          id="up-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Office signature"
        />
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm text-fg cursor-pointer">
        <input
          type="checkbox"
          checked={setAsDefault}
          onChange={(e) => setSetAsDefault(e.target.checked)}
          className="accent-brand-500"
        />
        Set as default
      </label>
      <div className="mt-5">
        <Button
          onClick={() => save.mutate()}
          loading={save.isPending}
          disabled={!preview}
          fullWidth
        >
          <Check className="h-4 w-4" />
          Save signature
        </Button>
      </div>
    </div>
  );
}
