import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";

import { FadeIn } from "../../components/FadeIn";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { ApiError } from "../../lib/apiClient";
import {
  boardgameAwards,
  lookupBoardgame,
  lookupBoardgameById,
  lookupBoardgameLocal,
  lookupBoardgameLocalById,
  randomBoardgame,
  suggestBoardgames,
  topBoardgames,
  usedMarketSearchUrls,
  type AwardCategory,
  type AwardEntry,
  type Boardgame,
  type BoardgameCandidate,
  type BoardgameLookupResult,
  type Complexity,
  type Lang,
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

// #130: persisted independently of the URL-driven search state (#99) - this
// is a standing site preference, not part of any one search, so switching
// games must not reset it and switching it must not read as a new search
// in the browser's history.
const LANG_STORAGE_KEY = "boardgames_lang";

function initialLang(): Lang {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  if (stored === "de" || stored === "en") return stored;
  // #171: default to English rather than guessing from navigator.language -
  // full localization is a future project, so the toggle starts on the one
  // language every result is guaranteed to have.
  return "en";
}

/**
 * The link worth sending: bgg_id, never the typed name. Names are ambiguous -
 * that is what the disambiguation flow exists for - so a shared "?q=brass"
 * could resolve to a different game for the recipient than for the sender.
 */
function shareLink(bggId: number): string {
  return `${window.location.origin}${window.location.pathname}?bgg_id=${bggId}`;
}

// BGG redirects an id-only URL to the correctly-slugged page itself
// (verified live: /boardgamemechanic/2916 -> /boardgamemechanic/2916/alliances),
// so there is no slug to reproduce here.
function bggTagUrl(kind: "boardgamemechanic" | "boardgamecategory", id: number): string {
  return `https://boardgamegeek.com/${kind}/${id}`;
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

// #131: labels for state.game.interaction - keyed by the exact backend value.
const INTERACTION_LABELS: Record<"competitive" | "cooperative" | "one-vs-all", string> = {
  competitive: "Competitive",
  cooperative: "Cooperative",
  "one-vs-all": "One vs. All",
};

// BGG's weight vote is one of these 5 integer labels per voter; the
// published average is a whole number only by coincidence, so a fractional
// value's label is whichever whole vote it's closest to - standard
// rounding, 0.5 as the boundary between two labels. Only meaningful on
// BGG's own 1-5 scale (max === 5) - brettspiele-report's is 1-20 and has no
// such labels.
const WEIGHT_LABELS = ["Light", "Medium Light", "Medium", "Medium Heavy", "Heavy"];

function complexityText(complexity: Complexity): string {
  if (complexity.max !== 5) {
    return `${complexity.value} / ${complexity.max}`;
  }
  const bucket = Math.min(5, Math.max(1, Math.round(complexity.value)));
  return `${WEIGHT_LABELS[bucket - 1]} (${complexity.value} / ${complexity.max})`;
}

// #116: BGG ships one description field, often 1,000+ chars, as a single
// slab. whitespace-pre-line honours its paragraph breaks; this clamps the
// long ones behind a real <button> so they don't dominate the card. Short
// descriptions render untouched - a "Show more" that reveals two words is
// worse than none, so the toggle only appears past the threshold. Character
// count, not CSS line-clamp: no measuring ref, and the pre-line whitespace
// stays intact.
const DESCRIPTION_CLAMP = 600;

function GameDescription({ text, translated }: { text: string; translated?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > DESCRIPTION_CLAMP;
  // Cut at the last space before the limit so a word never splits; fall
  // back to a hard cut for the (absurd) spaceless case.
  const cut = text.lastIndexOf(" ", DESCRIPTION_CLAMP);
  const clamped =
    long && !expanded ? `${text.slice(0, cut > 0 ? cut : DESCRIPTION_CLAMP)}…` : text;

  return (
    <div className="max-w-prose">
      {/* #129: lang="de" so a screen reader switches pronunciation for the
          translated text - document stays lang="en" (see NewsListPanel),
          only this block is German. The label is the same honesty rule as
          the `partial` notice: a machine translation must never read as the
          publisher's own words. */}
      <p className="whitespace-pre-line text-slate-300" lang={translated ? "de" : undefined}>
        {clamped}
      </p>
      {translated && (
        <p className="mt-1 text-xs text-slate-400">Automatisch übersetzt / AI-translated</p>
      )}
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-2 text-xs text-slate-400 underline hover:text-slate-300"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

// A word count, not a character count, since these are excerpts of prose
// review text where a character clamp routinely cuts mid-word - the
// description above is BGG's own formatted text and keeps its char-based
// clamp, this is short user comments where a word count reads more evenly.
const REVIEW_WORD_CLAMP = 35;

function ReviewSnippet({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const words = text.split(/\s+/);
  const long = words.length > REVIEW_WORD_CLAMP;
  const clamped = long && !expanded ? `${words.slice(0, REVIEW_WORD_CLAMP).join(" ")}…` : text;

  return (
    <p className="break-words py-2 text-sm text-slate-300">
      {clamped}
      {long && (
        <>
          {" "}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="text-xs text-slate-400 underline hover:text-slate-300"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </>
      )}
    </p>
  );
}

// #105: nominees and recommendations render as inline buttons, comma-
// separated, each running a name search on click. Styled as text links so the
// line still reads as prose, not a button row.
function AwardNames({
  label,
  entries,
  className,
  onSelect,
}: {
  label: string;
  entries: AwardEntry[];
  className: string;
  onSelect: (entry: AwardEntry) => void;
}) {
  return (
    <p className={`${className} text-xs text-slate-300`}>
      <span className="text-slate-400">{label}:</span>{" "}
      {entries.map((entry, i) => (
        <span key={entry.name}>
          {i > 0 ? ", " : ""}
          <button
            type="button"
            onClick={() => onSelect(entry)}
            className="rounded underline decoration-slate-400 underline-offset-2 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {entry.name}
          </button>
        </span>
      ))}
    </p>
  );
}

// #117: does this game appear in this year's award panel, and as what? Matches
// the looked-up game's bgg_id against the already-loaded awards (no extra
// fetch), returning the badge label or null. Winner first, then nominee, then
// recommendation - a game can only sit in one pot per category.
function awardBadge(bggId: number, awards: AwardCategory[], year: number | null): string | null {
  const suffix = year === null ? "" : ` ${year}`;
  for (const cat of awards) {
    if (cat.winner.bggId === bggId) return `🏆 ${cat.category}${suffix}`;
    if (cat.nominees.some((e) => e.bggId === bggId)) return `Nominiert · ${cat.category}${suffix}`;
    if (cat.recommended.some((e) => e.bggId === bggId)) return `Empfehlungsliste · ${cat.category}${suffix}`;
  }
  return null;
}

// #117: an award badge on the result card, in the same amber as the Expansion
// badge. Renders nothing when the game isn't in the current award panel.
function AwardBadge({ bggId, awards, year }: { bggId: number; awards: AwardCategory[]; year: number | null }) {
  const label = awardBadge(bggId, awards, year);
  if (label === null) return null;
  return (
    <p className="mt-3">
      <span
        data-testid="award-badge"
        className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-200"
      >
        {label}
      </span>
    </p>
  );
}

// #130: DE/EN toggle - two buttons rather than a <select>, since there are
// only ever two options and a click beats a dropdown for that.
function LangToggle({ lang, onChange }: { lang: Lang; onChange: (lang: Lang) => void }) {
  return (
    <div role="group" aria-label="Sprache" className="inline-flex rounded-full border border-slate-700 p-0.5 text-xs">
      {(["de", "en"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={lang === option}
          onClick={() => onChange(option)}
          className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
            lang === option ? "bg-indigo-500/20 text-indigo-200" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// #128: a small loading ring. motion-safe only, so a prefers-reduced-motion
// visitor gets a static ring rather than a spinning one; aria-hidden because
// the role="status" region already announces the wait in words.
function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-slate-600 border-t-indigo-400 motion-safe:animate-spin"
    />
  );
}

// The game's cover (#135), hotlinked from BGG's CDN - the API caches the URL,
// not the bytes. The parent flex puts it right of the text on desktop and
// above it on mobile.
//
// The box keeps its 160x160 footprint whether or not an image arrives, so the
// text beside it never reflows: the dump-backed partial answer carries no
// cover at all, and neither does a game BGG has no picture for. width/height
// plus loading="lazy" for the same reason - no layout shift when it loads.
//
// BGG's thumbnail is 200x150, not square, so object-contain fits it inside the
// box rather than cropping the box art.
function CoverImage({ name, src }: { name: string; src?: string | null }) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={`Kein Bild zu ${name} verfügbar`}
        className="flex h-40 w-40 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-800/40 text-xs text-slate-400"
      >
        Kein Bild
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Cover von ${name}`}
      loading="lazy"
      width={160}
      height={160}
      className="h-40 w-40 shrink-0 rounded-xl border border-slate-800 bg-slate-950/40 object-contain"
    />
  );
}

export function BoardgameLookupPage() {
  useDocumentTitle("Boardgame Lookup");
  const prefersReducedMotion = usePrefersReducedMotion();

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
  const [awards, setAwards] = useState<AwardCategory[]>([]);
  const [awardYear, setAwardYear] = useState<number | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [lang, setLang] = useState<Lang>(initialLang);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  function chooseLang(next: Lang) {
    setLang(next);
    localStorage.setItem(LANG_STORAGE_KEY, next);
  }

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // A starting point for a visitor with nothing to type yet (#102). Reads
  // the local ranks dump only, so it costs milliseconds. A failure or an
  // un-imported dump leaves the list empty and the section unrendered -
  // never an empty grid, and never an error the page didn't ask for.
  useEffect(() => {
    // Nothing to do on failure: the initial state is already "show nothing",
    // and this is a nice-to-have the page never promised.
    topBoardgames().then(setTop, () => {});
    // #105: the award panel's own source (sdj_awards table), independent of the
    // ranks dump. Same fail-quiet contract - an un-seeded table or a failed
    // fetch leaves the panel unrendered.
    boardgameAwards().then(
      (result) => {
        setAwards(result.categories);
        setAwardYear(result.year);
      },
      () => {}
    );
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

  async function runSearch(term: string) {
    setState({ kind: "loading" });

    // The dump answers in milliseconds; the full lookup walks four Rating
    // Sources sequentially and measured 4-5s cold in production. Show the
    // cheap half straight away rather than holding the page for the slow
    // one. A failure here is not reported - the full lookup below is still
    // authoritative and will report its own.
    try {
      const local = await lookupBoardgameLocal(term, lang);
      if (local.status === "ok") {
        setState({ kind: "result", game: local.game, enriching: true });
      } else if (local.status === "disambiguation") {
        setState({ kind: "disambiguation", candidates: local.candidates });
      }
    } catch {
      // Fall through to the full lookup.
    }

    try {
      applyResult(await lookupBoardgame(term, lang));
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

    // #115: same instant-then-enrich shape as runSearch. A click or a shared
    // link went straight to the 4-5s cold lookup and held the page blank the
    // whole time; the dump can answer this id in milliseconds. A failure here
    // is not reported - the full lookup below is authoritative.
    try {
      const local = await lookupBoardgameLocalById(bggId, lang);
      if (local.status === "ok") {
        setState({ kind: "result", game: local.game, enriching: true });
      }
    } catch {
      // Fall through to the full lookup.
    }

    try {
      applyResult(await lookupBoardgameById(bggId, lang));
    } catch (err) {
      // Keep a good partial answer rather than replacing it with an error,
      // the same way runSearch does.
      setState((current) =>
        current.kind === "result" ? { ...current, enriching: false } : errorState(err)
      );
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
    // runSearch/runLookupById are redefined every render; the URL and the
    // language toggle are the only real inputs here - lang is in the deps
    // so switching DE/EN re-fetches the current result's title, not just
    // future searches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery, urlBggId, lang]);

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

  // #105: award nominees/recommendations run a name search on click - exactly
  // what typing the title and submitting does. German titles may disambiguate
  // or miss, same as any typed search.
  function searchByName(name: string) {
    setQuery(name);
    closeSuggestions();
    setSearchParams({ q: name });
  }

  // #105: an award entry resolves directly by bgg_id when one is seeded, and
  // falls back to a name search when it is null - so every entry is clickable
  // and the id stays optional per row (winners always have one, the rest may).
  function selectAward(entry: AwardEntry) {
    if (entry.bggId !== null) pick(entry.bggId, entry.name);
    else searchByName(entry.name);
  }

  function selectSuggestion(candidate: BoardgameCandidate) {
    setQuery(candidate.name);
    pick(candidate.bggId);
  }

  // Clearing the URL is what actually resets state - the effect above sees
  // an empty q/bgg_id and sets state back to idle itself (same path a fresh
  // visit takes), so this only has to clear what the effect does not: the
  // typed text still sitting in the box and any open suggestion list.
  function resetToOverview() {
    setQuery("");
    closeSuggestions();
    setSearchParams({});
    scrollToTop();
  }

  // The page's own scroll container is <main> (AppShell gives it
  // overflow-y-auto), not the window - window.scrollTo would do nothing here.
  function scrollToTop() {
    document.getElementById("main-content")?.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }

  // #120: one random game, straight to its result page. Navigating by bgg_id
  // means the pick is shareable and back-button-able (#99), and lands on the
  // #115 fast path - a random game is never cached, so that matters. A failed
  // draw just does nothing; it is a button you can simply press again, not
  // something worth an error state.
  async function surpriseMe() {
    try {
      const bggId = await randomBoardgame();
      if (bggId !== null) pick(bggId);
    } catch {
      // No-op: no error surfaced for a button the user can retry.
    }
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
      suggestBoardgames(trimmed, lang)
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

  // #90/#177: used-market search link-outs, computed once per result rather
  // than inline in the JSX below. Shown only alongside a real retail price -
  // eBay.de/Kleinanzeigen.de can never be more than a canned search link
  // (robots.txt disallows scraping either, see usedMarketSearchUrls), so
  // with no price found anywhere they would be pure advertising with
  // nothing backing them.
  const usedMarket =
    state.kind === "result" && (state.game.prices ?? []).length > 0
      ? usedMarketSearchUrls(state.game.name)
      : null;

  return (
    <div>
      <h1 className="text-3xl font-semibold text-white sm:text-4xl">
        {/* Clickable once there is somewhere to come back FROM - on the
            overview itself this is a heading, not a button that reloads the
            page it is already on. */}
        {state.kind === "idle" ? (
          "Boardgame Lookup"
        ) : (
          <button
            type="button"
            onClick={resetToOverview}
            className="rounded text-left hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            Boardgame Lookup
          </button>
        )}
      </h1>
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
        {/* #120: only when the dump has games to draw from - top.length is the
            same "dump imported" signal the top-10 list uses, so no extra
            request just to decide whether to show the button. */}
        {top.length > 0 && (
          <button
            type="button"
            onClick={surpriseMe}
            className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-indigo-500 hover:text-indigo-400"
          >
            Surprise me
          </button>
        )}
        {/* Only once there is something to clear - a typed query, or an
            answer already on screen - so the idle overview never shows a
            button that would do nothing. */}
        {(query !== "" || state.kind !== "idle") && (
          <button
            type="button"
            onClick={resetToOverview}
            className="rounded-md px-3 py-2 text-sm text-slate-400 hover:text-white"
          >
            Clear
          </button>
        )}
        <LangToggle lang={lang} onChange={chooseLang} />
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

        {/* #128: a visible spinner while the first answer is in flight, so a
            sighted visitor sees the app working, not just the status line (which
            stays, for screen readers). aria-hidden - the status region narrates
            it already. */}
        {state.kind === "loading" && (
          <div
            data-testid="loading-indicator"
            aria-hidden="true"
            className="flex items-center gap-3 text-sm text-slate-400"
          >
            <Spinner />
            <span>Searching…</span>
          </div>
        )}

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
            running or an answer is up, this would push the answers down the
            page. #105: the current award results (sdj_awards table) sit beside
            the all-time top 10 - side by side on desktop (lg:grid-cols-2),
            stacked on mobile, award first (current before classic). Each block
            renders only when its own source has data, so either can stand
            alone. Winners are real buttons that activate a lookup (by bgg_id,
            or by name when no id is seeded); nominees and the recommendation
            list are name buttons that run a search. */}
        {state.kind === "idle" && (top.length > 0 || awards.length > 0) && (
          // grid-cols-1 (not bare `grid`, which leaves columns unset below lg)
          // matters here specifically: Tailwind's numbered grid-cols utilities
          // emit minmax(0,1fr) tracks, capping the column's minimum size at 0.
          // Without it the implicit single column sizes to `auto`, and a flex
          // container's own min-content contribution to that track ignores
          // truncate+min-w-0 on its children (a documented flexbox/grid
          // interaction) - so the longest untruncated game title, e.g.
          // "Twilight Imperium: Fourth Edition (2017)", set the column's
          // floor width at ~337px, wider than a 320-375px phone screen, and
          // pushed both panels off the right edge to be silently clipped.
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {awards.length > 0 && (
              <section>
                <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Spiel des Jahres {awardYear}
                </h2>
                {/* #179 follow-up: more room per box (space-y-4/p-4, wider
                    internal margins) so the column's total depth reads
                    closer to the top-10 grid beside it on desktop, rather
                    than three tightly-packed boxes next to five open rows. */}
                <ul className="mt-3 space-y-4">
                  {awards.map((cat) => (
                    <li
                      key={cat.category}
                      className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"
                    >
                      <p className="text-xs font-medium text-indigo-300">
                        {cat.category} {awardYear}
                      </p>
                      <button
                        type="button"
                        onClick={() => selectAward(cat.winner)}
                        className="mt-3 flex w-full min-w-0 items-baseline gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      >
                        <span aria-hidden="true" className="shrink-0 text-xs">🏆</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{cat.winner.name}</span>
                      </button>
                      {cat.nominees.length > 0 && (
                        <AwardNames label="Nominiert" entries={cat.nominees} className="mt-3" onSelect={selectAward} />
                      )}
                      {cat.recommended.length > 0 && (
                        <AwardNames
                          label="Empfehlungsliste"
                          entries={cat.recommended}
                          className="mt-2"
                          onSelect={selectAward}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {top.length > 0 && (
            <section className="lg:flex lg:flex-col">
              <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Top rated on BoardGameGeek
              </h2>
              {/* lg:flex-1 + lg:content-between spread the 5 rows to fill the
                  taller award column beside it, so both blocks end level.
                  grid-cols-1 (not bare `grid`) for the same reason as the
                  outer grid above: below sm this is a single implicit column,
                  and without an explicit minmax(0,1fr) track a row's
                  untruncated game title reasserts the same overflow one level
                  deeper - the outer fix alone left this ul wider than its own
                  now-correctly-sized <section>, so rows spilled out of it. */}
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex-1 lg:content-between">
              {/* #179: taller tile than a single baseline row - BGG's ranks
                  dump carries no player count/duration/age (confirmed live
                  against BGG's own export), so the added height goes to the
                  ratings count and, when a game has one, its category rank(s)
                  instead. A rating bar shipped here first but got dropped
                  (#179 follow-up): every top-10 game sits in a narrow 8.3-8.7
                  band, so the bars all read as the same length - decoration
                  with no signal in it. */}
              {top.map((game) => (
                <li key={game.bggId}>
                  <button
                    type="button"
                    onClick={() => pick(game.bggId, game.name)}
                    className="flex w-full min-w-0 flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-3 text-left hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="shrink-0 text-xs font-medium text-indigo-300">#{game.rank}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                        {game.name}
                        {game.yearPublished ? ` (${game.yearPublished})` : ""}
                      </span>
                      {game.rating !== null && (
                        <span className="shrink-0 text-xs text-slate-400">{game.rating.toFixed(1)} / 10</span>
                      )}
                    </div>
                    {game.categoryRanks.length > 0 && (
                      <p className="flex flex-wrap items-center gap-1.5">
                        {game.categoryRanks.map((cat) => (
                          <span
                            key={cat.label}
                            className="rounded-full border border-indigo-400/25 bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-100"
                          >
                            #{cat.rank} {cat.label}
                          </span>
                        ))}
                      </p>
                    )}
                    {game.numRatings !== null && (
                      <span className="text-xs text-slate-400">{game.numRatings.toLocaleString("en")} ratings</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
            )}
          </div>
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

              {/* #117: award badge when this game is in the current SdJ panel,
                  matched by bgg_id against the already-loaded award data. */}
              <AwardBadge bggId={state.game.bggId} awards={awards} year={awardYear} />

              {/* #128: a subtle "still loading the other sources" cue on the
                  card while the slow half of the lookup runs, so a partial
                  answer doesn't read as final. aria-hidden - the status region
                  narrates it. */}
              {state.enriching && (
                <p
                  data-testid="enriching-indicator"
                  aria-hidden="true"
                  className="mt-3 flex items-center gap-2 text-xs text-slate-400"
                >
                  <Spinner />
                  <span>Loading the other sources…</span>
                </p>
              )}

              {/* One chip per fact rather than a dot-separated line: these are
                  the facts that decide whether a game suits your table, and as
                  small grey text they were the hardest thing on the card to
                  read. */}
              {(state.game.players ||
                state.game.duration ||
                state.game.age ||
                state.game.rank !== null ||
                typeof state.game.strategyRank === "number" ||
                typeof state.game.familyRank === "number" ||
                typeof state.game.thematicRank === "number" ||
                state.game.interaction ||
                state.game.complexity) && (
                <p className="mt-3 flex flex-wrap items-center gap-2">
                  {[
                    state.game.players && `${state.game.players} players`,
                    state.game.duration,
                    state.game.age,
                    state.game.rank !== null && `BGG rank #${state.game.rank}`,
                    // #131-style family league tables, alongside the overall
                    // rank rather than replacing it - a game can be #627
                    // overall and still #592 among strategy games.
                    typeof state.game.strategyRank === "number" && `Strategy rank #${state.game.strategyRank}`,
                    typeof state.game.familyRank === "number" && `Family rank #${state.game.familyRank}`,
                    typeof state.game.thematicRank === "number" && `Thematic rank #${state.game.thematicRank}`,
                    state.game.interaction && INTERACTION_LABELS[state.game.interaction],
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
                  {state.game.complexity && (
                    <span className="rounded-full border border-indigo-400/25 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-100">
                      Komplexität: {complexityText(state.game.complexity)}
                    </span>
                  )}
                </p>
              )}

              {/* #131: BGG's category (theme) links, e.g. "Economic",
                  "Negotiation" - kept at the top beside the facts row rather
                  than moved down with mechanics, and given a distinct rose
                  tint (not the indigo facts, not the neutral mechanic tags
                  below the description) so it reads as its own kind of fact:
                  what KIND of game this is, not a stat about it. */}
              {(state.game.categories?.length ?? 0) > 0 && (
                <p className="mt-3 flex flex-wrap items-center gap-2">
                  {(state.game.categories ?? []).map((category) => (
                    <a
                      key={category.id}
                      href={bggTagUrl("boardgamecategory", category.id)}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="rounded-full border border-rose-400/25 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-100 hover:border-rose-400/60 hover:text-white"
                    >
                      {category.name}
                    </a>
                  ))}
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

              {/* Description text with the cover-image placeholder beside it:
                  image on the right on desktop, above the text on mobile
                  (flex-col reversed to flex-row-reverse at md). */}
              <div className="mt-4 flex flex-col gap-4 md:flex-row-reverse md:items-start">
                <CoverImage name={state.game.name} src={state.game.thumbnail} />
                <div className="min-w-0 flex-1">
                  {state.game.partial && !state.game.bgq ? (
                    <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200/90">
                      Only the community rating is available for this game right now — the description and player
                      comments come from BoardGameGeek&apos;s live API, which didn&apos;t answer for this one.
                    </p>
                  ) : (
                    // #116: honour BGG's paragraph breaks and clamp the long ones.
                    // (Only the full answer reaches here - the partial dump path
                    // has description:"" and shows the notice above.)
                    <GameDescription text={state.game.description} translated={state.game.descriptionTranslated} />
                  )}
                </div>
              </div>

              {/* #131: BGG's mechanic labels, as plain tags - moved below the
                  description (was between the facts row and the description,
                  which made the top of the card too loaded before anyone had
                  read a word about the game). Categories stayed in the facts
                  row above, rose-tinted, as their own kind of fact. Neutral
                  slate chips so mechanics read as classification, not as the
                  indigo facts or the amber award badge above. Absent on the
                  dump-backed partial answer. */}
              {(state.game.mechanics?.length ?? 0) > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(state.game.mechanics ?? []).map((mechanic) => (
                    <a
                      key={mechanic.id}
                      href={bggTagUrl("boardgamemechanic", mechanic.id)}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
                    >
                      {mechanic.name}
                    </a>
                  ))}
                </div>
              )}

              {/* Up to 3 snippets a side now (top-3 best / bottom-3 worst BGG
                  comments, or Board Game Quest's whole hit/miss list as a
                  fallback - see lookup.php), each independently clamped to
                  35 words with its own "Show more" rather than one clamp for
                  the whole box. */}
              {(state.game.good || state.game.bad) && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {state.game.good && (
                    <div className="min-w-0 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">The good</p>
                      {/* divide-y draws a rule between snippets so up to 3 in
                          one box read as separate reviews, not one blob. */}
                      <div className="divide-y divide-emerald-500/10">
                        {state.game.good.map((text) => (
                          <ReviewSnippet key={text} text={text} />
                        ))}
                      </div>
                    </div>
                  )}
                  {state.game.bad && (
                    <div className="min-w-0 rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-rose-400">The bad</p>
                      <div className="divide-y divide-rose-500/10">
                        {state.game.bad.map((text) => (
                          <ReviewSnippet key={text} text={text} />
                        ))}
                      </div>
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

              {/* #90/#172/#176: one retail-price card per source that has an
                  entry for this game (docs/adr/0020) - brettspielpreise.de
                  and amazon.de never displace each other - plus used-market
                  search link-outs. eBay.de and Kleinanzeigen.de are not
                  fetched - see usedMarketSearchUrls for why - so this always
                  renders once a game resolves, with or without a price. */}
              <div className="mt-6 border-t border-slate-800 pt-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Where to buy</h3>
                <div className="mt-3 flex flex-wrap gap-3">
                  {/* ?? [] rather than relying on the type: the dump-backed
                      partial answer (/api/boardgames/local) never sets this
                      field at all, same reason ratings above reads
                      optionally - see #91. */}
                  {(state.game.prices ?? []).map((price) => (
                    <a
                      key={price.source}
                      href={price.url}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 hover:border-indigo-500"
                    >
                      <span className="block text-lg font-semibold text-emerald-300">
                        {price.value.toFixed(2)} €
                      </span>
                      <span className="text-xs text-slate-400">Neu, via {price.source}</span>
                    </a>
                  ))}
                  {usedMarket && (
                    <>
                      <a
                        href={usedMarket.ebay}
                        target="_blank"
                        rel="noreferrer nofollow"
                        className="flex items-center rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-300 hover:border-indigo-500 hover:text-indigo-400"
                      >
                        Gebrauchte Angebote auf eBay.de
                      </a>
                      <a
                        href={usedMarket.kleinanzeigen}
                        target="_blank"
                        rel="noreferrer nofollow"
                        className="flex items-center rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-300 hover:border-indigo-500 hover:text-indigo-400"
                      >
                        Gebrauchte Angebote auf Kleinanzeigen.de
                      </a>
                    </>
                  )}
                </div>
              </div>

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

        {/* Answers, and the disambiguation/not-found lists above them, can
            run well past the first screen - this is the way back without
            hunting for the browser's own scrollbar. Scrolls <main> itself
            (see resetToOverview/scrollToTop), not the window. */}
        {state.kind !== "idle" && state.kind !== "loading" && (
          <button
            type="button"
            onClick={scrollToTop}
            className="mt-8 block text-sm text-slate-400 underline hover:text-slate-300"
          >
            ↑ Back to top
          </button>
        )}
      </div>

      {/* Required by BGG's XML API terms, not decoration: a public-facing app
          using the API must show the "Powered by BGG" logo linking back to
          BoardGameGeek, sized so its text stays legible (#40). It sits outside
          every result branch on purpose - the top-10 list, the disambiguation
          list and the answer are all BGG data, so the credit has to be there
          before a search too. The reversed (light-on-dark) official variant is
          the one that suits this page. */}
      <footer className="mt-12 border-t border-slate-800 pt-6">
        <a
          href="https://boardgamegeek.com"
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          <img src="/powered-by-bgg.svg" alt="Powered by BGG" width={342} height={76} className="h-10 w-auto" />
        </a>
      </footer>
    </div>
  );
}
