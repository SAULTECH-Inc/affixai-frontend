import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Could not send reset email');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-brand-soft grid place-items-center text-brand-400 mb-4">
          <MailCheck className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl font-bold text-fg">
          Check your email
        </h2>
        <p className="mt-2 text-sm text-fg-muted">
          If an account exists for <span className="text-fg">{email}</span>, we
          just sent a reset link. It expires in 1 hour.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-fg">Forgot password?</h2>
      <p className="mt-2 text-sm text-fg-muted">
        Enter your email and we'll send a reset link.
      </p>
      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <Button type="submit" fullWidth size="lg" loading={loading}>
          Send reset link
        </Button>
        <Link
          to="/login"
          className="block text-center text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="inline h-3.5 w-3.5 mr-1" />
          Back to sign in
        </Link>
      </form>
    </div>
  );
}
