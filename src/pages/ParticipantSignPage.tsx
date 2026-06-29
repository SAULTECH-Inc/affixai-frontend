/**
 * ParticipantSignPage — authenticated participant signing editor.
 *
 * Reached via `/documents/:id/sign?token=:inviteToken` after the auth redirect
 * from GuestSignPage. Loads the document and the participant's pre-assigned
 * signing targets (my_targets) from the shared token endpoint, then presents
 * the full drag-and-drop editor. On submit, calls POST /documents/:id/participant-sign.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  X,
  PenTool,
  Camera,
  Calendar,
  Clock,
  Hash,
  Type as TypeIcon,
  Search,
  MessageSquare,
  Send as SendIcon,
  CornerDownRight,
  Trash2,
  CheckCircle2,
  Save,
  Layers,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const API_BASE =
  import.meta.env.VITE_API_URL || 'https://affixai-backend.vercel.app/api/v1';
const guestApi = axios.create({ baseURL: API_BASE });
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Sheet } from '@/components/ui/Sheet';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/cn';
import type { Placement, PlacementKind } from '@/types';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const RENDER_WIDTH_PX = 720;

// ---- Types ------------------------------------------------------------------

interface SigningTarget {
  id: string;
  kind: 'signature' | 'initials' | 'date' | 'text';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string | null;
  sort_order: number;
  filled_at: string | null;
}

interface SharedDocData {
  document_id: string;
  original_file_name: string;
  me: {
    id: string;
    role: string;
    is_my_turn: boolean;
  };
  my_targets: SigningTarget[];
}

interface AnchoredCommentDto {
  id: string;
  document_id: string;
  user_id: string | null;
  parent_id: string | null;
  author_name: string;
  author_email: string | null;
  body: string;
  page: number | null;
  x: number | null;
  y: number | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  reply_count: number;
}

interface DraggablePaletteItem {
  id: string;
  label: string;
  kind: PlacementKind;
  value?: string;
  field_name?: string;
  icon?: React.ReactNode;
  width: number;
  height: number;
}

// ---- Font config (same as DocumentEditPage) --------------------------------

const FONT_FAMILIES: { value: string; label: string; cssFamily: string; category?: string }[] = [
  { value: 'helv', label: 'Helvetica', cssFamily: 'Helvetica, Arial, sans-serif', category: 'sans' },
  { value: 'tiro', label: 'Times', cssFamily: '"Times New Roman", Times, serif', category: 'serif' },
  { value: 'cour', label: 'Courier', cssFamily: '"Courier New", Courier, monospace', category: 'mono' },
  { value: 'dancing', label: 'Dancing Script', cssFamily: '"Dancing Script", "Snell Roundhand", cursive', category: 'script' },
  { value: 'great_vibes', label: 'Great Vibes', cssFamily: '"Great Vibes", "Apple Chancery", cursive', category: 'calligraphy' },
  { value: 'caveat', label: 'Caveat', cssFamily: '"Caveat", "Bradley Hand", "Marker Felt", cursive', category: 'handwriting' },
  { value: 'sacramento', label: 'Sacramento', cssFamily: '"Sacramento", "Snell Roundhand", cursive', category: 'signature' },
];

const COLOR_PRESETS = ['#000000', '#1e3a8a', '#7e22ce', '#dc2626', '#0f766e', '#a16207'];

// ---- Helpers ----------------------------------------------------------------

/**
 * Convert a signing target from the shared API to a Placement for the editor.
 * Value starts empty — the participant fills it in.
 */
function targetToPlacement(t: SigningTarget): Placement {
  return {
    kind: t.kind as PlacementKind,
    page: t.page,
    x: t.x,
    y: t.y,
    value: '',
    field_name: null,
    fontsize: 10,
    font_family: 'helv',
    bold: false,
    italic: false,
    color: '#000000',
    width: t.width,
    height: t.height,
  };
}

function buildPlacement(
  item: DraggablePaletteItem,
  page: number,
  xPdf: number,
  yPdf: number,
  defaults: { font_family: string; fontsize: number; bold: boolean; italic: boolean; color: string },
): Placement {
  return {
    kind: item.kind,
    page,
    x: xPdf,
    y: yPdf,
    value: item.value ?? '',
    field_name: item.field_name ?? null,
    fontsize: defaults.fontsize,
    font_family: defaults.font_family,
    bold: defaults.bold,
    italic: defaults.italic,
    color: defaults.color,
    width: item.width,
    height: item.height,
  };
}

// ---- Main component ---------------------------------------------------------

