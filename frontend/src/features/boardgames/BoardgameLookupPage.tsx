import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";

import { FadeIn } from "../../components/FadeIn";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { ApiError } from "../../lib/apiClient";
import {
  lookupBoardgame,
  lookupBoardgameById,
  lookupBoardgameLocal,
  suggestBoardgames,
  topBoardgames,
  type Boardgame,
  type BoardgameCandidate,
  type BoardgameLookupResult,
  type TopBoardgame,
} from "./api";

type ViewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "disambiguation"; candidates: BoardgameCandidate[] }
  | { kind: "not_found"; query: string; suggestions: BoardgameCandidate[] }
  | { kind: "result"; game: Boardgame; enriching: boolean };

// 2 chars keeps a single keystroke from firing a request; 200ms is short
// enough to feel live without hammering the (indexed, but still real)
// bgg_ranks query on every keystroke.
const SUGGEST_MIN_LENGTH = 2;
const SUGGEST_DEBOUNCE_MS = 200;

/**
 * The link worth sending: bgg_id, never the typed name. Names are ambiguous -
 * that is what the disambiguation flow exists for - so a shared "?q=brass"
 * could resolve to a different game for the recipient than for the sender.
 */
function shareLink(bggId: number): string {
  return `${window.location.origin}${window.location.pathname}?bgg_id=${bggId}`;
}

