import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { useAuthStore } from '@/store/authStore';
import {
  COUNTRIES,
  detectCountryFromBrowser,
} from '@/lib/countries';
import { clearReferralCode, getStoredReferralCode } from '@/lib/referral';

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '';
  // Pre-fill country from the browser locale. The user can change it,
  // and the backend cross-checks via CDN edge headers when available.
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    country_code: detectCountryFromBrowser() ?? '',
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      // Forward any referral code that was captured on the landing page.
      // Unknown codes are silently dropped server-side, so this is safe
      // even if localStorage is stale.
      const referral_code = getStoredReferralCode();
      await register({ ...form, ...(referral_code ? { referral_code } : {}) });
      // Successful signup → the backend has the Referral row; we don't
      // need the local copy anymore.
      clearReferralCode();
      toast.success("You're in. 30-day free trial started.");
      navigate(redirect || '/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Could not create account');
    } finally {
      setLoading(false);
    }
  }

  function setField<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-fg">Create your account</h2>
      <p className="mt-2 text-sm text-fg-muted">
        30 days free — no card required.
      </p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="first">First name</Label>
            <Input
              id="first"
              value={form.first_name}
              onChange={(e) => setField('first_name', e.target.value)}
              placeholder="Jane"
            />
          </div>
          <div>
            <Label htmlFor="last">Last name</Label>
            <Input
              id="last"
              value={form.last_name}
              onChange={(e) => setField('last_name', e.target.value)}
              placeholder="Doe"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setField('password', e.target.value)}
            placeholder="At least 8 characters"
            required
          />
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Select
            id="country"
            value={form.country_code}
            onChange={(e) => setField('country_code', e.target.value)}
            options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
            placeholder="Select your country…"
          />
          <p className="mt-1 text-[11px] text-fg-subtle">
            Picks the right payment method + price for your region.
          </p>
        </div>

        <Button type="submit" fullWidth loading={loading} size="lg">
          Create account
        </Button>

        <p className="text-[11px] text-fg-subtle text-center">
          By signing up you agree to the Terms and Privacy Policy.
        </p>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface px-2 text-fg-muted">or</span>
          </div>
        </div>

        <a
          href={`${import.meta.env.VITE_API_URL}/auth/google?redirect=${encodeURIComponent(redirect || '/dashboard')}`}
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-white/10"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </a>
      </div>

      <p className="mt-6 text-center text-sm text-fg-muted">
        Already have an account?{' '}
        <Link
          to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
          className="font-medium text-brand-400 hover:text-brand-300"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
