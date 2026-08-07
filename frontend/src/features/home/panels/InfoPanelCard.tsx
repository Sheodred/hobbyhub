import type { ReactNode } from "react";

import { FadeIn } from "../../../components/FadeIn";

interface InfoPanelCardProps {
  title: string;
  children: ReactNode;
}

/** Shared shell for the homepage's small info panels (weather, news) - consistent card, title, and entrance animation. */
export function InfoPanelCard({ title, children }: InfoPanelCardProps) {
  return (
    <FadeIn className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-1.5">
      <div className="rounded-[calc(1.5rem-0.375rem)] bg-[#1b1533]/60 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#1b1533]/85">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        <div className="mt-2">{children}</div>
      </div>
    </FadeIn>
  );
}
