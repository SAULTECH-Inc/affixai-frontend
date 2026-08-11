import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { FilePlus2, RectangleHorizontal, RectangleVertical } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';

/** Mirrors PAGE_SIZES in the backend's pdf_authoring.py. */
const PAGE_SIZES = [
  { value: 'a4', label: 'A4 — 210 × 297 mm' },
  { value: 'letter', label: 'Letter — 8.5 × 11 in' },
  { value: 'legal', label: 'Legal — 8.5 × 14 in' },
  { value: 'a5', label: 'A5 — 148 × 210 mm' },
  { value: 'a3', label: 'A3 — 297 × 420 mm' },
  { value: 'tabloid', label: 'Tabloid — 11 × 17 in' },
];

export function NewDocumentSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [pageSize, setPageSize] = useState('a4');
  const [pages, setPages] = useState(1);
  const [landscape, setLandscape] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ id: string }>('/documents/blank', {
        title: title.trim() || null,
        page_size: pageSize,
        pages,
        landscape,
      });
      return data;
    },
    onSuccess: (doc) => {
      onClose();
      // Straight into the placement editor — a blank document's whole point is
      // that you start putting things on it immediately.
      navigate(`/documents/${doc.id}/edit`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail || 'Could not create the document'),
  });

  if (!open) return null;

  // A centred modal, matching the email/share dialogs on the Documents page.
  // Not the shared <Sheet>: that component is `lg:hidden` by design — a
  // mobile-only bottom sheet — so it renders nothing on desktop.
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !create.isPending && onClose()}
    >
      <div
        className="bg-bg-elevated border border-border rounded-2xl shadow-card max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="New blank document"
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-gradient-brand grid place-items-center text-white shrink-0">
            <FilePlus2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold text-fg">
              New blank document
            </h3>
            <p className="text-xs text-fg-muted">
              Start from an empty page and build it in the editor.
            </p>
          </div>
        </div>

        <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="doc-title">Name</Label>
          <Input
            id="doc-title"
            value={title}
            placeholder="Untitled document"
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="doc-size">Page size</Label>
          <Select
            id="doc-size"
            options={PAGE_SIZES}
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Orientation</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: false, label: 'Portrait', Icon: RectangleVertical },
              { v: true, label: 'Landscape', Icon: RectangleHorizontal },
            ].map(({ v, label, Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => setLandscape(v)}
                className={cn(
                  'flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition',
                  landscape === v
                    ? 'border-brand-500/40 bg-gradient-brand-soft text-fg'
                    : 'border-border bg-bg-inset text-fg-muted hover:text-fg'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="doc-pages">Pages</Label>
          <Input
            id="doc-pages"
            type="number"
            min={1}
            max={200}
            value={pages}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              setPages(Number.isNaN(n) ? 1 : Math.min(200, Math.max(1, n)));
            }}
          />
          <p className="text-xs text-fg-subtle">
            You can add, duplicate or remove pages later in the editor.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate()}
            loading={create.isPending}
            fullWidth
          >
            {!create.isPending && <FilePlus2 className="h-4 w-4" />}
            Create &amp; edit
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}
