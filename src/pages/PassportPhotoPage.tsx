import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  Upload,
  Star,
  Trash2,
  Check,
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

interface PassportPhoto {
  id: string;
  photo_url: string;
  name?: string | null;
  is_default: boolean;
  width_px?: number | null;
  height_px?: number | null;
  created_at: string;
}

function usePhotoImage(id: string) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    (async () => {
      try {
        const r = await api.get(`/passport-photos/${id}/file`, {
          responseType: 'blob',
        });
        if (cancelled) return;
        url = URL.createObjectURL(r.data);
        setSrc(url);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  return src;
}

export default function PassportPhotoPage() {
  const qc = useQueryClient();

  const { data: photos, isLoading } = useQuery({
    queryKey: ['passport-photos'],
    queryFn: async () => {
      const { data } = await api.get<PassportPhoto[]>('/passport-photos');
      return data;
    },
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) =>
      api.put(`/passport-photos/${id}/set-default`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passport-photos'] });
      toast.success('Default photo updated');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/passport-photos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passport-photos'] });
      toast.success('Photo deleted');
    },
  });

  return (
    <div>
      <PageHeader
        title="Passport photo"
        description="Used for forms that require you to affix a passport-style photograph."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <h2 className="font-display text-lg font-semibold text-fg mb-1">
              Upload a new photo
            </h2>
            <p className="text-sm text-fg-muted mb-5">
              We'll stamp this on any document that has a PHOTOGRAPH or PHOTO slot.
            </p>
            <UploadForm
              onCreated={() =>
                qc.invalidateQueries({ queryKey: ['passport-photos'] })
              }
            />
            <div className="mt-5 p-3 rounded-xl bg-bg-inset border border-border text-xs text-fg-muted">
              <strong className="text-fg">Tips for a good photo:</strong> plain
              background, face fully visible, head and shoulders only, recent
              (within 6 months). Phone selfie works.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="font-display text-lg font-semibold text-fg mb-1">
              Your photos
            </h2>
            <p className="text-sm text-fg-muted mb-5">
              {photos?.length ?? 0} saved.
            </p>
            {isLoading ? (
              <p className="text-sm text-fg-muted">Loading…</p>
            ) : !photos || photos.length === 0 ? (
              <EmptyState
                icon={<Camera className="h-6 w-6" />}
                title="No photos yet"
                description="Upload one on the left to enable photo auto-affix."
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((p) => (
                  <PhotoCard
                    key={p.id}
                    photo={p}
                    onSetDefault={() => setDefault.mutate(p.id)}
                    onDelete={() => remove.mutate(p.id)}
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

function PhotoCard({
  photo,
  onSetDefault,
  onDelete,
}: {
  photo: PassportPhoto;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  const src = usePhotoImage(photo.id);
  return (
    <div className="relative rounded-xl border border-border overflow-hidden bg-bg-inset group">
      {/* 3:4 aspect ratio */}
      <div className="aspect-[3/4] w-full bg-bg-elevated flex items-center justify-center">
        {src ? (
          <img src={src} alt={photo.name ?? 'photo'} className="w-full h-full object-cover" />
        ) : (
          <Camera className="h-6 w-6 text-fg-subtle" />
        )}
      </div>
      {photo.is_default && (
        <div className="absolute top-2 left-2">
          <Badge tone="brand">
            <Star className="h-3 w-3" />
            Default
          </Badge>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition flex justify-end gap-1">
        {!photo.is_default && (
          <button
            onClick={onSetDefault}
            title="Set as default"
            className="h-7 w-7 grid place-items-center rounded-lg bg-bg-elevated/90 hover:bg-bg-elevated text-fg"
          >
            <Star className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={onDelete}
          title="Delete"
          className="h-7 w-7 grid place-items-center rounded-lg bg-bg-elevated/90 hover:bg-bg-elevated text-fg"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function UploadForm({ onCreated }: { onCreated: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(true);

  const save = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error('Pick a file first');
      const { data } = await api.post('/passport-photos', {
        photo_data: preview,
        name: name || file?.name || null,
        is_default: setAsDefault,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Photo saved');
      setFile(null);
      setPreview(null);
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
          id="photo-upload"
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFile(f);
            const r = new FileReader();
            r.onloadend = () => setPreview(r.result as string);
            r.readAsDataURL(f);
          }}
        />
        {preview ? (
          <div>
            <div className="mx-auto w-32 aspect-[3/4] rounded-lg overflow-hidden bg-bg-elevated border border-border">
              <img
                src={preview}
                alt="preview"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              className="mt-3 text-xs text-fg-muted hover:text-fg"
            >
              Choose a different photo
            </button>
          </div>
        ) : (
          <label htmlFor="photo-upload" className="cursor-pointer block">
            <Upload className="mx-auto h-6 w-6 text-fg-muted mb-2" />
            <span className="text-sm text-fg">Click to upload</span>
            <p className="text-xs text-fg-subtle mt-1">
              Portrait orientation (3:4) works best
            </p>
          </label>
        )}
      </div>

      <div className="mt-4">
        <Label htmlFor="photo-name">Label (optional)</Label>
        <Input
          id="photo-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. 2024 passport photo"
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
          Save photo
        </Button>
      </div>
    </div>
  );
}