/** For browsers without the clipboard API, and for any page not on https. */
function legacyCopy(text: string): boolean {
  const field = document.createElement("textarea");
  field.value = text;
  document.body.appendChild(field);
  field.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

export function BoardgameLookupPage() {
  useDocumentTitle("Boardgame Lookup");

  // #99: the search lives in the URL, so a result can be linked, bookmarked,
  // reloaded and reached with Back. The URL is the input to the lookup; the
  // handlers below only write to it and let the effect do the fetching.
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q")?.trim() ?? "";
  const urlBggId = Number(searchParams.get("bgg_id"));

  const [query, setQuery] = useState(urlQuery);
  const [state, setState] = useState<ViewState>({ kind: "idle" });
  const [suggestions, setSuggestions] = useState<BoardgameCandidate[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [top, setTop] = useState<TopBoardgame[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // A starting point for a visitor with nothing to type yet (#102). Reads
  // the local ranks dump only, so it costs milliseconds. A failure or an
  // un-imported dump leaves the list empty and the section unrendered -
  // never an empty grid, and never an error the page didn't ask for.
  useEffect(() => {
    // Nothing to do on failure: the initial state is already "show nothing",
    // and this is a nice-to-have the page never promised.
    topBoardgames().then(setTop, () => {});
  }, []);

  function closeSuggestions() {
    setSuggestions([]);
    setActiveIndex(-1);
  }

  function applyResult(result: BoardgameLookupResult) {
    if (result.status === "ok") {
      setState({ kind: "result", game: result.game, enriching: false });
    } else if (result.status === "not_found") {
      setState({ kind: "not_found", query: result.query, suggestions: result.suggestions });
    } else {
      setState({ kind: "disambiguation", candidates: result.candidates });
    }
  }

  function errorState(err: unknown): ViewState {
    return { kind: "error", message: err instanceof ApiError ? err.message : "Something went wrong." };
  }

  function fail(err: unknown) {
    setState(errorState(err));
  }

  async function runSearch(term: string) {
    setState({ kind: "loading" });

    // The dump answers in milliseconds; the full lookup walks four Rating
    // Sources sequentially and measured 4-5s cold in production. Show the
    // cheap half straight away rather than holding the page for the slow
    // one. A failure here is not reported - the full lookup below is still
    // authoritative and will report its own.
    try {
      const local = await lookupBoardgameLocal(term);
      if (local.status === "ok") {
        setState({ kind: "result", game: local.game, enriching: true });
      } else if (local.status === "disambiguation") {
        setState({ kind: "disambiguation", candidates: local.candidates });
      }
    } catch {
      // Fall through to the full lookup.
    }

    try {
      applyResult(await lookupBoardgame(term));
    } catch (err) {
      // Keep a good partial answer rather than replacing it with an error:
      // before #91 the dump's data was all you got when BGG was unreachable,
      // and discarding it here would be a regression on that.
      setState((current) =>
        current.kind === "result" ? { ...current, enriching: false } : errorState(err)
      );
    }
  }

  async function runLookupById(bggId: number) {
    setState({ kind: "loading" });
    try {
      applyResult(await lookupBoardgameById(bggId));
    } catch (err) {
      fail(err);
    }
  }

  // The URL drives the lookup. Submitting pushes a new entry (so Back returns
  // to the previous search); the typeahead deliberately never gets here.
  useEffect(() => {
    setCopyState("idle");
    if (Number.isInteger(urlBggId) && urlBggId > 0) {
      void runLookupById(urlBggId);
    } else if (urlQuery !== "") {
      void runSearch(urlQuery);
    } else {
      setState({ kind: "idle" });
    }
    // runSearch/runLookupById are redefined every render; the URL is the only
    // real input here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery, urlBggId]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    closeSuggestions();
    const term = query.trim();
    if (term === "") return;
    setSearchParams({ q: term });
  }

  // name is set straight into the box: without it, choosing a candidate
  // leaves the old query on screen next to a different game's result.
  function pick(bggId: number, name?: string) {
    if (name !== undefined) setQuery(name);
    closeSuggestions();
    setSearchParams({ bgg_id: String(bggId) });
  }

  function selectSuggestion(candidate: BoardgameCandidate) {
    setQuery(candidate.name);
    pick(candidate.bggId);
  }

  function onQueryChange(value: string) {
    setQuery(value);
    clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (trimmed.length < SUGGEST_MIN_LENGTH) {
      closeSuggestions();
      return;
    }
    debounceRef.current = setTimeout(() => {
      suggestBoardgames(trimmed)
        .then((results) => {
          setSuggestions(results);
          setActiveIndex(-1);
        })
        .catch(closeSuggestions);
    }, SUGGEST_DEBOUNCE_MS);
  }

  async function copyLink(bggId: number) {
    const url = shareLink(bggId);
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
    } catch {
      setCopyState(legacyCopy(url) ? "copied" : "failed");
    }
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && suggestions[activeIndex]) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      closeSuggestions();
    }
  }

  // WCAG 4.1.3. One always-mounted region below carries this: a live region
  // that appears with its text already inside it is routinely not announced.
  // The error case keeps its own role="alert" - that one should interrupt.
  let statusText = "";
  if (state.kind === "loading") statusText = "Searching…";
  else if (state.kind === "disambiguation") statusText = "Several games match that name — which one did you mean?";
  else if (state.kind === "result")
    statusText = state.enriching
      ? `${state.game.name} found — still checking the other sources`
      : `${state.game.name} found`;
  else if (state.kind === "not_found")
    statusText =
      state.suggestions.length > 0
        ? `No exact match for “${state.query}”. ${state.suggestions.length} similar name${
            state.suggestions.length === 1 ? "" : "s"
          } suggested.`
        : `No board game found for “${state.query}”.`;
  // Copying is the last thing you did, so it is what the status line should
  // say. Reuses the region above rather than adding a fourth live region.
  if (copyState === "copied" && state.kind === "result")
    statusText = `Link copied — it opens ${state.game.name} for whoever you send it to.`;

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
        <div className="relative w-full max-w-md">
          <input
            id="boardgame-search"
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={suggestions.length > 0}
            aria-controls="boardgame-search-suggestions"
            aria-activedescendant={
              suggestions[activeIndex] ? `boardgame-suggestion-${suggestions[activeIndex].bggId}` : undefined
            }
            autoComplete="off"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            onBlur={closeSuggestions}
            placeholder="Search for a board game, e.g. Frosthaven"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          {suggestions.length > 0 && (
            <ul
              id="boardgame-search-suggestions"
              role="listbox"
              aria-label="Suggestions"
              className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-slate-700 bg-slate-900 shadow-lg"
            >
              {suggestions.map((candidate, index) => (
                // Keyboard operability for this option is provided by the
                // owning input's onKeyDown (Arrow keys + Enter), per the
                // ARIA 1.2 combobox pattern - focus never lands on the
                // option itself, so a keyboard handler here would be dead
                // code, not a fix.
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={candidate.bggId}
                  id={`boardgame-suggestion-${candidate.bggId}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  // Keeps focus on the input on click so onBlur doesn't close
                  // the list before the click's onClick can fire.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(candidate)}
                  className={`cursor-pointer px-3 py-2 text-sm ${
                    index === activeIndex ? "bg-indigo-600 text-white" : "text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {candidate.name}
                  {candidate.yearPublished ? ` (${candidate.yearPublished})` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Search
        </button>
      </form>

      <div className="mt-6">
        <p role="status" className="mb-3 text-sm text-slate-400 empty:mb-0">
          {statusText}
        </p>
        {/* Separate from the status region above: that one narrates the
            lookup outcome, this one narrates the suggestion list, and the
            two would step on each other if merged. */}
        <p aria-live="polite" className="sr-only">
          {suggestions.length > 0
            ? `${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"} available`
            : ""}
        </p>

        {state.kind === "error" && (
          <p role="alert" className="text-rose-400">
            {state.message}
          </p>
        )}

        {state.kind === "disambiguation" && (
          <FadeIn>
            <ul className="flex flex-wrap gap-2">
              {state.candidates.map((candidate) => (
                <li key={candidate.bggId}>
                  <button
                    type="button"
                    onClick={() => pick(candidate.bggId, candidate.name)}
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

        {/* Deliberately the same markup as the disambiguation list above: a
            plain <ul> of buttons, not a second listbox. This appears after a
            submitted search rather than under a focused input, so there is
            no combobox owning it and no aria-activedescendant driving it -
            listbox semantics would promise arrow-key navigation that has
            nothing behind it. Announcement goes through the existing
            role="status" region, not a third live region - and since that
            region is visible, the outcome sentence lives there only. What is
            left here is the lead-in and the advice; repeating the sentence
            rendered it twice, stacked (#107). */}
        {state.kind === "not_found" && (
          <FadeIn>
            {state.suggestions.length > 0 ? (
              <>
                <p className="mb-3 text-slate-300">Did you mean:</p>
                <ul className="flex flex-wrap gap-2">
                  {state.suggestions.map((candidate) => (
                    <li key={candidate.bggId}>
                      <button
                        type="button"
                        onClick={() => pick(candidate.bggId, candidate.name)}
                        className="rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-sm text-slate-200 hover:border-indigo-500 hover:text-indigo-400"
                      >
                        {candidate.name}
                        {candidate.yearPublished ? ` (${candidate.yearPublished})` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-slate-300">Check the spelling, or try a shorter search.</p>
            )}
          </FadeIn>
        )}

        {/* Only before anything has been searched (#102): once a lookup is
            running or an answer is up, this would push the answer down the
            page. Real buttons, not clickable cards - each one activates a
            lookup. Announcement goes through the role="status" region above;
            this list has a heading and needs no live region of its own. */}
        {state.kind === "idle" && top.length > 0 && (
          <section>
            <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Top rated on BoardGameGeek
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {top.map((game) => (
                <li key={game.bggId}>
                  <button
                    type="button"
                    onClick={() => pick(game.bggId, game.name)}
                    className="flex w-full min-w-0 items-baseline gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <span className="shrink-0 text-xs font-medium text-indigo-300">#{game.rank}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                      {game.name}
                      {game.yearPublished ? ` (${game.yearPublished})` : ""}
                    </span>
                    {game.rating !== null && (
                      <span className="shrink-0 text-xs text-slate-400">{game.rating.toFixed(1)} / 10</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {state.kind === "result" && (
          <FadeIn key={state.game.bggId}>
            <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-2xl font-semibold text-slate-100">
                  {state.game.name}
                  {/* Not decoration: an expansion needs a base game, which is
                      the first thing that decides whether you can play it. */}
                  {state.game.isExpansion && (
                    <span className="ml-2 align-middle rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-200">
                      Expansion
                    </span>
                  )}
                </h2>
                {state.game.rating !== null && (
                  <p className="flex items-baseline gap-2">
                    {/* JSON drops the trailing zero, so 8.0 arrives as 8 - pin
                        one decimal so ratings line up with each other. */}
                    <span className="text-2xl font-semibold text-indigo-400">{state.game.rating.toFixed(1)}</span>
                    <span className="text-xs text-slate-400">
                      / 10{state.game.numRatings !== null && ` · ${state.game.numRatings} ratings`}
                    </span>
                  </p>
                )}
              </div>

              {/* One chip per fact rather than a dot-separated line: these are
                  the facts that decide whether a game suits your table, and as
                  small grey text they were the hardest thing on the card to
                  read. */}
              {(state.game.players ||
                state.game.duration ||
                state.game.age ||
                state.game.rank !== null ||
                state.game.complexity) && (
                <p className="mt-3 flex flex-wrap items-center gap-2">
                  {[
                    state.game.players && `${state.game.players} players`,
                    state.game.duration,
                    state.game.age,
                    state.game.rank !== null && `BGG rank #${state.game.rank}`,
                  ]
                    .filter((fact): fact is string => Boolean(fact))
                    .map((fact) => (
                      <span
                        key={fact}
                        className="rounded-full border border-indigo-400/25 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-100"
                      >
                        {fact}
                      </span>
                    ))}
                  {/* Their number on their scale, linked to the review that
                      published it - "4" alone would read as a universal
                      difficulty rating nobody ever gave. Same chip, underlined,
                      because this one is the only fact you can click. */}
                  {state.game.complexity && (
                    <a
                      href={state.game.complexity.url}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="rounded-full border border-indigo-400/25 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-100 underline decoration-indigo-300/40 underline-offset-2 hover:border-indigo-400/60 hover:text-white"
                    >
                      Komplexität {state.game.complexity.value} / {state.game.complexity.max} · brettspiele-report
                    </a>
                  )}
                </p>
              )}

              {state.game.bgq && (
                <section className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">How it plays</h3>
                  <p className="mt-1 text-sm text-slate-300">{state.game.bgq.rules}</p>
                  <a
                    href={state.game.bgq.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-xs text-slate-400 underline hover:text-slate-300"
                  >
                    Read the full review at Board Game Quest
                  </a>
                </section>
              )}

              {state.game.partial && !state.game.bgq ? (
                <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200/90">
                  Only the community rating is available for this game right now — the description and player
                  comments come from BoardGameGeek&apos;s live API, which this site can&apos;t reach yet.
                </p>
              ) : (
                <p className="mt-4 text-slate-300">{state.game.description}</p>
              )}

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

              {/* ?. rather than .length despite the type saying this is
                  always an array: it came from the network, and when the
                  instant-answer endpoint omitted the key this threw and -
                  with no error boundary in the app - blanked the page
                  instead of dropping one section. */}
              {(state.game.ratings?.length ?? 0) > 0 && (
                <div className="mt-6 border-t border-slate-800 pt-4">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Also rated by</h3>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {(state.game.ratings ?? []).map((rating) => (
                      // min-w-0: a grid item defaults to min-width:auto, so
                      // without it the card grows to fit the longest retail
                      // title ("Pegasus Spiele 51896G - Spirit Island
                      // (deutsche Ausgabe)") and drags the whole page into a
                      // sideways scroll on a phone. The truncate below can
                      // only do its job once the item is allowed to shrink.
                      <li key={rating.source} className="min-w-0 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-semibold text-amber-300">{rating.value.toFixed(1)}</span>
                          {/* Each source has its own scale - never dropped, or
                              a 15 would read as worse than a 4.8. */}
                          <span className="shrink-0 text-xs text-slate-400">/ {rating.max}</span>
                          <span className="ml-auto min-w-0 truncate text-xs text-slate-400">{rating.source}</span>
                        </div>
                        {rating.count !== null && (
                          <p className="mt-1 text-xs text-slate-400">{rating.count.toLocaleString("en")} ratings</p>
                        )}
                        {/* What the source actually matched, so a wrong match
                            is visible rather than hidden behind a number. */}
                        <a
                          href={rating.url}
                          target="_blank"
                          rel="noreferrer nofollow"
                          className="mt-1 block truncate text-xs text-slate-400 underline hover:text-slate-300"
                        >
                          {rating.title ?? "View on site"}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* #99: the address bar already carries the search, but nobody
                  expects that to work on a search page, so the card says so.
                  Confirmation is announced through the status region above. */}
              <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-t border-slate-800 pt-4">
                <div>
                  <button
                    type="button"
                    onClick={() => copyLink(state.game.bggId)}
                    className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 hover:border-indigo-500 hover:text-indigo-400"
                  >
                    {copyState === "copied" ? "Link copied" : "Copy a link to this game"}
                  </button>
                  <p className="mt-2 text-xs text-slate-400">
                    Whoever opens it lands on this page, showing {state.game.name}.
                  </p>
                  {copyState === "failed" && (
                    <p className="mt-2 text-xs text-slate-400">
                      This browser wouldn&apos;t let the page copy for you — the link is{" "}
                      <code className="break-all text-slate-300">{shareLink(state.game.bggId)}</code>
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-400">
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
              </div>
            </article>
          </FadeIn>
        )}
      </div>
    </div>
  );
}
