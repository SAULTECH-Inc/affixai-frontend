import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-fg">Welcome back</h2>
      <p className="mt-2 text-sm text-fg-muted">
        Sign in to access your vault and documents.
      </p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label htmlFor="password" className="mb-0">Password</Label>
            <Link
              to="/forgot-password"
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" fullWidth loading={loading} size="lg">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fg-muted">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="font-medium text-brand-400 hover:text-brand-300"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
