import { useState } from "react";

import { InfoPanelCard } from "./InfoPanelCard";
import type { NewsItem } from "./newsApi";

interface NewsListPanelProps {
  title: string;
  items: NewsItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  /**
   * BCP 47 tag for the *headlines*, when they aren't in the document language.
   * The document is `lang="en"` but Tagesschau and Dortmund return German, and
   * a screen reader will read German with an English voice unless the list
   * says otherwise (WCAG 3.1.2). A prop rather than a constant because this
   * component is shared with the English WotC feed.
   */
  lang?: string;
}

const VISIBLE_COUNT = 5;

/** Shared list rendering for the homepage's news panels (Tagesschau, WotC, Dortmund) - only the data source differs between them. */
export function NewsListPanel({ title, items, isLoading, isError, lang }: NewsListPanelProps) {
  const [expanded, setExpanded] = useState(false);

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

  const visibleItems = expanded ? items : items.slice(0, VISIBLE_COUNT);
  const hasMore = items.length > VISIBLE_COUNT;

  return (
    <InfoPanelCard title={title}>
      <ul lang={lang} className="flex flex-col divide-y divide-white/5">
        {visibleItems.map((item) => (
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
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
        >
          {expanded ? "Show less" : `Show ${items.length - VISIBLE_COUNT} more`}
        </button>
      )}
    </InfoPanelCard>
  );
}
