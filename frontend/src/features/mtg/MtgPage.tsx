import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { FadeIn } from "../../components/FadeIn";
import { ApiError } from "../../lib/apiClient";
import { searchCards } from "./api";

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setSubmittedQuery(query.trim());
  }

  return (
    <div>
      <FadeIn className="relative overflow-hidden rounded-xl border border-slate-800">
        <img
          src={FEATURED_ART}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-50"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-fuchsia-600/30"
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
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
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
            className="w-full max-w-md rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          >
            Search
          </button>
        </form>
      </FadeIn>

      <div className="mt-6">
        {submittedQuery.length === 0 && <p className="text-slate-400">Enter a card name above to start browsing.</p>}

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
          <>
            <p className="mb-3 text-sm text-slate-500">{data.totalCards} card(s) found</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {data.cards.map((card, index) => (
                <FadeIn key={card.id} onScroll delay={Math.min(index * 0.03, 0.24)}>
                  <Link
                    to={`/mtg/${card.id}`}
                    className="group block overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60 transition-colors hover:border-indigo-500"
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
                      <p className="truncate text-xs text-slate-500">{card.setName}</p>
                    </div>
                  </Link>
                </FadeIn>
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
          </>
        )}
      </div>
    </div>
  );
}
