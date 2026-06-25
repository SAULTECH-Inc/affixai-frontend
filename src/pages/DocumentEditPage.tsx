import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  X,
  Save,
  PenTool,
  Camera,
  Calendar,
  Clock,
  Hash,
  Type as TypeIcon,
  Search,
  Mail,
  Check,
  CloudOff,
  Loader2,
  MessageSquare,
  Send as SendIcon,
  CornerDownRight,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/cn';
import type {
  Placement,
  PlacementKind,
  RestampOut,
  SegmentData,
  SegmentRegistryEntry,
} from '@/types';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const RENDER_WIDTH_PX = 720;

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

/**
 * Convert a placement persisted in `Document.field_placements` to our editor
 * Placement shape. The auto-affix pipeline writes its own format
 * `{field_name, value, page, x, y, confidence}` while the editor save uses the
 * full PlacementDto shape `{kind, page, x, y, value, ...}`. Handle both.
 */
function normalisePersistedPlacement(p: any): Placement {
  if (p.kind) {
    // Editor-save shape — y is already the overlay top.
    return {
      kind: p.kind,
      page: p.page ?? 0,
      x: p.x,
      y: p.y,
      value: p.value ?? null,
      field_name: p.field_name ?? null,
      fontsize: p.fontsize ?? 10,
      width: p.width ?? 160,
      height: p.height ?? 18,
    };
  }
  // Auto-affix shape stores `y` as the text baseline. Convert to "overlay top"
  // by shifting up by one fontsize so the editor's coordinate system stays
  // consistent and re-stamping produces the same visual result.
  const fontsize = 10;
  return {
    kind: 'text',
    page: p.page ?? 0,
    x: p.x,
    y: (p.y ?? 0) - fontsize,
    value: p.value ?? null,
    field_name: p.field_name ?? null,
    fontsize,
    width: 160,
    height: 18,
  };
}

