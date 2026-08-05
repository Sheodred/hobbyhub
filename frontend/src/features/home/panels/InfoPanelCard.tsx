import type { ReactNode } from "react";

import { FadeIn } from "../../../components/FadeIn";

interface InfoPanelCardProps {
  title: string;
  children: ReactNode;
}

/** Shared shell for the homepage's small info panels (weather, news) - consistent card, title, and entrance animation. */
export function InfoPanelCard({ title, children }: InfoPanelCardProps) {
  return (
    <FadeIn className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="text-sm font-medium text-slate-400">{title}</h3>
      <div className="mt-2">{children}</div>
    </FadeIn>
  );
}
