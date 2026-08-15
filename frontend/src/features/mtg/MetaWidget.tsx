import { Link } from "react-router-dom";

import { FadeIn } from "../../components/FadeIn";
import { QueryState } from "../../components/QueryState";
import type { MetaEntry } from "./api";
import { CardHoverPreview } from "./CardHoverPreview";

// An MTGGoldfish archetype is identified by its path alone, which is also how
// the deck importer stores it - so a meta entry pointing at one can go to our
// own deck list instead of off-site. Anything else stays an outbound link.
function archetypePath(url: string): string | null {
  try {
    const { pathname } = new URL(url, "https://www.mtggoldfish.com");
    return pathname.startsWith("/archetype/") ? pathname : null;
  } catch {
    return null;
  }
}

interface MetaWidgetProps {
  title: string;
  source: string;
  entries: MetaEntry[] | undefined;
  isLoading: boolean;
  isError: boolean;
  /** Entries are actual card/commander names (not deck archetype names) - enables the Scryfall hover preview. */
  cardNames?: boolean;
}

export function MetaWidget({ title, source, entries, isLoading, isError, cardNames = false }: MetaWidgetProps) {
  return (
    <FadeIn className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="text-sm font-medium text-slate-100">{title}</h3>
      <p className="text-xs text-slate-500">{source}</p>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        isEmpty={!entries || entries.length === 0}
        loadingFallback={
          <div className="mt-3 animate-pulse space-y-2" aria-hidden="true">
            <div className="h-4 w-full rounded bg-slate-800" />
            <div className="h-4 w-5/6 rounded bg-slate-800" />
            <div className="h-4 w-3/4 rounded bg-slate-800" />
          </div>
        }
        errorFallback={<p className="mt-3 text-sm text-slate-400">Couldn&apos;t load this right now.</p>}
        emptyFallback={<p className="mt-3 text-sm text-slate-400">No data available right now.</p>}
      >
        <ol className="mt-3 flex flex-col gap-2">
          {(entries ?? []).map((entry, index) => (
            <li key={entry.url} className="flex items-baseline gap-2">
              <span className="text-xs text-slate-500">{index + 1}.</span>
              {cardNames ? (
                <CardHoverPreview name={entry.name}>
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-slate-200 hover:text-indigo-400 hover:underline"
                  >
                    {entry.name}
                  </a>
                </CardHoverPreview>
              ) : archetypePath(entry.url) ? (
                <Link
                  to={`/mtg/decks?archetype=${encodeURIComponent(archetypePath(entry.url)!)}`}
                  className="text-sm text-slate-200 hover:text-indigo-400 hover:underline"
                >
                  {entry.name}
                </Link>
              ) : (
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-slate-200 hover:text-indigo-400 hover:underline"
                >
                  {entry.name}
                </a>
              )}
              {entry.numDecks != null && (
                <span className="ml-auto shrink-0 text-xs text-slate-500">{entry.numDecks.toLocaleString()} decks</span>
              )}
            </li>
          ))}
        </ol>
      </QueryState>
    </FadeIn>
  );
}
