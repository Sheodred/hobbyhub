import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { FadeIn } from "../../components/FadeIn";
import { ApiError } from "../../lib/apiClient";
import { getMtgMeta, searchCards } from "./api";

const FEATURED_ART = "https://cards.scryfall.io/art_crop/front/4/e/4e4fb50c-a81f-44d3-93c5-fa9a0b37f617.jpg";

export function MtgPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["mtg-search", submittedQuery, page],
    queryFn: () => searchCards(submittedQuery, page),
    enabled: submittedQuery.length > 0,
  });

  // EDHREC's "most played, past week" list - reused here (already fetched
  // for the Meta & Stats page) as inspiration for people who land on search
  // with no idea what to look for yet, not as a new data source.
  const { data: metaData } = useQuery({ queryKey: ["mtg-meta"], queryFn: getMtgMeta, enabled: submittedQuery.length === 0 });

  function runSearch(q: string) {
    setPage(1);
    setSubmittedQuery(q);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    runSearch(query.trim());
  }

  function handleSuggestionClick(name: string) {
    setQuery(name);
    runSearch(name);
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-slate-800">
        <img
          src={FEATURED_ART}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-50"
        />
        {/* Two layers: a vertical dark fade for text legibility, and a
            diagonal color sweep on top for a livelier, less flat look. */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-transparent"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-tr from-fuchsia-600/30 via-transparent to-blue-600/30"
          aria-hidden="true"
        />
        <div className="relative px-6 py-10">
          <h1 className="text-3xl font-semibold text-white drop-shadow-sm">Magic: The Gathering</h1>
          <p className="mt-2 max-w-xl text-slate-200 drop-shadow-sm">
            Search the full card catalog, powered by{" "}
            <a href="https://scryfall.com" target="_blank" rel="noreferrer" className="underline hover:text-white">
              Scryfall
            </a>
            .
          </p>
          <Link
            to="/mtg/meta"
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/20"
          >
            Meta &amp; Stats &rarr;
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
        <label htmlFor="mtg-search" className="sr-only">
          Search cards
        </label>
        <input
          id="mtg-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a card, e.g. Lightning Bolt"
          className="w-full max-w-md rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
        <button
          type="submit"
          className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
        >
          Search
        </button>
      </form>

      <div className="mt-6">
        {submittedQuery.length === 0 && (
          <div>
            <p className="text-slate-400">Not sure what to search for? Popular this week, via EDHREC:</p>
            {metaData?.mostPlayedCards && metaData.mostPlayedCards.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {metaData.mostPlayedCards.map((card) => (
                  <button
                    key={card.name}
                    type="button"
                    onClick={() => handleSuggestionClick(card.name)}
                    className="rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-sm text-slate-200 hover:border-indigo-500 hover:text-indigo-400"
                  >
                    {card.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isFetching && <p className="text-slate-400">Searching…</p>}

        {isError && (
          <p role="alert" className="text-rose-400">
            {error instanceof ApiError ? error.message : "Something went wrong searching for cards."}
          </p>
        )}

        {data && !isFetching && data.cards.length === 0 && (
          <p className="text-slate-400">No cards found for &quot;{submittedQuery}&quot;.</p>
        )}

        {data && data.cards.length > 0 && (
          <FadeIn key={`${submittedQuery}-${page}`}>
            <p className="mb-3 text-sm text-slate-400">{data.totalCards} card(s) found</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {data.cards.map((card) => (
                <Link
                  key={card.id}
                  to={`/mtg/${card.id}`}
                  className="group overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60 transition-colors hover:border-indigo-500"
                >
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt={card.name} className="aspect-[5/7] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[5/7] w-full items-center justify-center bg-slate-800 p-2 text-center text-xs text-slate-400">
                      {card.name}
                    </div>
                  )}
                  <div className="p-2">
                    <p className="truncate text-sm font-medium text-slate-100 group-hover:text-indigo-400">
                      {card.name}
                    </p>
                    <p className="truncate text-xs text-slate-400">{card.setName}</p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-slate-400">Page {page}</span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.hasMore}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  );
}
