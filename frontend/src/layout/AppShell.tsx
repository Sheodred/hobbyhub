import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Header } from "./Header";
import { MobileDrawer } from "./MobileDrawer";
import { PageTransition } from "./PageTransition";

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#0b0b16] via-[#07070b] to-[#050505] text-slate-100">
      {/* absolute (not fixed) so these orbs are positioned against the full
          page height and spread out as you scroll, instead of staying
          pinned to the first viewport and leaving the rest of a long page
          flat black. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-[5%] h-[36rem] w-[36rem] rounded-full bg-indigo-500/50 blur-[100px] motion-safe:animate-[drift-a_26s_ease-in-out_infinite]" />
        <div className="absolute right-0 top-[28%] h-[32rem] w-[32rem] rounded-full bg-violet-500/45 blur-[100px] motion-safe:animate-[drift-b_32s_ease-in-out_infinite]" />
        <div className="absolute left-0 top-[55%] h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/40 blur-[100px] motion-safe:animate-[drift-a_38s_ease-in-out_infinite_reverse]" />
        <div className="absolute right-[10%] top-[80%] h-[26rem] w-[26rem] rounded-full bg-indigo-400/40 blur-[100px] motion-safe:animate-[drift-b_30s_ease-in-out_infinite_reverse]" />
      </div>
      <div aria-hidden="true" className="grain-overlay" />
      <Header mobileNavOpen={mobileNavOpen} onToggleMobileNav={() => setMobileNavOpen((open) => !open)} />
      <MobileDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <main className="min-h-[calc(100dvh-5.5rem)] overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-7xl">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </main>
    </div>
  );
}
