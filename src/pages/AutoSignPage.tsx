import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { FileSignature, FileText, Loader2, Download, Sparkles, AlertTriangle, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/layout/PageHeader';
import type { AutoSignOut } from '@/types';

export default function AutoSignPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AutoSignOut | null>(null);

  const sign = useMutation({
    mutationFn: async (selected: File) => {
      const form = new FormData();
      form.append('file', selected);
      const { data } = await api.post<AutoSignOut>(
        '/documents/auto-sign',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(
        `Filled ${data.report.fields_filled.length} field${data.report.fields_filled.length === 1 ? '' : 's'}`
      );
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      if (status === 402) {
        toast.error('Your trial has ended. Upgrade to keep auto-signing.');
      } else {
        toast.error(err?.response?.data?.detail || 'Auto-sign failed');
      }
    },
  });

  function startOver() {
    setFile(null);
    setResult(null);
  }

  async function downloadSigned() {
    if (!result) return;
    try {
      const resp = await api.get(`/documents/${result.document_id}/file`, {
        responseType: 'blob',
      });
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signed-${file?.name ?? 'document.pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Download failed');
    }
  }

  return (
    <div>
      <PageHeader
        title="Auto-Sign"
        description="Drop any PDF. We'll find the labeled fields, fill them from your vault, and stamp your signature."
        actions={
          <Badge tone="brand">
            <Sparkles className="h-3 w-3" />
            AI-powered
          </Badge>
        }
      />

      {!result ? (
        <Card>
          <CardContent>
            <div
              className="rounded-2xl border-2 border-dashed border-border p-8 sm:p-12 text-center hover:border-brand-500/40 transition cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFile(f);
                    sign.mutate(f);
                  }
                }}
              />
              <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-brand-soft grid place-items-center text-brand-400 mb-4">
                {sign.isPending ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <FileSignature className="h-7 w-7" />
                )}
              </div>
              <h3 className="font-display text-xl font-semibold text-fg">
                {sign.isPending
                  ? `Signing ${file?.name}…`
                  : 'Drop a document here'}
              </h3>
              <p className="mt-1.5 text-sm text-fg-muted">
                We support digital PDFs with labelled form fields. Image-only PDFs
                will work soon.
              </p>
              {!sign.isPending && (
                <div className="mt-6 inline-flex items-center gap-2 text-xs text-fg-subtle">
                  <FileText className="h-3.5 w-3.5" />
                  PDF only · max 50MB
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-6">
              <div>
                <h2 className="font-display text-xl font-bold text-fg flex items-center gap-2">
                  Done.
                  <span className="text-gradient-brand">Your document is ready.</span>
                </h2>
                <p className="mt-1 text-sm text-fg-muted">
                  {result.report.fields_filled.length} fields filled
                  {result.report.signatures_placed > 0 &&
                    `, ${result.report.signatures_placed} signature${result.report.signatures_placed > 1 ? 's' : ''} placed`}
                  {result.report.initials_placed > 0 &&
                    `, ${result.report.initials_placed} initials placed`}
                  {result.report.photos_placed > 0 &&
                    `, ${result.report.photos_placed} photo${result.report.photos_placed > 1 ? 's' : ''} affixed`}
                  .
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={startOver}>
                  Sign another
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/documents/${result.document_id}/edit`)}
                  title="Open the placement editor to add or adjust fields"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit & adjust
                </Button>
                <Button onClick={downloadSigned}>
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>

            {/* Stamped fields */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-fg-muted uppercase tracking-wider">
                Stamped fields
              </h3>
              {result.report.fields_filled.length === 0 ? (
                <p className="text-sm text-fg-muted">
                  No fields matched the vault. Try filling more of your vault and
                  re-uploading.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.report.fields_filled.map((f, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 rounded-xl border border-border bg-bg-inset flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-fg truncate">
                          {f.label}
                        </div>
                        <div className="text-xs text-fg-muted truncate">
                          → {f.value}
                        </div>
                      </div>
                      <Badge
                        tone={
                          f.match_confidence >= 0.9
                            ? 'success'
                            : f.match_confidence >= 0.75
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {Math.round(f.match_confidence * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unmatched labels */}
            {result.report.labels_unmatched.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3 text-sm text-fg-muted">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="font-medium">
                    Labels we saw but couldn't match to your vault
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.report.labels_unmatched.map((l, i) => (
                    <Badge key={i} tone="neutral">
                      {l}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
