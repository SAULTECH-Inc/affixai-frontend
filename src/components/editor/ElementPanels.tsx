/**
 * Authoring elements for the placement editor: image, link, rich text, table.
 *
 * Kept out of DocumentEditPage.tsx deliberately — that file is already ~2,200
 * lines, and the per-kind property editing here is self-contained. The editor
 * imports the preview (drawn inside the overlay box) and the inspector (drawn
 * in the side panel when one of these is selected).
 */
import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Image as ImageIcon,
  Link2,
  Lock,
  Plus,
  Table as TableIcon,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import type { DocumentAsset, Placement, PlacementKind } from '@/types';

/** Kinds this module owns. */
export const AUTHORING_KINDS: PlacementKind[] = ['image', 'link', 'richtext', 'table'];

export function isAuthoringKind(kind: PlacementKind): boolean {
  return AUTHORING_KINDS.includes(kind);
}

export const AUTHORING_ICONS: Record<string, JSX.Element> = {
  image: <ImageIcon className="h-3.5 w-3.5" />,
  link: <Link2 className="h-3.5 w-3.5" />,
  richtext: <Type className="h-3.5 w-3.5" />,
  table: <TableIcon className="h-3.5 w-3.5" />,
};

/** Sensible starting box for each kind, in PDF points. */
export const AUTHORING_DEFAULT_SIZE: Record<string, { width: number; height: number }> = {
  image: { width: 140, height: 100 },
  link: { width: 160, height: 16 },
  richtext: { width: 320, height: 120 },
  table: { width: 380, height: 90 },
};

/**
 * What the element looks like on the canvas.
 *
 * These are previews, not the real render — the PDF is produced server-side by
 * PyMuPDF. The aim is that position and extent are honest, so what the user
 * drags is where it lands.
 */
