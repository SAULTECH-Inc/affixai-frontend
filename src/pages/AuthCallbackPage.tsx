import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { FullPageSpinner } from '@/components/ui/Spinner';

export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    const token = params.get('token');
    const refresh = params.get('refresh');

    if (!token || !refresh) {
      toast.error('OAuth sign-in failed — missing tokens');
      navigate('/login', { replace: true });
      return;
    }

    apiClient.setTokens({ access_token: token, refresh_token: refresh });
    fetchUser().then(() => {
      navigate('/dashboard', { replace: true });
    }).catch(() => {
      toast.error('Could not load your account after sign-in');
      navigate('/login', { replace: true });
    });
  }, []);

  return <FullPageSpinner />;
}
