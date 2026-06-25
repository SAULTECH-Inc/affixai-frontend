import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: password,
      });
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-fg">Invalid link</h2>
        <p className="mt-2 text-sm text-fg-muted">
          This reset link is missing or malformed. Request a new one.
        </p>
        <Link
          to="/forgot-password"
          className="mt-6 inline-block text-sm text-brand-400 hover:text-brand-300"
        >
          Get a new reset link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-brand-soft grid place-items-center text-brand-400 mb-4">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl font-bold text-fg">Password reset</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Redirecting you to sign in…
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-fg">
        Choose a new password
      </h2>
      <p className="mt-2 text-sm text-fg-muted">
        Make it at least 8 characters.
      </p>
      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="pw">New password</Label>
          <Input
            id="pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <Button type="submit" fullWidth size="lg" loading={loading}>
          Reset password
        </Button>
      </form>
    </div>
  );
}
