import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import { FadeIn } from "../../components/FadeIn";
import { QueryState } from "../../components/QueryState";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { getArchetypeDecks } from "./api";

export function ArchetypeDecksPage() {
  const [searchParams] = useSearchParams();
  const archetype = searchParams.get("archetype") ?? "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["mtg-archetype-decks", archetype],
    queryFn: () => getArchetypeDecks(archetype),
    enabled: archetype !== "",
  });

  useDocumentTitle(data?.archetypeName ?? "Decks");

  return (
    <div>
      <FadeIn>
        <Link to="/mtg/meta" className="text-sm text-indigo-400 hover:underline">
          &larr; Back to meta &amp; stats
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-slate-100">{data?.archetypeName ?? "Decks"}</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Tournament decks for this archetype, from an imported MTGGoldfish snapshot.
        </p>
      </FadeIn>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        isEmpty={!data || data.decks.length === 0}
        loadingFallback={
          <div className="mt-6 animate-pulse space-y-2" aria-hidden="true">
            <div className="h-12 w-full rounded-xl bg-slate-800" />
            <div className="h-12 w-full rounded-xl bg-slate-800" />
          </div>
        }
        errorFallback={<p className="mt-6 text-slate-400">Couldn&apos;t load decks right now.</p>}
        // Not an error: the snapshot simply has not been imported for this
        // archetype yet, and saying so is more useful than an empty page.
        emptyFallback={<p className="mt-6 text-slate-400">No decks have been imported for this archetype yet.</p>}
      >
        <ul className="mt-6 flex flex-col gap-2">
          {(data?.decks ?? []).map((deck) => (
            <li key={deck.deckId}>
              <Link
                to={`/mtg/decks/${deck.deckId}`}
                className="block rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-indigo-500/60"
              >
                <p className="text-sm font-medium text-slate-100">{deck.name}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {[deck.pilot, deck.event].filter(Boolean).join(" · ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </QueryState>
    </div>
  );
}
