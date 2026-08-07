import { useQuery } from "@tanstack/react-query";

import { InfoPanelCard } from "./InfoPanelCard";
import { getFleaMarketEvents } from "./newsApi";

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FleaMarketPanel() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["flea-market"], queryFn: getFleaMarketEvents });

  if (isError) {
    return (
      <InfoPanelCard title="Flea Market">
        <p className="text-sm text-slate-400">Couldn&apos;t load flea market dates right now.</p>
      </InfoPanelCard>
    );
  }

  if (isLoading) {
    return (
      <InfoPanelCard title="Flea Market">
        <div className="animate-pulse space-y-2" aria-hidden="true">
          <div className="h-4 w-full rounded bg-slate-800" />
          <div className="h-4 w-5/6 rounded bg-slate-800" />
          <div className="h-4 w-3/4 rounded bg-slate-800" />
        </div>
        <span className="sr-only">Loading flea market dates…</span>
      </InfoPanelCard>
    );
  }

  if (!data || data.length === 0) {
    return (
      <InfoPanelCard title="Flea Market">
        <p className="text-sm text-slate-400">No flea markets in the next 7 days.</p>
      </InfoPanelCard>
    );
  }

  return (
    <InfoPanelCard title="Flea Market">
      <ul className="flex flex-col gap-2">
        {data.map((event) => (
          <li key={event.url} className="text-sm text-slate-300">
            <a
              href={event.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-slate-100 hover:text-indigo-400 hover:underline"
            >
              {event.name}
            </a>
            <br />
            <span className="text-slate-400">
              {formatEventDate(event.date)}
              {event.location && ` · ${event.location}`}
            </span>
          </li>
        ))}
      </ul>
    </InfoPanelCard>
  );
}
