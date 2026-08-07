import { useState } from "react";
import { Outlet } from "react-router-dom";

import { useMediaQuery } from "../hooks/useMediaQuery";
import { Header } from "./Header";
import { MobileDrawer } from "./MobileDrawer";
import { PageTransition } from "./PageTransition";
import { Sidebar } from "./Sidebar";

// Matches Tailwind's `md` breakpoint used throughout the shell components.
const DESKTOP_QUERY = "(min-width: 768px)";

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  // Rendered exactly once - mounting <Outlet /> twice (e.g. once per
  // breakpoint, hidden via CSS) would double-fire any data fetching a page
  // does. The breakpoint check below picks a layout, not a duplicate.
  const mainContent = (
    <main className="min-h-[calc(100dvh-5.5rem)] overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-7xl">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>
    </main>
  );

  return (
    <div className="relative min-h-screen bg-[#050505] text-slate-100">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[32rem] w-[32rem] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-1/3 right-0 h-[28rem] w-[28rem] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>
      <div aria-hidden="true" className="grain-overlay" />
      <Header mobileNavOpen={mobileNavOpen} onToggleMobileNav={() => setMobileNavOpen((open) => !open)} />
      <MobileDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      {isDesktop ? <Sidebar>{mainContent}</Sidebar> : mainContent}
    </div>
  );
}
