import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Header } from "./Header";
import { MobileDrawer } from "./MobileDrawer";
import { PageTransition } from "./PageTransition";

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#140f2c] via-[#0c091c] to-[#060411] text-slate-100">
      {/* absolute (not fixed) so these color pools are positioned against the
          full page height and spread out as you scroll, instead of staying
          pinned to the first viewport and leaving the rest of a long page
          flat black. mix-blend-screen (instead of plain alpha) keeps
          overlapping indigo/violet/fuchsia pools from muddying into brown -
          they brighten each other like light instead, which is the bit that
          reads as "flat black" without it. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Nebula texture base layer (AI-generated, frontend/public/nebula-bg.png) sitting under the
            orb pools below - gives the black gaps between orbs organic variation instead of flat
            color, closing the "flat black" read the orbs alone left between color pools on a tall
            page. Scale starts >1 and only grows during the drift so the edges never show a seam. */}
        <img
          src="/nebula-bg.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-screen motion-safe:animate-[drift-nebula_60s_ease-in-out_infinite]"
        />
        <div
          className="absolute left-1/4 top-[5%] h-[40rem] w-[40rem] rounded-full mix-blend-screen blur-[110px] motion-safe:animate-[drift-a_26s_ease-in-out_infinite]"
          style={{ backgroundImage: "radial-gradient(closest-side, rgba(99,102,241,0.6), transparent)" }}
        />
        <div
          className="absolute right-0 top-[28%] h-[36rem] w-[36rem] rounded-full mix-blend-screen blur-[110px] motion-safe:animate-[drift-b_32s_ease-in-out_infinite]"
          style={{ backgroundImage: "radial-gradient(closest-side, rgba(139,92,246,0.55), transparent)" }}
        />
        <div
          className="absolute left-0 top-[55%] h-[32rem] w-[32rem] rounded-full mix-blend-screen blur-[110px] motion-safe:animate-[drift-a_38s_ease-in-out_infinite_reverse]"
          style={{ backgroundImage: "radial-gradient(closest-side, rgba(217,70,239,0.45), transparent)" }}
        />
        {/* center-column fill - the panel grid runs up to max-w-7xl wide, wider
            than any single edge-anchored orb's glow radius reaches, so the
            middle columns were falling in a gap between orbs and reading flat
            black again below the hero. */}
        <div
          className="absolute left-1/2 top-[42%] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full mix-blend-screen blur-[110px] motion-safe:animate-[drift-a_34s_ease-in-out_infinite]"
          style={{ backgroundImage: "radial-gradient(closest-side, rgba(168,85,247,0.5), transparent)" }}
        />
        <div
          className="absolute right-[10%] top-[80%] h-[30rem] w-[30rem] rounded-full mix-blend-screen blur-[110px] motion-safe:animate-[drift-b_30s_ease-in-out_infinite_reverse]"
          style={{ backgroundImage: "radial-gradient(closest-side, rgba(129,140,248,0.5), transparent)" }}
        />
        {/* deep-scroll coverage - the news panels (Tagesschau/WotC) can run
            long, pushing total page height well past the fixed 80% mark. */}
        <div
          className="absolute left-1/4 top-[95%] h-[30rem] w-[30rem] rounded-full mix-blend-screen blur-[110px] motion-safe:animate-[drift-a_36s_ease-in-out_infinite]"
          style={{ backgroundImage: "radial-gradient(closest-side, rgba(99,102,241,0.5), transparent)" }}
        />
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
