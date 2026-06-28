import { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { InstallPrompt } from '@/components/InstallPrompt';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { FullPageSpinner } from '@/components/ui/Spinner';

import LandingPage from '@/pages/LandingPage';
import AboutPage from '@/pages/marketing/AboutPage';
import BlogPage from '@/pages/marketing/BlogPage';
import WhyWeBuiltAffixAi from '@/pages/marketing/blog/WhyWeBuiltAffixAi';
import EncryptingTheVault from '@/pages/marketing/blog/EncryptingTheVault';
import AutoAffixTheEngine from '@/pages/marketing/blog/AutoAffixTheEngine';
import TheFounderPaperworkTax from '@/pages/marketing/blog/TheFounderPaperworkTax';
import CareersPage from '@/pages/marketing/CareersPage';
import ContactPage from '@/pages/marketing/ContactPage';
import PrivacyPage from '@/pages/marketing/PrivacyPage';
import TermsPage from '@/pages/marketing/TermsPage';
import DpaPage from '@/pages/marketing/DpaPage';
import AuthCallbackPage from '@/pages/AuthCallbackPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import DataVaultPage from '@/pages/DataVaultPage';
import AutoSignPage from '@/pages/AutoSignPage';
import BillingPage from '@/pages/BillingPage';
import SettingsPage from '@/pages/SettingsPage';
import DocumentsPage from '@/pages/DocumentsPage';
import DocumentViewPage from '@/pages/DocumentViewPage';
import DocumentEditPage from '@/pages/DocumentEditPage';
import SignaturesPage from '@/pages/SignaturesPage';
import PassportPhotoPage from '@/pages/PassportPhotoPage';
import EnterprisePage from '@/pages/EnterprisePage';
import ReferralsPage from '@/pages/ReferralsPage';
import AdminPage from '@/pages/AdminPage';
import GuestSignPage from '@/pages/GuestSignPage';
import ParticipantSignPage from '@/pages/ParticipantSignPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  const { fetchUser, isAuthenticated } = useAuthStore();
  const initTheme = useThemeStore((s) => s.init);

  useEffect(() => {
    initTheme();
    const token = localStorage.getItem('access_token');
    if (token && !isAuthenticated) {
      fetchUser();
    } else {
      useAuthStore.setState({ isLoading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Floating install prompt — only shows when the browser fires
            beforeinstallprompt AND the user hasn't dismissed it
            recently. Self-hides otherwise. */}
        <InstallPrompt />
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: 'rgb(22 26 38)',
              color: 'rgb(241 245 249)',
              border: '1px solid rgb(30 35 50)',
            },
          }}
        />
        <Routes>
          {/* Public landing page — no auth required, no AppLayout chrome.
              Authenticated visitors see a "Go to dashboard" CTA so the same
              URL works for both audiences. */}
          <Route path="/" element={<LandingPage />} />

          {/* Other public marketing pages (linked from the landing footer).
              Each one wraps itself in MarketingLayout so the chrome stays
              consistent without needing a shared parent <Route>. */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/why-we-built-affixai" element={<WhyWeBuiltAffixAi />} />
          <Route path="/blog/encrypting-the-vault" element={<EncryptingTheVault />} />
          <Route path="/blog/auto-affix-the-engine" element={<AutoAffixTheEngine />} />
          <Route path="/blog/the-founder-paperwork-tax" element={<TheFounderPaperworkTax />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/dpa" element={<DpaPage />} />

          {/* Public */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Guest sign — magic-link, no auth. Lives OUTSIDE AppLayout so
              non-platform participants don't see the app chrome. */}
          <Route path="/invite/:token" element={<GuestSignPage />} />

          {/* Protected */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/data-vault" element={<DataVaultPage />} />
            <Route path="/auto-sign" element={<AutoSignPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/documents/:id" element={<DocumentViewPage />} />
            <Route path="/documents/:id/edit" element={<DocumentEditPage />} />
            <Route path="/documents/:id/sign" element={<ParticipantSignPage />} />
            <Route path="/signatures" element={<SignaturesPage />} />
            <Route path="/passport-photo" element={<PassportPhotoPage />} />
            <Route path="/enterprise" element={<EnterprisePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/referrals" element={<ReferralsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
