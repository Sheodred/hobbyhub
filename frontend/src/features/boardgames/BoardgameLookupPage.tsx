import { useState, type FormEvent } from "react";

import { FadeIn } from "../../components/FadeIn";
import { ApiError } from "../../lib/apiClient";
import {
  lookupBoardgame,
  lookupBoardgameById,
  type Boardgame,
  type BoardgameCandidate,
  type BoardgameLookupResult,
} from "./api";

type ViewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "disambiguation"; candidates: BoardgameCandidate[] }
  | { kind: "result"; game: Boardgame };

export function BoardgameLookupPage() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<ViewState>({ kind: "idle" });

  function applyResult(result: BoardgameLookupResult) {
    setState(
      result.status === "ok"
        ? { kind: "result", game: result.game }
        : { kind: "disambiguation", candidates: result.candidates }
    );
  }

  function fail(err: unknown) {
    setState({ kind: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (query.trim() === "") return;
    setState({ kind: "loading" });
    try {
      applyResult(await lookupBoardgame(query.trim()));
    } catch (err) {
      fail(err);
    }
  }

  async function pick(bggId: number) {
    setState({ kind: "loading" });
    try {
      applyResult(await lookupBoardgameById(bggId));
    } catch (err) {
      fail(err);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold text-white sm:text-4xl">Boardgame Lookup</h1>
      <p className="mt-2 max-w-xl text-slate-400">
        One box in, one answer out: the community rating, what players love and don&apos;t, and what the game
        actually plays like.
      </p>

      <form role="search" onSubmit={handleSubmit} className="mt-6 flex flex-wrap items-center gap-3">
        <label htmlFor="boardgame-search" className="sr-only">
          Board game name
        </label>
        <input
          id="boardgame-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a board game, e.g. Catan"
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
        {state.kind === "loading" && <p className="text-slate-400">Searching…</p>}

        {state.kind === "error" && (
          <p role="alert" className="text-rose-400">
            {state.message}
          </p>
        )}

        {state.kind === "disambiguation" && (
          <FadeIn>
            <p className="mb-3 text-sm text-slate-400">Several games match that name — which one did you mean?</p>
            <ul className="flex flex-wrap gap-2">
              {state.candidates.map((candidate) => (
                <li key={candidate.bggId}>
                  <button
                    type="button"
                    onClick={() => pick(candidate.bggId)}
                    className="rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-sm text-slate-200 hover:border-indigo-500 hover:text-indigo-400"
                  >
                    {candidate.name}
                    {candidate.yearPublished ? ` (${candidate.yearPublished})` : ""}
                  </button>
                </li>
              ))}
            </ul>
          </FadeIn>
        )}

        {state.kind === "result" && (
          <FadeIn key={state.game.bggId}>
            <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-2xl font-semibold text-slate-100">{state.game.name}</h2>
                {state.game.rating !== null && (
                  <p className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-indigo-400">{state.game.rating}</span>
                    <span className="text-xs text-slate-500">
                      / 10{state.game.numRatings !== null && ` · ${state.game.numRatings} ratings`}
                    </span>
                  </p>
                )}
              </div>

              <p className="mt-4 text-slate-300">{state.game.description}</p>

              {(state.game.good || state.game.bad) && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {state.game.good && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">The good</p>
                      <p className="mt-2 text-sm text-slate-300">{state.game.good}</p>
                    </div>
                  )}
                  {state.game.bad && (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-rose-400">The bad</p>
                      <p className="mt-2 text-sm text-slate-300">{state.game.bad}</p>
                    </div>
                  )}
                </div>
              )}

              <p className="mt-6 text-xs text-slate-500">
                Data via{" "}
                <a
                  href={state.game.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-slate-300"
                >
                  {state.game.source.name}
                </a>
              </p>
            </article>
          </FadeIn>
        )}
      </div>
    </div>
  );
}