export default function DocumentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  // Which placement is currently selected (right panel shows font controls
  // for it). Null = palette mode.
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Click-to-place: when an item is "armed", clicking on the PDF drops it.
  // Stays armed for rapid placement until user disarms (Escape, click same
  // item again, or click "Done").
  const [armedItem, setArmedItem] = useState<DraggablePaletteItem | null>(null);

  // Anchored-comments mode. When ON, clicking the PDF drops a comment pin
  // instead of a placement; the canvas shows existing pins as overlays.
  // Exits via Escape, clicking the same toolbar button, or after submitting
  // a new pin (one-at-a-time UX).
  const [commentMode, setCommentMode] = useState(false);
  const [pendingComment, setPendingComment] = useState<{
    page: number;
    x: number;
    y: number;
  } | null>(null);

  // Defaults applied to every text placement. Changing these propagates to
  // all existing text placements (text/number/date/time/initials) — the user
  // can still override per-placement afterwards. Persisted to localStorage so
  // the chosen font survives a refresh.
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
      window.localStorage.setItem(
        'editor:font-defaults',
        JSON.stringify(defaults)
      );
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [defaults]);

  function updateDefaults(next: typeof defaults) {
    setDefaults(next);
    // Retroactively apply to all existing text placements. Skip image-kinds
    // (signature, photo) because fonts don't apply to them.
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

  // Disarm on Escape — both placement-arm and comment mode.
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

  // Anchored comments for THIS document. List endpoint already exposes
  // page/x/y from Phase C. We filter to pinned ones (page != null) below.
  const { data: anchoredComments, refetch: refetchAnchored } = useQuery({
    queryKey: ['document', id, 'comments', 'anchored'],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<AnchoredCommentDto[]>(
        `/documents/${id}/comments`
      );
      return data.filter(
        (c) => c.page !== null && c.x !== null && c.y !== null
      );
    },
  });

  function updatePlacement(idx: number, changes: Partial<Placement>) {
    setPlacements((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...changes } : p))
    );
  }

  // Build a Placement from a palette item + drop/click coords + the current
  // global defaults.
  function buildPlacement(
    item: DraggablePaletteItem,
    page: number,
    xPdf: number,
    yPdf: number,
  ): Placement {
    return {
      kind: item.kind,
      page,
      x: xPdf,
      y: yPdf,
      value: item.value ?? '',
      field_name: item.field_name ?? null,
      // Text-kind placements inherit defaults.
      fontsize: defaults.fontsize,
      font_family: defaults.font_family,
      bold: defaults.bold,
      italic: defaults.italic,
      color: defaults.color,
      width: item.width,
      height: item.height,
    };
  }

  // Drag state — refs so async event handlers see fresh values.
  const dragSourceRef = useRef<
    { kind: 'palette'; item: DraggablePaletteItem } | { kind: 'existing'; idx: number } | null
  >(null);
  // Offset (in SCREEN px) from the dragged element's top-left to the cursor.
  // For palette items this stays (0,0) — drop anchors at the cursor.
  // For existing overlays we capture where on the box the user grabbed it so
  // the overlay tracks the cursor without jumping.
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Fetch the original PDF for the canvas.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let objUrl: string | null = null;
    (async () => {
      try {
        const resp = await api.get(`/documents/${id}/file/original`, {
          responseType: 'blob',
        });
        if (cancelled) return;
        objUrl = URL.createObjectURL(resp.data);
        setPdfUrl(objUrl);
      } catch (err: any) {
        toast.error(err?.response?.data?.detail || 'Could not load document');
        navigate('/auto-sign');
      }
    })();
    return () => {
      cancelled = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [id, navigate]);

  // Pre-load auto-detected placements once. Guarded so a user who has already
  // started dropping placements while the API call is in flight doesn't get
  // their work overwritten.
  useEffect(() => {
    if (!id || hasLoadedInitial) return;
    (async () => {
      try {
        const { data } = await api.get(`/documents/${id}`);
        const persisted = (data?.field_placements ?? []) as any[];
        const initial = persisted.map(normalisePersistedPlacement);
        setPlacements((current) => (current.length > 0 ? current : initial));
      } catch {
        /* ignore — start with empty state */
      } finally {
        setHasLoadedInitial(true);
      }
    })();
  }, [id, hasLoadedInitial]);

  // Fetch the user's default signature and passport photo as blob URLs so we
  // can preview them inside the placement overlays. Returns null when no
  // default is set — overlay will then show a "not set" hint.
  const { data: defaultSigUrl } = useQuery({
    queryKey: ['default-signature-blob'],
    queryFn: async () => {
      try {
        const { data: sig } = await api.get<{ id: string }>('/signatures/default');
        const resp = await api.get(`/signatures/${sig.id}/file`, {
          responseType: 'blob',
        });
        return URL.createObjectURL(resp.data);
      } catch (e: any) {
        if (e?.response?.status === 404) return null;
        return null;
      }
    },
    staleTime: Infinity,
  });

  const { data: defaultPhotoUrl } = useQuery({
    queryKey: ['default-photo-blob'],
    queryFn: async () => {
      try {
        const { data: photo } = await api.get<{ id: string }>(
          '/passport-photos/default'
        );
        const resp = await api.get(`/passport-photos/${photo.id}/file`, {
          responseType: 'blob',
        });
        return URL.createObjectURL(resp.data);
      } catch (e: any) {
        if (e?.response?.status === 404) return null;
        return null;
      }
    },
    staleTime: Infinity,
  });

  const { data: segments } = useQuery({
    queryKey: ['vault', 'segments'],
    queryFn: async () => {
      const { data } = await api.get<SegmentData[]>('/data-vault/segments');
      return data;
    },
  });
  const { data: schema } = useQuery({
    queryKey: ['vault', 'schema'],
    queryFn: async () => {
      const { data } = await api.get<SegmentRegistryEntry[]>(
        '/data-vault/schema'
      );
      return data;
    },
  });

  // Palette: vault values + always-available placeholder types.
  const paletteItems: DraggablePaletteItem[] = useMemo(() => {
    const items: DraggablePaletteItem[] = [];
    // Placeholder types first — the user wants these visible at the top.
    items.push({ id: 'ph.text', label: 'Text', kind: 'text', value: '', icon: <TypeIcon className="h-3.5 w-3.5" />, width: 160, height: 18 });
    items.push({ id: 'ph.number', label: 'Number', kind: 'number', value: '', icon: <Hash className="h-3.5 w-3.5" />, width: 80, height: 18 });
    items.push({ id: 'ph.date', label: 'Date', kind: 'date', value: '', icon: <Calendar className="h-3.5 w-3.5" />, width: 100, height: 18 });
    items.push({ id: 'ph.time', label: 'Time', kind: 'time', value: '', icon: <Clock className="h-3.5 w-3.5" />, width: 70, height: 18 });
    items.push({ id: 'ph.signature', label: 'Signature', kind: 'signature', icon: <PenTool className="h-3.5 w-3.5" />, width: 180, height: 40 });
    items.push({ id: 'ph.photo', label: 'Passport Photo', kind: 'photo', icon: <Camera className="h-3.5 w-3.5" />, width: 100, height: 130 });

    // Then vault fields the user has saved.
    if (segments && schema) {
      for (const seg of segments) {
        const segSchema = schema.find((s) => s.segment === seg.segment);
        for (const [fname, val] of Object.entries(seg.fields)) {
          const fieldSchema = segSchema?.fields.find((f) => f.name === fname);
          items.push({
            id: `${seg.segment}.${fname}`,
            label: fieldSchema?.label || fname,
            kind: 'text',
            value: val.value,
            field_name: fname,
            width: 160,
            height: 18,
          });
        }
      }
    }
    return items;
  }, [segments, schema]);

  const filteredPalette = useMemo(() => {
    const q = paletteSearch.trim().toLowerCase();
    if (!q) return paletteItems;
    return paletteItems.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        (it.value ?? '').toLowerCase().includes(q)
    );
  }, [paletteItems, paletteSearch]);

  // ---- Draft auto-save -----------------------------------------------------
  // Status indicator next to the Save button. We track FOUR states:
  //   idle        — no edits yet this session
  //   dirty       — user edited; save not yet sent (debounce in flight)
  //   saving      — PUT in flight
  //   saved       — last PUT succeeded
  //   error       — last PUT failed
  //
  // The 'dirty' state is critical: previously we only had idle/saving/saved/
  // error, which meant the badge kept showing "Saved 2m ago" while the user
  // was actively editing — and if they closed the tab before the 600ms
  // debounce fired, their work was gone but the badge had lied.
  //
  // We also flush pending saves on `beforeunload` via navigator.sendBeacon so
  // closing the tab mid-edit still gets the work to the server.
  const [draftStatus, setDraftStatus] = useState<
    'idle' | 'dirty' | 'saving' | 'saved' | 'error'
  >('idle');
  const [lastDraftAt, setLastDraftAt] = useState<number | null>(null);

  const saveDraft = useMutation({
    mutationFn: async () => {
      await api.put(`/documents/${id}/placements`, { placements });
    },
    onMutate: () => setDraftStatus('saving'),
    onSuccess: () => {
      setDraftStatus('saved');
      setLastDraftAt(Date.now());
    },
    onError: () => setDraftStatus('error'),
  });

  // Debounced auto-save. Skips the very first effect run (when initial
  // placements are loaded) and only fires after the user actually modifies
  // something. Shortened from 1.2s → 600ms — half-a-second feels closer to
  // "instant" without thrashing the backend.
  const firstEditRef = useRef(true);
  // Hold the latest placements in a ref so the beforeunload handler can read
  // them without going stale.
  const placementsRef = useRef(placements);
  useEffect(() => {
    placementsRef.current = placements;
  }, [placements]);

  useEffect(() => {
    if (!hasLoadedInitial || !id) return;
    if (firstEditRef.current) {
      // Wait for the first user-driven change before starting auto-saves.
      firstEditRef.current = false;
      return;
    }
    setDraftStatus('dirty');
    const timer = setTimeout(() => saveDraft.mutate(), 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placements, hasLoadedInitial, id]);

  // Flush pending edits on tab close / navigation.
  //
  // fetch(...{keepalive: true}) is the modern way to send a request that
  // survives an unload — unlike sendBeacon, it can set custom headers
  // (we need Authorization). All browsers that ship the kbeforeunload event
  // also ship keepalive — Safari since 13, Chrome since 66, Firefox since 95.
  //
  // We also show the standard "leave site?" prompt so the user gets visible
  // confirmation that there's unsaved work, even if the keepalive request
  // somehow doesn't make it.
  useEffect(() => {
    if (!id) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (draftStatus !== 'dirty' && draftStatus !== 'saving') return;

      const tokenRaw =
        localStorage.getItem('access_token') ||
        localStorage.getItem('accessToken') ||
        '';
      const token = tokenRaw.replace(/^"|"$/g, '');
      const base =
        import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      try {
        fetch(`${base}/documents/${id}/placements`, {
          method: 'PUT',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ placements: placementsRef.current }),
        }).catch(() => {});
      } catch {
        // Fall through to the leave-site prompt below.
      }
      // Always raise the leave-site prompt for dirty state — keepalive is
      // best-effort and the user deserves to know there's unsaved work.
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [draftStatus, id]);

  const restamp = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<RestampOut>(
        `/documents/${id}/restamp`,
        { placements }
      );
      return data;
    },
    onSuccess: async (data) => {
      if (data.placed > 0) {
        toast.success(
          `Saved — ${data.placed} field${data.placed === 1 ? '' : 's'} stamped`,
          {
            description: "It's in your Documents queue — re-download anytime.",
            action: {
              label: 'View in Documents',
              onClick: () => navigate('/documents'),
            },
            duration: 8_000,
          }
        );
      }
      if (data.failed > 0) {
        toast.error(`${data.failed} placement(s) couldn't be stamped`, {
          description: data.errors.slice(0, 3).join(' · '),
          duration: 10_000,
        });
      }
      try {
        const r = await api.get(`/documents/${id}/file`, { responseType: 'blob' });
        const url = URL.createObjectURL(r.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signed-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Save failed');
    },
  });

  // ---- Email signed document ----------------------------------------------
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  // emailMessage holds Tiptap HTML (or '' when empty).
  const [emailMessage, setEmailMessage] = useState('');

  const sendEmail = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/documents/${id}/email`, {
        to: emailTo,
        subject: emailSubject.trim() || null,
        message: emailMessage || null,
      });
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Sent to ${data.sent_to}`);
      setEmailOpen(false);
      setEmailTo('');
      setEmailSubject('');
      setEmailMessage('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Email failed');
    },
  });

  function handleDrop(
    e: React.DragEvent<HTMLDivElement>,
    page: number,
    pdfPageWidth: number,
  ) {
    e.preventDefault();
    const source = dragSourceRef.current;
    if (!source) return;

    // Use the drop-zone's own bounding rect rather than the canvas ref — the
    // ref can be null between renders, and the drop zone wraps the canvas
    // tightly so its rect is equivalent.
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = pdfPageWidth / rect.width;
    const offset = dragOffsetRef.current;
    const xPdf = (e.clientX - rect.left - offset.x) * ratio;
    const yPdf = (e.clientY - rect.top - offset.y) * ratio;

    if (source.kind === 'palette') {
      setPlacements((prev) => [
        ...prev,
        buildPlacement(source.item, page, xPdf, yPdf),
      ]);
    } else if (source.kind === 'existing') {
      setPlacements((prev) =>
        prev.map((p, i) =>
          i === source.idx ? { ...p, page, x: xPdf, y: yPdf } : p
        )
      );
    }
    dragSourceRef.current = null;
  }

  // Click-to-place: if a palette item is armed, a click anywhere on the PDF
  // (outside an existing overlay) drops it at that point.
  function handleCanvasClick(
    e: React.MouseEvent<HTMLDivElement>,
    page: number,
    pdfPageWidth: number,
  ) {
    // Comment mode short-circuits everything else: instead of placing a
    // field, capture the click position and open the composer popover.
    if (commentMode) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      if (rect.width === 0) return;
      const ratio = pdfPageWidth / rect.width;
      const xPdf = (e.clientX - rect.left) * ratio;
      const yPdf = (e.clientY - rect.top) * ratio;
      setPendingComment({ page, x: xPdf, y: yPdf });
      // One-at-a-time UX — exit comment-mode while the composer is open so
      // a stray click doesn't drop a second pin.
      setCommentMode(false);
      return;
    }
    if (!armedItem) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = pdfPageWidth / rect.width;
    const xPdf = (e.clientX - rect.left) * ratio;
    const yPdf = (e.clientY - rect.top) * ratio;
    setPlacements((prev) => [
      ...prev,
      buildPlacement(armedItem, page, xPdf, yPdf),
    ]);
    // Stay armed for rapid placement. User presses Esc / clicks Done / clicks
    // the same palette item again to disarm.
  }

  function deletePlacement(idx: number) {
    setPlacements((prev) => prev.filter((_, i) => i !== idx));
  }

  function updatePlacementValue(idx: number, value: string) {
    setPlacements((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, value } : p))
    );
  }

  return (
    <div>
      <PageHeader
        title="Edit document"
        description="Auto-filled fields appear as draggable boxes. Move them, delete them, or drop more from the palette."
        actions={
          <div className="flex items-center gap-2">
            <DraftStatusBadge status={draftStatus} lastSavedAt={lastDraftAt} />
            <Button
              variant={commentMode ? 'primary' : 'outline'}
              onClick={() => {
                setCommentMode((v) => !v);
                setArmedItem(null);
                setPendingComment(null);
              }}
              title={commentMode
                ? 'Exit comment mode (Esc)'
                : 'Click anywhere on the document to leave a comment'}
            >
              <MessageSquare className="h-4 w-4" />
              {commentMode ? 'Cancel comment' : 'Comment'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setEmailOpen(true)}
              disabled={placements.length === 0}
              title="Email the signed document"
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
            <Button
              onClick={() => restamp.mutate()}
              loading={restamp.isPending}
              disabled={placements.length === 0}
            >
              <Save className="h-4 w-4" />
              Save &amp; download
            </Button>
          </div>
        }
      />

      {emailOpen && (
        <EmailModal
          to={emailTo}
          subject={emailSubject}
          message={emailMessage}
          loading={sendEmail.isPending}
          onChangeTo={setEmailTo}
          onChangeSubject={setEmailSubject}
          onChangeMessage={setEmailMessage}
          onCancel={() => setEmailOpen(false)}
          onSend={() => sendEmail.mutate()}
        />
      )}

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
                        // Always clear after a drag finishes — protects the
                        // next palette drop from being treated as a move of a
                        // stale existing-placement idx.
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
                      anchoredComments={
                        anchoredComments?.filter((c) => c.page === i) ?? []
                      }
                      pendingComment={
                        pendingComment?.page === i ? pendingComment : null
                      }
                      onCommentSubmit={async (body, x, y) => {
                        try {
                          await api.post(
                            `/documents/${id}/comments`,
                            { body, page: i, x, y }
                          );
                          await refetchAnchored();
                          setPendingComment(null);
                        } catch (err: any) {
                          toast.error(
                            err?.response?.data?.detail || 'Could not save comment'
                          );
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

        <Card className="self-start">
          <CardContent>
            {selectedIdx !== null && placements[selectedIdx] ? (
              <FontControlsPanel
                placement={placements[selectedIdx]}
                onChange={(changes) => updatePlacement(selectedIdx, changes)}
                onDeselect={() => setSelectedIdx(null)}
              />
            ) : (
              <>
            <h2 className="font-display text-lg font-semibold text-fg mb-1">
              Add fields to document
            </h2>
            <p className="text-xs text-fg-muted mb-3">
              {placements.length} placement{placements.length === 1 ? '' : 's'}
            </p>

            {/* Armed banner — visible only while an item is "loaded" for
                click-to-place. Tells the user how to drop it / cancel. */}
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
                  onClick={() => setArmedItem(null)}
                  className="text-xs text-fg-muted hover:text-fg px-2 py-1 rounded-md border border-border hover:bg-bg-elevated shrink-0"
                  title="Stop placing"
                >
                  Done
                </button>
              </div>
            )}

            {/* Default font — changes propagate to every existing text
                placement AND get used as the default for new ones. */}
            <DefaultsBlock value={defaults} onChange={updateDefaults} />

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-subtle" />
              <Input
                placeholder="Search…"
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-1">
              {filteredPalette.map((it) => {
                const isThisArmed =
                  armedItem !== null && armedItem.id === it.id;
                return (
                  <div
                    key={it.id}
                    draggable
                    onClick={() => {
                      // Click toggles armed state. Click + drag still triggers
                      // a full drag-and-drop via the dragstart handler below.
                      setArmedItem((cur) => (cur?.id === it.id ? null : it));
                    }}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'copyMove';
                      e.dataTransfer.setData('text/plain', it.id);
                      dragSourceRef.current = { kind: 'palette', item: it };
                      dragOffsetRef.current = { x: 0, y: 0 };
                    }}
                    onDragEnd={() => {
                      dragSourceRef.current = null;
                    }}
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
                        <div className="text-sm font-medium text-fg truncate">
                          {it.label}
                        </div>
                        {it.value && (
                          <div className="text-xs text-fg-muted truncate">
                            {it.value}
                          </div>
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
                <p className="text-xs text-fg-subtle py-4 text-center">
                  No matches.
                </p>
              )}
            </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---- Font controls panel --------------------------------------------------

// Static fallback used until the live catalog loads (and as the source for the
// preview CSS family on the canvas overlays — the backend lists fonts but
// doesn't tell us how to render them in the browser).
//
// `cssFamily` is what we hand to the browser via inline style. For script
// fonts we list a chain ending in cursive/handwritten generic families so
// users see SOMETHING approximating the look even before we wire up
// <link rel=stylesheet> from Google Fonts on the frontend.
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
          {/* Font family — grouped by category so the new script/handwriting
              faces are easy to find next to the basic Helvetica/Times trio. */}
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
                {FONT_FAMILIES.filter((f) =>
                  ['sans', 'serif', 'mono'].includes(f.category || '')
                ).map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </optgroup>
              <optgroup label="Signing">
                {FONT_FAMILIES.filter((f) =>
                  ['script', 'calligraphy', 'handwriting', 'signature'].includes(f.category || '')
                ).map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </optgroup>
            </select>
            {/* Live preview using the user's actual value, in the chosen font.
                Helps them see what the stamp will look like before committing. */}
            {p.value && (
              <div
                className="mt-2 px-3 py-2 rounded-lg border border-border bg-bg-base text-sm text-fg truncate"
                style={{
                  fontFamily: FONT_FAMILIES.find((f) => f.value === (p.font_family ?? 'helv'))?.cssFamily,
                }}
                title="Preview of the stamp text"
              >
                {p.value}
              </div>
            )}
          </div>

          {/* Font size */}
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

          {/* Bold / italic */}
          <div className="flex gap-2">
            <button
              onClick={() => onChange({ bold: !p.bold })}
              className={cn(
                'flex-1 h-9 rounded-lg border transition font-bold',
                p.bold
                  ? 'bg-brand-500/15 border-brand-500/40 text-fg'
                  : 'border-border text-fg-muted hover:bg-bg-inset'
              )}
              title="Bold"
            >
              B
            </button>
            <button
              onClick={() => onChange({ italic: !p.italic })}
              className={cn(
                'flex-1 h-9 rounded-lg border transition italic',
                p.italic
                  ? 'bg-brand-500/15 border-brand-500/40 text-fg'
                  : 'border-border text-fg-muted hover:bg-bg-inset'
              )}
              title="Italic"
            >
              I
            </button>
          </div>

          {/* Color */}
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
              Tip: auto-affixed fields inherit the document's own font where
              possible. Tweak only the ones that look off.
            </p>
          </div>
        </div>
      )}
    </div>
  );
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

interface PdfPageWithOverlayProps {
  pageNumber: number;
  placements: Placement[];
  defaultSigUrl: string | null;
  defaultPhotoUrl: string | null;
  selectedIdx: number | null;
  isArmed: boolean;
  onDrop: (
    e: React.DragEvent<HTMLDivElement>,
    page: number,
    pdfPageWidth: number,
  ) => void;
  onCanvasClick: (
    e: React.MouseEvent<HTMLDivElement>,
    page: number,
    pdfPageWidth: number,
  ) => void;
  onPlacementDragStart: (idx: number, offsetX: number, offsetY: number) => void;
  onPlacementDragEnd: () => void;
  onPlacementDelete: (idx: number) => void;
  onPlacementValueChange: (idx: number, value: string) => void;
  onPlacementClick: (idx: number) => void;

  // Anchored-comments props.
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

  // Placements on this page
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
        // Crosshair cursor when an item is armed OR in comment mode so the
        // user knows clicking here will drop something at the cursor.
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
        {/* Overlays */}
        {pagePlacements.map(({ p, idx }) => {
          const ratio = rendered.width / pdfSize.width;
          const left = p.x * ratio;
          // y is the top of the overlay — match the drop point exactly so the
          // box appears where the cursor was when released.
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

        {/* Anchored comment pins. Top-level only — replies are rendered
            INSIDE the pin's popover, never as separate pins on the canvas. */}
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

        {/* New-comment composer at the click location */}
        {pendingComment && (
          <CommentComposerAt
            top={pendingComment.y * (rendered.width / pdfSize.width)}
            left={pendingComment.x * (rendered.width / pdfSize.width)}
            onSubmit={(body) =>
              onCommentSubmit(body, pendingComment.x, pendingComment.y)
            }
            onCancel={onCommentCancel}
          />
        )}
      </div>
    </div>
  );
}

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
        // Selected ⇒ solid brand outline always visible.
        // Otherwise: invisible by default, dashed gray on hover/focus.
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
        // Live-preview the chosen font/size/style/color on the placement
        // itself so the user sees what they'll get before saving.
        style={
          isImageKind
            ? undefined
            : {
                fontFamily:
                  FONT_FAMILIES.find((f) => f.value === (p.font_family ?? 'helv'))
                    ?.cssFamily || 'Helvetica, Arial, sans-serif',
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
        {p.kind === 'initials' && (
          <span>{p.value || 'Initials'}</span>
        )}
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


// ---- Defaults block at the top of the palette ----------------------------

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
    FONT_FAMILIES.find((f) => f.value === value.font_family)?.label ??
    value.font_family;

  return (
    <div className="mb-3 rounded-xl border border-border bg-bg-inset overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-2.5 hover:bg-bg-elevated transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-fg-subtle">
            Default font
          </div>
          <div
            className="text-xs text-fg truncate"
            style={{
              fontFamily:
                FONT_FAMILIES.find((f) => f.value === value.font_family)
                  ?.cssFamily,
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
          {/* Family */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-fg-subtle mb-1">
              Family
            </label>
            <select
              value={value.font_family}
              onChange={(e) =>
                onChange({ ...value, font_family: e.target.value })
              }
              className="w-full h-8 px-2 rounded-lg border border-border bg-bg-elevated text-xs text-fg"
              style={{
                fontFamily: FONT_FAMILIES.find((f) => f.value === value.font_family)?.cssFamily,
              }}
            >
              <optgroup label="Standard">
                {FONT_FAMILIES.filter((f) =>
                  ['sans', 'serif', 'mono'].includes(f.category || '')
                ).map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </optgroup>
              <optgroup label="Signing">
                {FONT_FAMILIES.filter((f) =>
                  ['script', 'calligraphy', 'handwriting', 'signature'].includes(f.category || '')
                ).map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Size */}
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
              onChange={(e) =>
                onChange({ ...value, fontsize: Number(e.target.value) })
              }
              className="w-full accent-brand-500"
            />
          </div>

          {/* Bold / italic */}
          <div className="flex gap-2">
            <button
              onClick={() => onChange({ ...value, bold: !value.bold })}
              className={cn(
                'flex-1 h-8 rounded-lg border text-sm font-bold transition',
                value.bold
                  ? 'bg-brand-500/15 border-brand-500/40 text-fg'
                  : 'border-border text-fg-muted hover:bg-bg-elevated'
              )}
            >
              B
            </button>
            <button
              onClick={() => onChange({ ...value, italic: !value.italic })}
              className={cn(
                'flex-1 h-8 rounded-lg border italic text-sm transition',
                value.italic
                  ? 'bg-brand-500/15 border-brand-500/40 text-fg'
                  : 'border-border text-fg-muted hover:bg-bg-elevated'
              )}
            >
              I
            </button>
          </div>

          {/* Color */}
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
            Applied to every text field — existing and new. Per-field
            overrides available on the right panel when a placement is
            selected.
          </p>
        </div>
      )}
    </div>
  );
}


// ---- Draft status badge ----------------------------------------------------

function DraftStatusBadge({
  status,
  lastSavedAt,
}: {
  status: "idle" | "dirty" | "saving" | "saved" | "error";
  lastSavedAt: number | null;
}) {
  // Force re-render every 30s so the "n seconds ago" text stays fresh.
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((v) => v + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (status === "idle" && lastSavedAt == null) {
    return (
      <span className="text-xs text-fg-subtle italic px-2 hidden sm:inline">
        Drafts save automatically
      </span>
    );
  }
  if (status === "dirty") {
    // User edited but the debounced save hasn't fired yet. Honest about
    // unsaved state so they don't navigate away thinking we got it.
    return (
      <span className="inline-flex items-center gap-1 text-xs text-warning px-2">
        <CloudOff className="h-3 w-3" />
        Unsaved changes…
      </span>
    );
  }
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-fg-muted px-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving draft…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-danger px-2">
        <CloudOff className="h-3 w-3" />
        Draft not saved
      </span>
    );
  }
  // saved
  const ago =
    lastSavedAt == null
      ? ""
      : (() => {
          const s = Math.floor((Date.now() - lastSavedAt) / 1000);
          if (s < 5) return "just now";
          if (s < 60) return `${s}s ago`;
          const m = Math.floor(s / 60);
          if (m < 60) return `${m}m ago`;
          return `${Math.floor(m / 60)}h ago`;
        })();
  return (
    <span className="inline-flex items-center gap-1 text-xs text-fg-muted px-2">
      <Check className="h-3 w-3 text-success" />
      Draft saved {ago}
    </span>
  );
}


// ---- Email modal -----------------------------------------------------------

function EmailModal({
  to,
  subject,
  message,
  loading,
  onChangeTo,
  onChangeSubject,
  onChangeMessage,
  onCancel,
  onSend,
}: {
  to: string;
  subject: string;
  message: string;
  loading: boolean;
  onChangeTo: (v: string) => void;
  onChangeSubject: (v: string) => void;
  onChangeMessage: (v: string) => void;
  onCancel: () => void;
  onSend: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !loading && onCancel()}
    >
      <div
        className="bg-bg-elevated border border-border rounded-2xl shadow-card max-w-2xl w-full p-6 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-gradient-brand grid place-items-center text-white shrink-0">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-fg">
              Email signed document
            </h3>
            <p className="text-xs text-fg-muted">
              The latest saved version of this document is attached as a PDF.
            </p>
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto pr-1 -mr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">
                Recipient
              </label>
              <input
                type="email"
                value={to}
                onChange={(e) => onChangeTo(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full h-10 px-3 rounded-xl border border-border bg-bg-base text-sm text-fg"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">
                Subject
              </label>
              <input
                value={subject}
                onChange={(e) => onChangeSubject(e.target.value)}
                placeholder="Signed document"
                className="w-full h-10 px-3 rounded-xl border border-border bg-bg-base text-sm text-fg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1.5">
              Message
            </label>
            <RichTextEditor
              value={message}
              onChange={onChangeMessage}
              placeholder="Hi, please find the signed document attached…"
              minHeight={180}
            />
            <p className="text-[11px] text-fg-subtle mt-1.5">
              Formatting carries over to the recipient — bold, italics, lists,
              and links work in every modern mail client.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="h-10 px-4 rounded-xl border border-border text-sm text-fg hover:bg-bg-inset disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={loading || !to.trim()}
            className="h-10 px-4 rounded-xl bg-gradient-brand text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}


// ---- Anchored-comment pin + composer ---------------------------------------
//
// A pin marker sits at the comment's (x, y) on the rendered canvas. Click
// opens a popover showing the full thread + a reply composer. The whole pin
// is intentionally small (24px) so it doesn't obscure document content.

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

  // Replies for this thread — server already flattens deeper nesting to
  // one level so we just filter by parent_id.
  const replies = allComments.filter((c) => c.parent_id === comment.id);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
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
      // Stop clicks bubbling up — otherwise clicking the pin in comment-mode
      // would also drop a NEW comment behind it.
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'h-6 w-6 -translate-x-3 -translate-y-3 rounded-full grid place-items-center text-white shadow-md transition',
          comment.resolved
            ? 'bg-success/80 hover:bg-success'
            : 'bg-brand-500 hover:bg-brand-400',
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
          {/* Top comment */}
          <CommentItem
            author={comment.author_name}
            body={comment.body}
            createdAt={comment.created_at}
            resolved={comment.resolved}
          />
          {/* Replies */}
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

          {/* Reply composer */}
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
              <span className="text-[9px] text-success uppercase font-semibold">
                resolved
              </span>
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
