import { useRef, useState } from 'react';
import { MarketingLayout, PageHero } from '@/components/marketing/MarketingLayout';
import { Seo } from '@/components/Seo';
import {
  MapPin,
  Briefcase,
  Mail,
  X,
  Send,
  Check,
  Loader2,
  Paperclip,
  FileText,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { api } from '@/lib/api';

// Roles are illustrative placeholders — swap in real openings once we have
// any. The Apply button opens a modal that POSTs to /api/v1/leads with
// kind=careers, so applications land in the same admin inbox as contact-form
// submissions (distinguished by `kind`).
const ROLES = [
  {
    title: 'Senior Backend Engineer',
    location: 'Remote · Worldwide',
    type: 'Full-time',
    blurb:
      'Own the document-processing pipeline. FastAPI, Tortoise ORM, OCR, and a lot of PDF surgery.',
  },
  {
    title: 'Product Designer',
    location: 'Remote · Worldwide',
    type: 'Full-time',
    blurb:
      "Design how documents get signed in 2026. You'll touch the editor, the vault UX, and everything in between.",
  },
  {
    title: 'Founding Customer Engineer',
    location: 'Remote · EU / Africa',
    type: 'Full-time',
    blurb:
      'Help enterprises onboard, ship API integrations alongside their teams, and turn their feedback into product.',
  },
];

export default function CareersPage() {
  const [applying, setApplying] = useState<string | null>(null);

  return (
    <MarketingLayout>
      <Seo
        title="Careers"
        description="Help us build the document signing experience we always wanted. Small team, remote-first, hiring across engineering, design, and customer."
        path="/careers"
      />
      <PageHero
        eyebrow="Careers"
        title="Build the boring stuff. So nobody else has to."
        subtitle="Small team, fast iteration, real impact. We're hiring across engineering, design, and customer."
      />
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="space-y-3">
          {ROLES.map((r) => (
            <div
              key={r.title}
              className="rounded-2xl border border-border bg-bg-elevated p-6 sm:p-7 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-fg-subtle mb-1.5">
                  <Briefcase className="h-3 w-3" />
                  {r.type}
                  <span>·</span>
                  <MapPin className="h-3 w-3" />
                  {r.location}
                </div>
                <h3 className="font-display text-lg font-semibold">
                  {r.title}
                </h3>
                <p className="mt-1 text-sm text-fg-muted leading-relaxed max-w-2xl">
                  {r.blurb}
                </p>
              </div>
              <button
                onClick={() => setApplying(r.title)}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-border bg-bg-base hover:bg-bg-inset px-4 py-2 text-sm font-medium text-fg transition"
              >
                <Mail className="h-4 w-4" />
                Apply
              </button>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-dashed border-border bg-bg-elevated p-6 text-center">
          <p className="text-sm text-fg-muted">
            Don't see your role? We're still happy to hear from talented
            people.{' '}
            <button
              onClick={() => setApplying('Open application')}
              className="text-brand-300 hover:text-brand-200 underline underline-offset-2"
            >
              Send us a general application
            </button>
            .
          </p>
        </div>
      </section>

      {applying && (
        <ApplyModal role={applying} onClose={() => setApplying(null)} />
      )}
    </MarketingLayout>
  );
}

// ---- Apply modal -----------------------------------------------------------

const RESUME_MAX_BYTES = 5 * 1024 * 1024; // mirror backend limit
const RESUME_OK_EXTS = ['.pdf', '.doc', '.docx', '.txt'];

function ApplyModal({
  role,
  onClose,
}: {
  role: string;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resume, setResume] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    linkedin: '',
    resume_url: '',
    message: '',
    website: '', // honeypot
  });

  function onPickResume(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > RESUME_MAX_BYTES) {
      toast.error(
        `File too big — max ${RESUME_MAX_BYTES / 1024 / 1024} MB. Yours is ${(f.size / 1024 / 1024).toFixed(1)} MB.`
      );
      e.target.value = '';
      return;
    }
    const lower = f.name.toLowerCase();
    if (!RESUME_OK_EXTS.some((ext) => lower.endsWith(ext))) {
      toast.error('Please upload a PDF, DOC, DOCX, or TXT file');
      e.target.value = '';
      return;
    }
    setResume(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please fill in your name, email, and a short note');
      return;
    }
    if (form.message.trim().length < 10) {
      toast.error('Please share at least a sentence about yourself');
      return;
    }
    setSubmitting(true);
    try {
      // Multipart endpoint — accepts an optional resume file alongside the
      // form fields. Backend uploads the file to S3 (in folder leads/resumes)
      // and stores a 7-day presigned URL in lead.extra for the admin to grab.
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('email', form.email.trim());
      fd.append('role', role);
      fd.append('message', form.message.trim());
      if (form.linkedin.trim()) fd.append('linkedin', form.linkedin.trim());
      if (form.resume_url.trim())
        fd.append('resume_url', form.resume_url.trim());
      fd.append('website', form.website);
      if (resume) fd.append('resume_file', resume);

      await api.post('/leads/careers-application', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmitted(true);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429) {
        toast.error(
          "You're submitting too many applications. Please try again later."
        );
      } else if (status === 413) {
        toast.error('Resume file is too large — max 5 MB.');
      } else if (status === 415) {
        toast.error('Resume must be a PDF, DOC, DOCX, or TXT file.');
      } else if (status === 503) {
        toast.error(
          "Couldn't store your resume right now — paste a Drive/Dropbox link instead?"
        );
      } else {
        toast.error(
          err?.response?.data?.detail ||
            "Couldn't submit your application. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-bg-elevated p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-fg-subtle hover:text-fg transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success mb-4">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="font-display text-xl font-bold">
              Application received.
            </h2>
            <p className="mt-2 text-sm text-fg-muted">
              We review every application personally and reply within a week
              or two. Thanks for thinking of us.
            </p>
            <Button onClick={onClose} className="mt-6">
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-1 text-xs text-fg-subtle uppercase tracking-widest">
              Applying for
            </div>
            <h2 className="font-display text-2xl font-bold mb-6">{role}</h2>

            <form onSubmit={submit} className="space-y-4">
              {/* Honeypot — same trick as the contact form. */}
              <div
                aria-hidden="true"
                style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}
              >
                <label htmlFor="a-website">Website (leave blank)</label>
                <input
                  id="a-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, website: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="a-name">Your name</Label>
                  <Input
                    id="a-name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="a-email">Email</Label>
                  <Input
                    id="a-email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="jane@example.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="a-linkedin">LinkedIn (optional)</Label>
                <Input
                  id="a-linkedin"
                  type="url"
                  value={form.linkedin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, linkedin: e.target.value }))
                  }
                  placeholder="https://linkedin.com/in/yourname"
                />
              </div>

              {/* Resume — either upload a file OR paste a URL. Both
                  optional. If a file is attached we show its name + size
                  and let the user clear it. The backend accepts both. */}
              <div>
                <Label htmlFor="a-resume-file">Resume (optional)</Label>
                <input
                  ref={fileRef}
                  id="a-resume-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={onPickResume}
                  className="hidden"
                />
                {resume ? (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-inset/40 px-3 py-2.5">
                    <FileText className="h-4 w-4 text-brand-300 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-fg truncate">
                        {resume.name}
                      </div>
                      <div className="text-xs text-fg-subtle">
                        {(resume.size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setResume(null);
                        if (fileRef.current) fileRef.current.value = '';
                      }}
                      className="text-fg-subtle hover:text-fg transition"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-bg-base hover:bg-bg-inset px-4 py-3 text-sm text-fg-muted hover:text-fg transition"
                  >
                    <Paperclip className="h-4 w-4" />
                    Attach resume (PDF, DOC, DOCX, TXT · max 5 MB)
                  </button>
                )}
              </div>

              <div>
                <Label htmlFor="a-resume">
                  …or paste a portfolio / resume URL (optional)
                </Label>
                <Input
                  id="a-resume"
                  type="url"
                  value={form.resume_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, resume_url: e.target.value }))
                  }
                  placeholder="https://drive.google.com/…"
                />
              </div>

              <div>
                <Label htmlFor="a-message">Tell us about yourself</Label>
                <Textarea
                  id="a-message"
                  rows={5}
                  value={form.message}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, message: e.target.value }))
                  }
                  placeholder="What are you working on? Why this role?"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit application
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
