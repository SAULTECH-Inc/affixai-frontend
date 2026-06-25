import { useState } from 'react';
import { MarketingLayout, PageHero } from '@/components/marketing/MarketingLayout';
import { Seo } from '@/components/Seo';
import { Mail, MessageCircle, Building2, Send, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { api } from '@/lib/api';

// Posts to POST /api/v1/leads with kind=contact. The endpoint is public
// (no auth) but rate-limited per-IP and protected by a honeypot field.
// We don't post the honeypot in the visible form — bots that scrape and
// fill EVERY field of the schema will trip it; humans never see it.
export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    topic: 'General',
    message: '',
    // Honeypot. Stays empty for real humans. We POST whatever value is here
    // (empty for legit users, filled for bots) and the server silently drops
    // the submission if it's non-empty.
    website: '',
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please fill in your name, email, and message');
      return;
    }
    if (form.message.trim().length < 10) {
      toast.error('Please write at least a sentence — minimum 10 characters');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/leads', {
        kind: 'contact',
        name: form.name.trim(),
        email: form.email.trim(),
        topic: form.topic,
        message: form.message.trim(),
        website: form.website, // honeypot
      });
      setSubmitted(true);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429) {
        toast.error(
          "You're sending messages too quickly. Please try again later."
        );
      } else {
        toast.error(
          err?.response?.data?.detail ||
            "Couldn't send your message. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MarketingLayout>
      <Seo
        title="Contact"
        description="Get in touch with AffixAI — sales, support, partnerships, or just saying hi. We read every message."
        path="/contact"
      />
      <PageHero
        eyebrow="Contact us"
        title="Talk to a human."
        subtitle="Sales, support, or just saying hi. We read every message."
      />

      <section className="max-w-5xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8">
        {/* Channels */}
        <div className="space-y-3">
          {[
            {
              icon: Mail,
              title: 'Email',
              detail: 'hello@affixai.com',
              href: 'mailto:hello@affixai.com',
            },
            {
              icon: Building2,
              title: 'Enterprise sales',
              detail: 'sales@affixai.com',
              href: 'mailto:sales@affixai.com',
            },
            {
              icon: MessageCircle,
              title: 'Support',
              detail: 'support@affixai.com',
              href: 'mailto:support@affixai.com',
            },
          ].map((c) => (
            <a
              key={c.title}
              href={c.href}
              className="block rounded-2xl border border-border bg-bg-elevated hover:border-brand-500/40 transition p-5"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-500/20 text-brand-300 mb-3">
                <c.icon className="h-4 w-4" />
              </div>
              <div className="font-display font-semibold">{c.title}</div>
              <div className="mt-0.5 text-sm text-fg-muted truncate">
                {c.detail}
              </div>
            </a>
          ))}
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-border bg-bg-elevated p-6 sm:p-8">
          {submitted ? (
            <div className="text-center py-10">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success mb-4">
                <Check className="h-6 w-6" />
              </div>
              <h2 className="font-display text-xl font-bold">
                Message sent — thanks!
              </h2>
              <p className="mt-2 text-sm text-fg-muted">
                We'll get back to you within 1 business day. If it's urgent,
                email{' '}
                <a
                  href="mailto:hello@affixai.com"
                  className="text-brand-300 underline underline-offset-2"
                >
                  hello@affixai.com
                </a>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              {/* Honeypot — hidden from sighted users + screen readers via
                  aria-hidden and tabindex=-1. Bots that auto-fill every
                  input will trip it; the server silently drops the
                  submission when this is non-empty. */}
              <div
                aria-hidden="true"
                style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}
              >
                <label htmlFor="c-website">Website (leave blank)</label>
                <input
                  id="c-website"
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
                  <Label htmlFor="c-name">Your name</Label>
                  <Input
                    id="c-name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="c-email">Email</Label>
                  <Input
                    id="c-email"
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
                <Label htmlFor="c-topic">Topic</Label>
                <Select
                  id="c-topic"
                  options={[
                    'General',
                    'Sales',
                    'Support',
                    'Partnerships',
                    'Press',
                    'Security',
                  ]}
                  value={form.topic}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, topic: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="c-message">Message</Label>
                <Textarea
                  id="c-message"
                  rows={6}
                  value={form.message}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, message: e.target.value }))
                  }
                  placeholder="What can we help you with?"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send message
                  </>
                )}
              </Button>
              <p className="text-xs text-fg-subtle">
                We typically reply within 1 business day.
              </p>
            </form>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}