export function AuthoringPreview({
  placement: p,
  assetUrls,
}: {
  placement: Placement;
  assetUrls: Record<string, string>;
}) {
  if (p.kind === 'image') {
    const src = p.asset_id ? assetUrls[p.asset_id] : undefined;
    return src ? (
      <img
        src={src}
        alt=""
        draggable={false}
        className={cn(
          'w-full h-full pointer-events-none select-none',
          p.keep_proportion === false ? 'object-fill' : 'object-contain'
        )}
      />
    ) : (
      <div className="w-full h-full grid place-items-center text-[10px] text-fg-muted border border-dashed border-fg-subtle/50 rounded">
        <span className="flex items-center gap-1">
          <ImageIcon className="h-3 w-3" /> Choose an image
        </span>
      </div>
    );
  }

  if (p.kind === 'link') {
    return (
      <span
        className="underline whitespace-nowrap overflow-hidden"
        style={{ color: p.color && p.color !== '#000000' ? p.color : '#1a56db' }}
      >
        {p.value || p.url || 'Link'}
      </span>
    );
  }

  if (p.kind === 'richtext') {
    return p.html ? (
      <div
        className="w-full h-full overflow-hidden text-left [&_h1]:text-[13px] [&_h2]:text-[11px] [&_p]:m-0 [&_ul]:pl-3 [&_ul]:list-disc"
        style={{ fontSize: `${Math.max(p.fontsize ?? 10, 6)}px`, color: p.color ?? '#000' }}
        // The value is authored in this app's own rich-text editor and is
        // re-escaped server-side before rendering; showing it here is a
        // preview of the user's own content.
        dangerouslySetInnerHTML={{ __html: p.html }}
      />
    ) : (
      <div className="w-full h-full grid place-items-center text-[10px] text-fg-muted border border-dashed border-fg-subtle/50 rounded">
        <span className="flex items-center gap-1">
          <Type className="h-3 w-3" /> Write text
        </span>
      </div>
    );
  }

  if (p.kind === 'table') {
    const rows = p.rows ?? [];
    if (!rows.length) {
      return (
        <div className="w-full h-full grid place-items-center text-[10px] text-fg-muted border border-dashed border-fg-subtle/50 rounded">
          <span className="flex items-center gap-1">
            <TableIcon className="h-3 w-3" /> Add rows
          </span>
        </div>
      );
    }
    return (
      <table
        className="w-full h-full border-collapse"
        style={{ fontSize: `${Math.max((p.fontsize ?? 9) - 1, 5)}px` }}
      >
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td
                  key={c}
                  className="truncate px-0.5"
                  style={{
                    border: `1px solid ${p.border_color || '#333'}`,
                    background: p.header !== false && r === 0 ? '#eee' : undefined,
                    fontWeight: p.header !== false && r === 0 ? 700 : 400,
                    color: '#000',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return null;
}

/** Per-kind property editing, shown in the side panel. */
export function AuthoringInspector({
  placement: p,
  documentId,
  onChange,
  onAssetUploaded,
}: {
  placement: Placement;
  documentId: string;
  onChange: (patch: Partial<Placement>) => void;
  onAssetUploaded: (asset: DocumentAsset, objectUrl: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<DocumentAsset>(
        `/documents/${documentId}/assets`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      // Preview from the local file so the canvas updates immediately, without
      // a round trip to fetch back what we just sent.
      return { asset: data, objectUrl: URL.createObjectURL(file) };
    },
    onSuccess: ({ asset, objectUrl }) => {
      onAssetUploaded(asset, objectUrl);
      onChange({ asset_id: asset.asset_id });
      // Match the box to the image's aspect ratio so it isn't distorted.
      if (asset.width && asset.height) {
        const width = p.width ?? 140;
        onChange({
          asset_id: asset.asset_id,
          height: Math.round((width * asset.height) / asset.width),
        });
      }
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail || 'Could not upload that image'),
  });

  if (p.kind === 'image') {
    return (
      <div className="space-y-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/bmp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate(f);
            e.target.value = '';
          }}
        />
        <Button
          variant="outline"
          fullWidth
          onClick={() => fileRef.current?.click()}
          loading={upload.isPending}
        >
          {!upload.isPending && <Upload className="h-4 w-4" />}
          {p.asset_id ? 'Replace image' : 'Choose image'}
        </Button>
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          <input
            type="checkbox"
            checked={p.keep_proportion !== false}
            onChange={(e) => onChange({ keep_proportion: e.target.checked })}
          />
          Keep proportions
        </label>
        <p className="text-xs text-fg-subtle">PNG, JPEG, GIF or BMP · max 10MB</p>
      </div>
    );
  }

  if (p.kind === 'link') {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="link-url">Link address</Label>
          <Input
            id="link-url"
            value={p.url ?? ''}
            placeholder="https://example.com"
            onChange={(e) => onChange({ url: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="link-label">Visible text</Label>
          <Input
            id="link-label"
            value={p.value ?? ''}
            placeholder="Optional"
            onChange={(e) => onChange({ value: e.target.value })}
          />
          <p className="text-xs text-fg-subtle">
            Leave empty to make an invisible clickable area — useful over an image.
          </p>
        </div>
      </div>
    );
  }

  if (p.kind === 'richtext') {
    return (
      <div className="space-y-2">
        <Label>Content</Label>
        <RichTextEditor
          value={p.html ?? ''}
          onChange={(html) => onChange({ html })}
        />
        <div className="space-y-1.5">
          <Label htmlFor="rt-align">Alignment</Label>
          <select
            id="rt-align"
            value={p.align ?? 'left'}
            onChange={(e) => onChange({ align: e.target.value as Placement['align'] })}
            className="w-full h-9 px-2 rounded-lg bg-bg-elevated border border-border text-sm text-fg"
          >
            {['left', 'center', 'right', 'justify'].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-fg-subtle">
          Text reflows inside the box. If it doesn't fit, it's scaled down — drag
          the box bigger and it returns to full size.
        </p>
      </div>
    );
  }

  if (p.kind === 'table') {
    const rows = p.rows ?? [['', '']];
    const cols = Math.max(...rows.map((r) => r.length), 1);

    const setRows = (next: string[][]) => onChange({ rows: next });

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRows([...rows, Array(cols).fill('')])}
          >
            <Plus className="h-3.5 w-3.5" />
            Row
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRows(rows.map((r) => [...r, '']))}
          >
            <Plus className="h-3.5 w-3.5" />
            Column
          </Button>
        </div>

        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {rows.map((row, r) => (
            <div key={r} className="flex items-center gap-1">
              {Array.from({ length: cols }).map((_, c) => (
                <input
                  key={c}
                  value={row[c] ?? ''}
                  placeholder={p.header !== false && r === 0 ? 'Heading' : 'Cell'}
                  onChange={(e) => {
                    const next = rows.map((rr) => [...rr]);
                    while (next[r].length < cols) next[r].push('');
                    next[r][c] = e.target.value;
                    setRows(next);
                  }}
                  className={cn(
                    'flex-1 min-w-0 h-8 px-2 rounded-md bg-bg-elevated border border-border text-xs text-fg',
                    p.header !== false && r === 0 && 'font-semibold'
                  )}
                />
              ))}
              <button
                onClick={() =>
                  setRows(rows.length > 1 ? rows.filter((_, i) => i !== r) : rows)
                }
                disabled={rows.length <= 1}
                title="Remove row"
                className="h-8 w-8 grid place-items-center rounded-md text-fg-subtle hover:text-danger disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-fg-muted">
          <input
            type="checkbox"
            checked={p.header !== false}
            onChange={(e) => onChange({ header: e.target.checked })}
          />
          First row is a header
        </label>
      </div>
    );
  }

  return null;
}

/** Password-protected download. The password is never stored. */
export function ProtectDialog({
  documentId,
  fileName,
  open,
  onClose,
}: {
  documentId: string;
  fileName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [allowPrinting, setAllowPrinting] = useState(true);

  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < 4;

  const download = useMutation({
    mutationFn: async () => {
      const resp = await api.post(
        `/documents/${documentId}/protect`,
        { password, allow_printing: allowPrinting },
        { responseType: 'blob' }
      );
      return resp.data as Blob;
    },
    onSuccess: (blob) => {
      const base = fileName.replace(/\.[^.]+$/, '') || 'document';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${base}-protected.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Protected copy downloaded');
      setPassword('');
      setConfirm('');
      onClose();
    },
    onError: async (err: any) => {
      let detail = 'Could not protect the document';
      const data = err?.response?.data;
      try {
        if (data instanceof Blob) detail = JSON.parse(await data.text())?.detail || detail;
        else if (data?.detail) detail = data.detail;
      } catch {
        /* keep the generic message */
      }
      toast.error(detail);
    },
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !download.isPending && onClose()}
    >
      <div
        className="bg-bg-elevated border border-border rounded-2xl shadow-card max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Password protect"
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-gradient-brand grid place-items-center text-white shrink-0">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-fg">
              Password protect
            </h3>
            <p className="text-xs text-fg-muted">
              Encrypts the PDF with AES-256 as it downloads.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pw">Password</Label>
            <Input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {tooShort && (
              <p className="text-xs text-danger">At least 4 characters.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw2">Confirm password</Label>
            <Input
              id="pw2"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {mismatch && (
              <p className="text-xs text-danger">Passwords don't match.</p>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            <input
              type="checkbox"
              checked={allowPrinting}
              onChange={(e) => setAllowPrinting(e.target.checked)}
            />
            Allow printing
          </label>

          <div className="rounded-xl border border-border bg-bg-inset p-3 text-xs text-fg-muted">
            We never store this password. If it's lost, the file can't be
            recovered — keep your unprotected copy.
          </div>

          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={onClose}>
              Cancel
            </Button>
            <Button
              fullWidth
              disabled={
                password.length < 4 || password !== confirm || download.isPending
              }
              loading={download.isPending}
              onClick={() => download.mutate()}
            >
              {!download.isPending && <Lock className="h-4 w-4" />}
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
