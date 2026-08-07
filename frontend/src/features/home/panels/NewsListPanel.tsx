import { InfoPanelCard } from "./InfoPanelCard";
import type { NewsItem } from "./newsApi";

interface NewsListPanelProps {
  title: string;
  items: NewsItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

/** Shared list rendering for the homepage's news panels (Tagesschau, WotC) - only the data source differs between them. */
export function NewsListPanel({ title, items, isLoading, isError }: NewsListPanelProps) {
  if (isError) {
    return (
      <InfoPanelCard title={title}>
        <p className="text-sm text-slate-400">Couldn&apos;t load the latest headlines right now.</p>
      </InfoPanelCard>
    );
  }

  if (isLoading) {
    return (
      <InfoPanelCard title={title}>
        <div className="animate-pulse space-y-2" aria-hidden="true">
          <div className="h-4 w-full rounded bg-slate-800" />
          <div className="h-4 w-5/6 rounded bg-slate-800" />
          <div className="h-4 w-3/4 rounded bg-slate-800" />
        </div>
        <span className="sr-only">Loading headlines…</span>
      </InfoPanelCard>
    );
  }

  if (!items || items.length === 0) {
    return (
      <InfoPanelCard title={title}>
        <p className="text-sm text-slate-400">No headlines available right now.</p>
      </InfoPanelCard>
    );
  }

  return (
    <InfoPanelCard title={title}>
      <ul className="flex flex-col divide-y divide-white/5">
        {items.map((item) => (
          <li key={item.url} className="py-3 first:pt-0 last:pb-0">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block text-sm text-slate-200 hover:text-indigo-400 hover:underline"
            >
              {item.headline}
            </a>
            {item.teaser && <p className="mt-1 text-xs text-slate-400">{item.teaser}</p>}
          </li>
        ))}
      </ul>
    </InfoPanelCard>
  );
}
