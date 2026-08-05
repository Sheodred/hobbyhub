import { FadeIn } from "../../components/FadeIn";
import type { MetaEntry } from "./api";

interface MetaWidgetProps {
  title: string;
  source: string;
  entries: MetaEntry[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function MetaWidget({ title, source, entries, isLoading, isError }: MetaWidgetProps) {
  return (
    <FadeIn className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="text-sm font-medium text-slate-100">{title}</h3>
      <p className="text-xs text-slate-500">{source}</p>

      {isError && <p className="mt-3 text-sm text-slate-400">Couldn&apos;t load this right now.</p>}

      {!isError && isLoading && (
        <div className="mt-3 animate-pulse space-y-2" aria-hidden="true">
          <div className="h-4 w-full rounded bg-slate-800" />
          <div className="h-4 w-5/6 rounded bg-slate-800" />
          <div className="h-4 w-3/4 rounded bg-slate-800" />
        </div>
      )}

      {!isError && !isLoading && (!entries || entries.length === 0) && (
        <p className="mt-3 text-sm text-slate-400">No data available right now.</p>
      )}

      {!isError && !isLoading && entries && entries.length > 0 && (
        <ol className="mt-3 flex flex-col gap-2">
          {entries.map((entry, index) => (
            <li key={entry.url} className="flex items-baseline gap-2">
              <span className="text-xs text-slate-500">{index + 1}.</span>
              <a
                href={entry.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-slate-200 hover:text-indigo-400 hover:underline"
              >
                {entry.name}
              </a>
              {entry.numDecks != null && (
                <span className="ml-auto shrink-0 text-xs text-slate-500">{entry.numDecks.toLocaleString()} decks</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </FadeIn>
  );
}
