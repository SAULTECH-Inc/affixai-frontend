import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
      navigate('/dashboard');
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
        <div className="grid grid-cols-2 gap-3">
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

      <p className="mt-6 text-center text-sm text-fg-muted">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-brand-400 hover:text-brand-300"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
