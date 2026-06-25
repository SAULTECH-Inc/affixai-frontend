import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar, MobileSidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex bg-bg-base text-fg">
      <Sidebar />
      <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        {/*
          Main scroll container. Tighter p-3 padding on phones (every px of
          horizontal space matters) → p-6 → p-8. Safe-area padding keeps
          content out of the iOS home-bar zone when installed as PWA.
        */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-safe">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