export default function ParticipantSignPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token');

  const [placements, setPlacements] = useState<Placement[]>([]);
  const [hasLoadedTargets, setHasLoadedTargets] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const [armedItem, setArmedItem] = useState<DraggablePaletteItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [commentMode, setCommentMode] = useState(false);
  const [pendingComment, setPendingComment] = useState<{
    page: number;
    x: number;
    y: number;
  } | null>(null);

  const [defaults, setDefaults] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('editor:font-defaults');
        if (raw) return JSON.parse(raw);
      } catch {
        /* fall through */
      }
    }
    return {
      font_family: 'helv',
      fontsize: 10,
      bold: false,
      italic: false,
      color: '#000000',
    };
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('editor:font-defaults', JSON.stringify(defaults));
    } catch {
      /* ignore */
    }
  }, [defaults]);

  function updateDefaults(next: typeof defaults) {
    setDefaults(next);
    setPlacements((prev) =>
      prev.map((p) => {
        const isText =
          p.kind === 'text' ||
          p.kind === 'number' ||
          p.kind === 'date' ||
          p.kind === 'time' ||
          p.kind === 'initials';
        if (!isText) return p;
        return {
          ...p,
          font_family: next.font_family,
          fontsize: next.fontsize,
          bold: next.bold,
          italic: next.italic,
          color: next.color,
        };
      })
    );
  }

  // Disarm on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setArmedItem(null);
        setCommentMode(false);
        setPendingComment(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Load anchored comments.
  const { data: anchoredComments, refetch: refetchAnchored } = useQuery({
    queryKey: ['document', id, 'comments', 'anchored'],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<AnchoredCommentDto[]>(`/documents/${id}/comments`);
      return data.filter((c) => c.page !== null && c.x !== null && c.y !== null);
    },
  });

  // Load the shared doc info (my_targets + document name).
  const { data: sharedData } = useQuery({
    queryKey: ['shared', inviteToken],
    enabled: !!inviteToken,
    queryFn: async () => {
      const { data } = await api.get<SharedDocData>(`/shared/${inviteToken}`);
      return data;
    },
    retry: false,
  });

  // Once sharedData loads, seed placements from my_targets (once only).
  useEffect(() => {
    if (!sharedData || hasLoadedTargets) return;
    const initial = sharedData.my_targets.map(targetToPlacement);
    setPlacements((current) => (current.length > 0 ? current : initial));
    setHasLoadedTargets(true);
  }, [sharedData, hasLoadedTargets]);

  // Fetch the document PDF via the shared token endpoint (participants don't
  // own the document so the owner-only /documents/:id/file route would 404).
  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    let objUrl: string | null = null;
    (async () => {
      try {
        const resp = await guestApi.get(`/shared/${inviteToken}/file`, {
          responseType: 'blob',
        });
        if (cancelled) return;
        objUrl = URL.createObjectURL(resp.data);
        setPdfUrl(objUrl);
      } catch (err: any) {
        toast.error(err?.response?.data?.detail || 'Could not load document');
        navigate('/dashboard');
      }
    })();
    return () => {
      cancelled = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [inviteToken, navigate]);

  // Fetch the user's default signature blob URL for preview.
  const { data: defaultSigUrl } = useQuery({
    queryKey: ['default-signature-blob'],
    queryFn: async () => {
      try {
        const { data: sig } = await api.get<{ id: string }>('/signatures/default');
        const resp = await api.get(`/signatures/${sig.id}/file`, { responseType: 'blob' });
        return URL.createObjectURL(resp.data);
      } catch (e: any) {
        if (e?.response?.status === 404) return null;
        return null;
      }
    },
    staleTime: Infinity,
  });

  // Fetch the user's default passport photo blob URL for preview.
  const { data: defaultPhotoUrl } = useQuery({
    queryKey: ['default-photo-blob'],
    queryFn: async () => {
      try {
        const { data: photo } = await api.get<{ id: string }>('/passport-photos/default');
        const resp = await api.get(`/passport-photos/${photo.id}/file`, { responseType: 'blob' });
        return URL.createObjectURL(resp.data);
      } catch (e: any) {
        if (e?.response?.status === 404) return null;
        return null;
      }
    },
    staleTime: Infinity,
  });

  // Palette items — placeholders only (no vault data needed for signing).
  const paletteItems: DraggablePaletteItem[] = useMemo(() => [
    { id: 'ph.text', label: 'Text', kind: 'text', value: '', icon: <TypeIcon className="h-3.5 w-3.5" />, width: 160, height: 18 },
    { id: 'ph.number', label: 'Number', kind: 'number', value: '', icon: <Hash className="h-3.5 w-3.5" />, width: 80, height: 18 },
    { id: 'ph.date', label: 'Date', kind: 'date', value: '', icon: <Calendar className="h-3.5 w-3.5" />, width: 100, height: 18 },
    { id: 'ph.time', label: 'Time', kind: 'time', value: '', icon: <Clock className="h-3.5 w-3.5" />, width: 70, height: 18 },
    { id: 'ph.signature', label: 'Signature', kind: 'signature', icon: <PenTool className="h-3.5 w-3.5" />, width: 180, height: 40 },
    { id: 'ph.photo', label: 'Passport Photo', kind: 'photo', icon: <Camera className="h-3.5 w-3.5" />, width: 100, height: 130 },
  ], []);

  const filteredPalette = useMemo(() => {
    const q = paletteSearch.trim().toLowerCase();
    if (!q) return paletteItems;
    return paletteItems.filter((it) => it.label.toLowerCase().includes(q));
  }, [paletteItems, paletteSearch]);

  // Submit signature.
  const submitSign = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('placements', JSON.stringify(placements));
      const { data } = await api.post(`/documents/${id}/participant-sign`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Signature submitted successfully!');
      navigate('/dashboard');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Submit failed');
    },
  });

  // Drag state.
  const dragSourceRef = useRef<
    { kind: 'palette'; item: DraggablePaletteItem } | { kind: 'existing'; idx: number } | null
  >(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  function handleDrop(
    e: React.DragEvent<HTMLDivElement>,
    page: number,
    pdfPageWidth: number,
  ) {
    e.preventDefault();
    const source = dragSourceRef.current;
    if (!source) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = pdfPageWidth / rect.width;
    const offset = dragOffsetRef.current;
    const xPdf = (e.clientX - rect.left - offset.x) * ratio;
    const yPdf = (e.clientY - rect.top - offset.y) * ratio;
    if (source.kind === 'palette') {
      setPlacements((prev) => [...prev, buildPlacement(source.item, page, xPdf, yPdf, defaults)]);
    } else if (source.kind === 'existing') {
      setPlacements((prev) =>
        prev.map((p, i) => (i === source.idx ? { ...p, page, x: xPdf, y: yPdf } : p))
      );
    }
    dragSourceRef.current = null;
  }

  function handleCanvasClick(
    e: React.MouseEvent<HTMLDivElement>,
    page: number,
    pdfPageWidth: number,
  ) {
    if (commentMode) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      if (rect.width === 0) return;
      const ratio = pdfPageWidth / rect.width;
      const xPdf = (e.clientX - rect.left) * ratio;
      const yPdf = (e.clientY - rect.top) * ratio;
      setPendingComment({ page, x: xPdf, y: yPdf });
      setCommentMode(false);
      return;
    }
    if (!armedItem) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = pdfPageWidth / rect.width;
    const xPdf = (e.clientX - rect.left) * ratio;
    const yPdf = (e.clientY - rect.top) * ratio;
    setPlacements((prev) => [...prev, buildPlacement(armedItem, page, xPdf, yPdf, defaults)]);
  }

  function deletePlacement(idx: number) {
    setPlacements((prev) => prev.filter((_, i) => i !== idx));
  }

  function updatePlacementValue(idx: number, value: string) {
    setPlacements((prev) => prev.map((p, i) => (i === idx ? { ...p, value } : p)));
  }

  function updatePlacement(idx: number, changes: Partial<Placement>) {
    setPlacements((prev) => prev.map((p, i) => (i === idx ? { ...p, ...changes } : p)));
  }

  return (
    <div>
      <PageHeader
        title="Sign document"
        description="Review and complete the required fields, then submit your signature."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={commentMode ? 'primary' : 'outline'}
              onClick={() => {
                setCommentMode((v) => !v);
                setArmedItem(null);
                setPendingComment(null);
              }}
              title={commentMode ? 'Exit comment mode (Esc)' : 'Click anywhere on the document to leave a comment'}
            >
              <MessageSquare className="h-4 w-4" />
              {commentMode ? 'Cancel comment' : 'Comment'}
            </Button>
            <Button
              onClick={() => submitSign.mutate()}
              loading={submitSign.isPending}
              disabled={placements.length === 0}
            >
              <Save className="h-4 w-4" />
              Submit signature
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <Card className="overflow-hidden" onClick={() => setSelectedIdx(null)}>
          <CardContent className="p-0 bg-bg-inset">
            {!pdfUrl ? (
              <div className="h-[60vh] grid place-items-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="max-h-[80vh] overflow-y-auto p-4 flex flex-col items-center gap-4">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  loading={<Spinner size="lg" />}
                >
                  {Array.from({ length: numPages }, (_, i) => (
                    <PdfPageWithOverlay
                      key={i}
                      pageNumber={i}
                      placements={placements}
                      defaultSigUrl={defaultSigUrl ?? null}
                      defaultPhotoUrl={defaultPhotoUrl ?? null}
                      isArmed={armedItem !== null}
                      onDrop={(e, p, w) => handleDrop(e, p, w)}
                      onCanvasClick={(e, p, w) => handleCanvasClick(e, p, w)}
                      onPlacementDragStart={(idx, offsetX, offsetY) => {
                        dragSourceRef.current = { kind: 'existing', idx };
                        dragOffsetRef.current = { x: offsetX, y: offsetY };
                      }}
                      onPlacementDragEnd={() => {
                        if (dragSourceRef.current?.kind === 'existing') {
                          dragSourceRef.current = null;
                        }
                      }}
                      onPlacementDelete={(idx) => {
                        deletePlacement(idx);
                        if (selectedIdx === idx) setSelectedIdx(null);
                      }}
                      onPlacementValueChange={updatePlacementValue}
                      onPlacementClick={setSelectedIdx}
                      selectedIdx={selectedIdx}
                      commentMode={commentMode}
                      anchoredComments={anchoredComments?.filter((c) => c.page === i) ?? []}
                      pendingComment={pendingComment?.page === i ? pendingComment : null}
                      onCommentSubmit={async (body, x, y) => {
                        try {
                          await api.post(`/documents/${id}/comments`, { body, page: i, x, y });
                          await refetchAnchored();
                          setPendingComment(null);
                        } catch (err: any) {
                          toast.error(err?.response?.data?.detail || 'Could not save comment');
                        }
                      }}
                      onCommentCancel={() => setPendingComment(null)}
                      onCommentRefresh={refetchAnchored}
                      documentId={id!}
                    />
                  ))}
                </Document>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desktop panel */}
        <Card className="self-start hidden lg:block">
          <CardContent>
            <PalettePanel
              selectedIdx={selectedIdx}
              placements={placements}
              paletteSearch={paletteSearch}
              filteredPalette={filteredPalette}
              armedItem={armedItem}
              defaults={defaults}
              preAssignedCount={sharedData?.my_targets.length ?? 0}
              panelTitle="Signing fields"
              onPaletteSearch={setPaletteSearch}
              onArm={(it) => setArmedItem((cur) => (cur?.id === it.id ? null : it))}
              onDisarm={() => setArmedItem(null)}
              onDefaultsChange={updateDefaults}
              onPaletteDragStart={(it) => {
                dragSourceRef.current = { kind: 'palette', item: it };
                dragOffsetRef.current = { x: 0, y: 0 };
              }}
              onPaletteDragEnd={() => { dragSourceRef.current = null; }}
              onDeselect={() => setSelectedIdx(null)}
              onPlacementChange={(changes) => selectedIdx !== null && updatePlacement(selectedIdx, changes)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Mobile: floating "Fields" button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white rounded-full px-4 py-3 shadow-lg text-sm font-medium transition"
          aria-label="Open fields panel"
        >
          <Layers className="h-4 w-4" />
          Fields
          {placements.length > 0 && (
            <span className="bg-white/25 rounded-full px-1.5 py-0.5 text-xs font-bold leading-none">
              {placements.length}
            </span>
          )}
        </button>
      </div>

      {/* Mobile: bottom sheet */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Signing fields"
      >
        <PalettePanel
          selectedIdx={selectedIdx}
          placements={placements}
          paletteSearch={paletteSearch}
          filteredPalette={filteredPalette}
          armedItem={armedItem}
          defaults={defaults}
          preAssignedCount={sharedData?.my_targets.length ?? 0}
          panelTitle="Signing fields"
          onPaletteSearch={setPaletteSearch}
          onArm={(it) => { setArmedItem((cur) => (cur?.id === it.id ? null : it)); setSheetOpen(false); }}
          onDisarm={() => setArmedItem(null)}
          onDefaultsChange={updateDefaults}
          onPaletteDragStart={(it) => {
            dragSourceRef.current = { kind: 'palette', item: it };
            dragOffsetRef.current = { x: 0, y: 0 };
          }}
          onPaletteDragEnd={() => { dragSourceRef.current = null; }}
          onDeselect={() => setSelectedIdx(null)}
          onPlacementChange={(changes) => selectedIdx !== null && updatePlacement(selectedIdx, changes)}
        />
      </Sheet>
    </div>
  );
}

// ---- Shared palette panel component ----------------------------------------

interface PalettePanelProps {
  selectedIdx: number | null;
  placements: Placement[];
  paletteSearch: string;
  filteredPalette: DraggablePaletteItem[];
  armedItem: DraggablePaletteItem | null;
  defaults: { font_family: string; fontsize: number; bold: boolean; italic: boolean; color: string };
  preAssignedCount?: number;
  panelTitle?: string;
  onPaletteSearch: (v: string) => void;
  onArm: (it: DraggablePaletteItem) => void;
  onDisarm: () => void;
  onDefaultsChange: (v: any) => void;
  onPaletteDragStart: (it: DraggablePaletteItem) => void;
  onPaletteDragEnd: () => void;
  onDeselect: () => void;
  onPlacementChange: (changes: Partial<Placement>) => void;
}

function PalettePanel({
  selectedIdx,
  placements,
  paletteSearch,
  filteredPalette,
  armedItem,
  defaults,
  preAssignedCount = 0,
  panelTitle = 'Fields',
  onPaletteSearch,
  onArm,
  onDisarm,
  onDefaultsChange,
  onPaletteDragStart,
  onPaletteDragEnd,
  onDeselect,
  onPlacementChange,
}: PalettePanelProps) {
  if (selectedIdx !== null && placements[selectedIdx]) {
    return (
      <FontControlsPanel
        placement={placements[selectedIdx]}
        onChange={onPlacementChange}
        onDeselect={onDeselect}
      />
    );
  }
  return (
    <>
      <h2 className="font-display text-lg font-semibold text-fg mb-1">{panelTitle}</h2>
      <p className="text-xs text-fg-muted mb-3">
        {placements.length} placement{placements.length === 1 ? '' : 's'}
        {preAssignedCount > 0 ? ` · ${preAssignedCount} pre-assigned` : ''}
      </p>

      {armedItem !== null && (
        <div className="mb-3 p-2.5 rounded-xl border border-brand-500/40 bg-gradient-brand-soft flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-bg-elevated grid place-items-center text-brand-400 shrink-0">
            {armedItem.icon ?? <TypeIcon className="h-3.5 w-3.5" />}
          </div>
          <div className="text-xs text-fg flex-1 min-w-0">
            <div className="font-medium truncate">{armedItem.label}</div>
            <div className="text-fg-muted">Click on the document to drop. Esc cancels.</div>
          </div>
          <button
            onClick={onDisarm}
            className="text-xs text-fg-muted hover:text-fg px-2 py-1 rounded-md border border-border hover:bg-bg-elevated shrink-0"
          >
            Done
          </button>
        </div>
      )}

      <DefaultsBlock value={defaults} onChange={onDefaultsChange} />

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-subtle" />
        <Input
          placeholder="Search…"
          value={paletteSearch}
          onChange={(e) => onPaletteSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>
      <div className="space-y-1 pr-1">
        {filteredPalette.map((it) => {
          const isThisArmed = armedItem !== null && armedItem.id === it.id;
          return (
            <div
              key={it.id}
              draggable
              onClick={() => onArm(it)}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'copyMove';
                e.dataTransfer.setData('text/plain', it.id);
                onPaletteDragStart(it);
              }}
              onDragEnd={onPaletteDragEnd}
              className={cn(
                'group p-2 rounded-lg border bg-bg-inset cursor-pointer transition',
                isThisArmed
                  ? 'border-brand-500/60 bg-gradient-brand-soft ring-2 ring-brand-500/30'
                  : 'border-border hover:border-brand-500/40 hover:bg-bg-elevated',
              )}
            >
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-bg-elevated grid place-items-center text-fg-muted shrink-0">
                  {it.icon ?? <TypeIcon className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-fg truncate">{it.label}</div>
                  {it.value && (
                    <div className="text-xs text-fg-muted truncate">{it.value}</div>
                  )}
                </div>
                {isThisArmed && (
                  <span className="text-[10px] uppercase tracking-wider text-brand-400 font-semibold shrink-0">
                    armed
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {filteredPalette.length === 0 && (
          <p className="text-xs text-fg-subtle py-4 text-center">No matches.</p>
        )}
      </div>
    </>
  );
}

// ---- Font controls panel ---------------------------------------------------

function FontControlsPanel({
  placement: p,
  onChange,
  onDeselect,
}: {
  placement: Placement;
  onChange: (changes: Partial<Placement>) => void;
  onDeselect: () => void;
}) {
  const isText = p.kind === 'text' || p.kind === 'number' || p.kind === 'date' || p.kind === 'time' || p.kind === 'initials';
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-fg capitalize">
            {p.kind} placement
          </h2>
          <p className="text-xs text-fg-muted">
            {p.field_name ? `Field: ${p.field_name}` : `On page ${p.page + 1}`}
          </p>
        </div>
        <button
          onClick={onDeselect}
          className="h-7 w-7 grid place-items-center rounded-lg border border-border text-fg-muted hover:bg-bg-inset"
          aria-label="Back to palette"
          title="Back to palette"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {!isText ? (
        <p className="text-xs text-fg-muted p-3 rounded-xl bg-bg-inset border border-border">
          Image placements use your default {p.kind}. Manage them on the
          Signatures / Passport Photo pages.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Font family</label>
            <select
              value={p.font_family ?? 'helv'}
              onChange={(e) => onChange({ font_family: e.target.value })}
              className="w-full h-9 px-2 rounded-lg border border-border bg-bg-elevated text-sm text-fg"
              style={{
                fontFamily: FONT_FAMILIES.find((f) => f.value === (p.font_family ?? 'helv'))?.cssFamily,
              }}
            >
              <optgroup label="Standard">
                {FONT_FAMILIES.filter((f) => ['sans', 'serif', 'mono'].includes(f.category || '')).map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </optgroup>
              <optgroup label="Signing">
                {FONT_FAMILIES.filter((f) => ['script', 'calligraphy', 'handwriting', 'signature'].includes(f.category || '')).map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </optgroup>
            </select>
            {p.value && (
              <div
                className="mt-2 px-3 py-2 rounded-lg border border-border bg-bg-base text-sm text-fg truncate"
                style={{ fontFamily: FONT_FAMILIES.find((f) => f.value === (p.font_family ?? 'helv'))?.cssFamily }}
                title="Preview of the stamp text"
              >
                {p.value}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">
              Size <span className="text-fg-subtle">({p.fontsize ?? 10}pt)</span>
            </label>
            <input
              type="range"
              min={6}
              max={36}
              step={1}
              value={p.fontsize ?? 10}
              onChange={(e) => onChange({ fontsize: Number(e.target.value) })}
              className="w-full accent-brand-500"
            />
            <div className="flex gap-1 mt-1">
              {[8, 10, 12, 14, 18, 24].map((s) => (
                <button
                  key={s}
                  onClick={() => onChange({ fontsize: s })}
                  className={cn(
                    'flex-1 h-7 text-xs rounded-md border transition',
                    (p.fontsize ?? 10) === s
                      ? 'bg-brand-500/15 border-brand-500/40 text-fg'
                      : 'border-border text-fg-muted hover:bg-bg-inset'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onChange({ bold: !p.bold })}
              className={cn(
                'flex-1 h-9 rounded-lg border transition font-bold',
                p.bold ? 'bg-brand-500/15 border-brand-500/40 text-fg' : 'border-border text-fg-muted hover:bg-bg-inset'
              )}
              title="Bold"
            >
              B
            </button>
            <button
              onClick={() => onChange({ italic: !p.italic })}
              className={cn(
                'flex-1 h-9 rounded-lg border transition italic',
                p.italic ? 'bg-brand-500/15 border-brand-500/40 text-fg' : 'border-border text-fg-muted hover:bg-bg-inset'
              )}
              title="Italic"
            >
              I
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Color</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                value={p.color ?? '#000000'}
                onChange={(e) => onChange({ color: e.target.value })}
                className="h-9 w-9 rounded-lg border border-border bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={p.color ?? '#000000'}
                onChange={(e) => onChange({ color: e.target.value })}
                className="flex-1 h-9 px-2 rounded-lg border border-border bg-bg-elevated text-sm font-mono text-fg"
              />
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => onChange({ color: c })}
                  className={cn(
                    'aspect-square rounded-md border-2 transition',
                    p.color === c ? 'border-brand-400' : 'border-transparent hover:border-border-strong'
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-[10px] text-fg-subtle">
              Tip: adjust font and color to match the document's style.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- DefaultsBlock ---------------------------------------------------------

interface FontDefaults {
  font_family: string;
  fontsize: number;
  bold: boolean;
  italic: boolean;
  color: string;
}

function DefaultsBlock({
  value,
  onChange,
}: {
  value: FontDefaults;
  onChange: (next: FontDefaults) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const familyLabel =
    FONT_FAMILIES.find((f) => f.value === value.font_family)?.label ?? value.font_family;

  return (
    <div className="mb-3 rounded-xl border border-border bg-bg-inset overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-2.5 hover:bg-bg-elevated transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-fg-subtle">Default font</div>
          <div
            className="text-xs text-fg truncate"
            style={{
              fontFamily: FONT_FAMILIES.find((f) => f.value === value.font_family)?.cssFamily,
              fontWeight: value.bold ? 700 : 400,
              fontStyle: value.italic ? 'italic' : 'normal',
              color: value.color,
            }}
          >
            {familyLabel.split(' ')[0]} · {value.fontsize}pt
            {value.bold ? ' · B' : ''}
            {value.italic ? ' · I' : ''}
          </div>
        </div>
        <span className="text-xs text-fg-muted">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="p-3 border-t border-border space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-fg-subtle mb-1">Family</label>
            <select
              value={value.font_family}
              onChange={(e) => onChange({ ...value, font_family: e.target.value })}
              className="w-full h-8 px-2 rounded-lg border border-border bg-bg-elevated text-xs text-fg"
              style={{ fontFamily: FONT_FAMILIES.find((f) => f.value === value.font_family)?.cssFamily }}
            >
              <optgroup label="Standard">
                {FONT_FAMILIES.filter((f) => ['sans', 'serif', 'mono'].includes(f.category || '')).map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </optgroup>
              <optgroup label="Signing">
                {FONT_FAMILIES.filter((f) => ['script', 'calligraphy', 'handwriting', 'signature'].includes(f.category || '')).map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-fg-subtle mb-1">
              Size <span className="normal-case text-fg-muted">({value.fontsize}pt)</span>
            </label>
            <input
              type="range"
              min={6}
              max={36}
              step={1}
              value={value.fontsize}
              onChange={(e) => onChange({ ...value, fontsize: Number(e.target.value) })}
              className="w-full accent-brand-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onChange({ ...value, bold: !value.bold })}
              className={cn(
                'flex-1 h-8 rounded-lg border text-sm font-bold transition',
                value.bold ? 'bg-brand-500/15 border-brand-500/40 text-fg' : 'border-border text-fg-muted hover:bg-bg-elevated'
              )}
            >
              B
            </button>
            <button
              onClick={() => onChange({ ...value, italic: !value.italic })}
              className={cn(
                'flex-1 h-8 rounded-lg border italic text-sm transition',
                value.italic ? 'bg-brand-500/15 border-brand-500/40 text-fg' : 'border-border text-fg-muted hover:bg-bg-elevated'
              )}
            >
              I
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value.color}
              onChange={(e) => onChange({ ...value, color: e.target.value })}
              className="h-8 w-8 rounded-lg border border-border cursor-pointer"
            />
            <input
              type="text"
              value={value.color}
              onChange={(e) => onChange({ ...value, color: e.target.value })}
              className="flex-1 h-8 px-2 rounded-lg border border-border bg-bg-elevated text-xs font-mono text-fg"
            />
          </div>

          <p className="text-[10px] text-fg-subtle">
            Applied to every text field — existing and new.
          </p>
        </div>
      )}
    </div>
  );
}

// ---- PdfPageWithOverlay ----------------------------------------------------

interface PdfPageWithOverlayProps {
  pageNumber: number;
  placements: Placement[];
  defaultSigUrl: string | null;
  defaultPhotoUrl: string | null;
  selectedIdx: number | null;
  isArmed: boolean;
  onDrop: (e: React.DragEvent<HTMLDivElement>, page: number, pdfPageWidth: number) => void;
  onCanvasClick: (e: React.MouseEvent<HTMLDivElement>, page: number, pdfPageWidth: number) => void;
  onPlacementDragStart: (idx: number, offsetX: number, offsetY: number) => void;
  onPlacementDragEnd: () => void;
  onPlacementDelete: (idx: number) => void;
  onPlacementValueChange: (idx: number, value: string) => void;
  onPlacementClick: (idx: number) => void;
  commentMode: boolean;
  anchoredComments: AnchoredCommentDto[];
  pendingComment: { page: number; x: number; y: number } | null;
  onCommentSubmit: (body: string, x: number, y: number) => void | Promise<void>;
  onCommentCancel: () => void;
  onCommentRefresh: () => void;
  documentId: string;
}

function PdfPageWithOverlay({
  pageNumber,
  placements,
  defaultSigUrl,
  defaultPhotoUrl,
  selectedIdx,
  isArmed,
  onDrop,
  onCanvasClick,
  onPlacementDragStart,
  onPlacementDragEnd,
  onPlacementDelete,
  onPlacementValueChange,
  onPlacementClick,
  commentMode,
  anchoredComments,
  pendingComment,
  onCommentSubmit,
  onCommentCancel,
  onCommentRefresh,
  documentId,
}: PdfPageWithOverlayProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfSize, setPdfSize] = useState({ width: RENDER_WIDTH_PX, height: RENDER_WIDTH_PX * 1.4 });
  const [rendered, setRendered] = useState({ width: RENDER_WIDTH_PX, height: RENDER_WIDTH_PX * 1.4 });

  const pagePlacements = placements
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => p.page === pageNumber);

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        onDrop={(e) => onDrop(e, pageNumber, pdfSize.width)}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onClick={(e) => onCanvasClick(e, pageNumber, pdfSize.width)}
        className="relative shadow-card"
        style={isArmed || commentMode ? { cursor: 'crosshair' } : undefined}
      >
        <Page
          pageNumber={pageNumber + 1}
          width={RENDER_WIDTH_PX}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          onLoadSuccess={(page) => {
            setPdfSize({ width: page.originalWidth, height: page.originalHeight });
          }}
          onRenderSuccess={() => {
            const c = wrapperRef.current?.querySelector('canvas');
            canvasRef.current = c ?? null;
            if (c) setRendered({ width: c.clientWidth, height: c.clientHeight });
          }}
        />

        {pagePlacements.map(({ p, idx }) => {
          const ratio = rendered.width / pdfSize.width;
          const left = p.x * ratio;
          const top = p.y * ratio;
          const w = (p.width ?? 160) * ratio;
          const h = (p.height ?? 18) * ratio;
          const isEditable = !p.field_name && (
            p.kind === 'text' ||
            p.kind === 'number' ||
            p.kind === 'date' ||
            p.kind === 'time'
          );
          return (
            <OverlayBox
              key={idx}
              placement={p}
              idx={idx}
              left={left}
              top={top}
              width={w}
              height={h}
              isEditable={isEditable}
              isSelected={selectedIdx === idx}
              defaultSigUrl={defaultSigUrl}
              defaultPhotoUrl={defaultPhotoUrl}
              onDragStart={(ox, oy) => onPlacementDragStart(idx, ox, oy)}
              onDragEnd={onPlacementDragEnd}
              onDelete={() => onPlacementDelete(idx)}
              onValueChange={(v) => onPlacementValueChange(idx, v)}
              onClick={() => onPlacementClick(idx)}
            />
          );
        })}

        {anchoredComments
          .filter((c) => !c.parent_id)
          .map((c) => {
            const ratio = rendered.width / pdfSize.width;
            const left = (c.x ?? 0) * ratio;
            const top = (c.y ?? 0) * ratio;
            return (
              <CommentPin
                key={c.id}
                top={top}
                left={left}
                comment={c}
                allComments={anchoredComments}
                documentId={documentId}
                onRefresh={onCommentRefresh}
              />
            );
          })}

        {pendingComment && (
          <CommentComposerAt
            top={pendingComment.y * (rendered.width / pdfSize.width)}
            left={pendingComment.x * (rendered.width / pdfSize.width)}
            onSubmit={(body) => onCommentSubmit(body, pendingComment.x, pendingComment.y)}
            onCancel={onCommentCancel}
          />
        )}
      </div>
    </div>
  );
}

// ---- OverlayBox ------------------------------------------------------------

function OverlayBox({
  placement: p,
  idx,
  left,
  top,
  width,
  height,
  isEditable,
  isSelected,
  defaultSigUrl,
  defaultPhotoUrl,
  onDragStart,
  onDragEnd,
  onDelete,
  onValueChange,
  onClick,
}: {
  placement: Placement;
  idx: number;
  left: number;
  top: number;
  width: number;
  height: number;
  isEditable: boolean;
  isSelected: boolean;
  defaultSigUrl: string | null;
  defaultPhotoUrl: string | null;
  onDragStart: (offsetX: number, offsetY: number) => void;
  onDragEnd: () => void;
  onDelete: () => void;
  onValueChange: (v: string) => void;
  onClick: () => void;
}) {
  const isImageKind = p.kind === 'signature' || p.kind === 'photo';
  const previewUrl =
    p.kind === 'signature' ? defaultSigUrl
    : p.kind === 'photo' ? defaultPhotoUrl
    : null;

  const inputType =
    p.kind === 'number' ? 'number'
    : p.kind === 'date' ? 'date'
    : p.kind === 'time' ? 'time'
    : 'text';

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'copyMove';
        e.dataTransfer.setData('text/plain', `placement-${idx}`);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        onDragStart(e.clientX - rect.left, e.clientY - rect.top);
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        position: 'absolute',
        left,
        top,
        ...(isImageKind ? { width, height } : {}),
        zIndex: isSelected ? 11 : 10,
      }}
      className={cn(
        'group rounded-sm cursor-move flex items-center',
        isSelected
          ? 'border border-brand-500 bg-brand-50/30 dark:bg-brand-500/10'
          : cn(
              'border border-transparent hover:border-dashed',
              isImageKind
                ? 'hover:border-fg-muted/70'
                : 'hover:border-fg-subtle/70 hover:bg-bg-base/60',
              'focus-within:border-dashed focus-within:border-brand-400/70',
            ),
      )}
    >
      <div
        className="flex-1 min-w-0 px-0.5 leading-tight whitespace-nowrap overflow-hidden"
        style={
          isImageKind
            ? undefined
            : {
                fontFamily:
                  FONT_FAMILIES.find((f) => f.value === (p.font_family ?? 'helv'))?.cssFamily ||
                  'Helvetica, Arial, sans-serif',
                fontSize: `${Math.max((p.fontsize ?? 10), 6)}px`,
                fontWeight: p.bold ? 700 : 400,
                fontStyle: p.italic ? 'italic' : 'normal',
                color: p.color ?? '#000000',
              }
        }
      >
        {p.kind === 'signature' && (
          previewUrl ? (
            <img
              src={previewUrl}
              alt="Signature"
              draggable={false}
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          ) : (
            <span className="text-danger italic">No signature saved</span>
          )
        )}
        {p.kind === 'photo' && (
          previewUrl ? (
            <img
              src={previewUrl}
              alt="Photo"
              draggable={false}
              className="w-full h-full object-cover pointer-events-none select-none"
            />
          ) : (
            <span className="text-danger italic">No photo saved</span>
          )
        )}
        {p.kind === 'initials' && <span>{p.value || 'Initials'}</span>}
        {!isImageKind && p.kind !== 'initials' && (
          isEditable ? (
            <input
              type={inputType}
              value={p.value ?? ''}
              onChange={(e) => onValueChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              size={Math.max((p.value?.length ?? 0) || (p.kind.length + 2), 4)}
              className="bg-transparent outline-none w-auto"
              style={{
                fontFamily: 'inherit', fontSize: 'inherit',
                fontWeight: 'inherit', fontStyle: 'inherit', color: 'inherit',
                minWidth: 30,
              }}
              placeholder={p.kind}
              draggable={false}
            />
          ) : (
            <span>{p.value}</span>
          )
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        draggable={false}
        className="opacity-0 group-hover:opacity-100 h-4 w-4 rounded-full bg-danger text-white grid place-items-center shrink-0 mr-0.5 transition"
        title="Remove"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

// ---- Comment components ----------------------------------------------------

function CommentPin({
  top,
  left,
  comment,
  allComments,
  documentId,
  onRefresh,
}: {
  top: number;
  left: number;
  comment: AnchoredCommentDto;
  allComments: AnchoredCommentDto[];
  documentId: string;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState('');
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const replies = allComments.filter((c) => c.parent_id === comment.id);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const postReply = useMutation({
    mutationFn: async () => {
      await api.post(`/documents/${documentId}/comments`, {
        body: reply.trim(),
        parent_id: comment.id,
      });
    },
    onSuccess: () => {
      setReply('');
      onRefresh();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail || 'Could not reply'),
  });

  const toggleResolve = useMutation({
    mutationFn: async () => {
      await api.put(`/documents/${documentId}/comments/${comment.id}`, {
        resolved: !comment.resolved,
      });
    },
    onSuccess: onRefresh,
  });

  const deleteThis = useMutation({
    mutationFn: async () => {
      await api.delete(`/documents/${documentId}/comments/${comment.id}`);
    },
    onSuccess: onRefresh,
  });

  return (
    <div
      style={{ position: 'absolute', top, left, zIndex: 20 }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'h-6 w-6 -translate-x-3 -translate-y-3 rounded-full grid place-items-center text-white shadow-md transition',
          comment.resolved ? 'bg-success/80 hover:bg-success' : 'bg-brand-500 hover:bg-brand-400',
        )}
        title={`Comment by ${comment.author_name}`}
      >
        <MessageSquare className="h-3 w-3" />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute z-30 w-72 bg-bg-elevated border border-border rounded-xl shadow-card p-3 left-3 top-3"
        >
          <CommentItem
            author={comment.author_name}
            body={comment.body}
            createdAt={comment.created_at}
            resolved={comment.resolved}
          />
          {replies.length > 0 && (
            <div className="mt-2 pl-3 border-l-2 border-border space-y-2">
              {replies.map((r) => (
                <CommentItem
                  key={r.id}
                  author={r.author_name}
                  body={r.body}
                  createdAt={r.created_at}
                  resolved={false}
                  compact
                />
              ))}
            </div>
          )}

          <div className="mt-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={2}
              placeholder="Write a reply…"
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-bg-base text-xs text-fg resize-y"
            />
            <div className="mt-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  onClick={() => toggleResolve.mutate()}
                  className="text-fg-muted hover:text-fg inline-flex items-center gap-1"
                  title={comment.resolved ? 'Unresolve' : 'Mark resolved'}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {comment.resolved ? 'Unresolve' : 'Resolve'}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this thread?')) {
                      deleteThis.mutate();
                      setOpen(false);
                    }
                  }}
                  className="text-fg-muted hover:text-danger inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
              <button
                onClick={() => postReply.mutate()}
                disabled={!reply.trim() || postReply.isPending}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:underline disabled:opacity-50 disabled:no-underline"
              >
                <CornerDownRight className="h-3 w-3" />
                Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentItem({
  author,
  body,
  createdAt,
  resolved,
  compact,
}: {
  author: string;
  body: string;
  createdAt: string;
  resolved: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn(compact ? 'pt-1' : '')}>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'rounded-full bg-gradient-brand-soft border border-border grid place-items-center text-brand-400 font-bold shrink-0',
            compact ? 'h-5 w-5 text-[9px]' : 'h-6 w-6 text-[10px]'
          )}
        >
          {(author[0] || '?').toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-fg truncate flex items-center gap-1">
            {author}
            {resolved && (
              <span className="text-[9px] text-success uppercase font-semibold">resolved</span>
            )}
          </div>
          <div className="text-[10px] text-fg-subtle">
            {new Date(createdAt).toLocaleString()}
          </div>
        </div>
      </div>
      <div className="text-xs text-fg whitespace-pre-wrap mt-1.5">{body}</div>
    </div>
  );
}

function CommentComposerAt({
  top,
  left,
  onSubmit,
  onCancel,
}: {
  top: number;
  left: number;
  onSubmit: (body: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div
      style={{ position: 'absolute', top, left, zIndex: 25 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="-translate-x-3 -translate-y-3 w-72 bg-bg-elevated border border-brand-500/40 rounded-xl shadow-card p-3">
        <div className="text-xs font-semibold text-fg mb-2 flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-brand-400" />
          New comment here
        </div>
        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Add a comment at this spot…"
          className="w-full px-2 py-1.5 rounded-lg border border-border bg-bg-base text-xs text-fg resize-y"
        />
        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="text-xs text-fg-muted hover:text-fg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            disabled={!body.trim() || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit(body.trim());
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:underline disabled:opacity-50 disabled:no-underline"
          >
            <SendIcon className="h-3 w-3" />
            Post
          </button>
        </div>
      </div>
    </div>
  );
}
