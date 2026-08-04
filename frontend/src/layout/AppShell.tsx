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
    <main className="min-h-[calc(100vh-4rem)] overflow-y-auto p-6">
      <PageTransition>
        <Outlet />
      </PageTransition>
    </main>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
      <MobileDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      {isDesktop ? <Sidebar>{mainContent}</Sidebar> : mainContent}
    </div>
  );
}
