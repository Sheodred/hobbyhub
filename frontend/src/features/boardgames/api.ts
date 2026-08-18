import { apiFetch } from "../../lib/apiClient";

export interface BoardgameCandidate {
  bggId: number;
  name: string;
  yearPublished: number | null;
}

export interface BoardgameSource {
  name: string;
  url: string;
}

/**
 * One external rating. Each source publishes on its own scale, so `max`
 * travels with the value and they are never combined into an average.
 */
export interface ExternalRating {
  source: string;
  value: number;
  max: number;
  count: number | null;
  title: string | null;
  url: string;
}

/** Board Game Quest's own review verdict: their score, how it plays, pros/cons. */
export interface BoardGameQuestReview {
  score: number;
  rules: string;
  hits: string[];
  misses: string[];
  title: string;
  url: string;
}

/** A complexity figure carries its scale for the same reason a rating does. */
export interface Complexity {
  value: number;
  max: number;
  /** Which source published this number - brettspiele-report or BoardGameGeek. */
  source: string;
}

/**
 * #90: the retail (new) price, from the same amazon.de result a rating may
 * already come from - a genuinely different question from the used-market
 * price this issue also asked about, which has no lawful source today and
 * is a link-out (see usedMarketSearchUrls) rather than a fetched number.
 */
export interface RetailPrice {
  value: number;
  currency: string;
  source: string;
  url: string;
}

/** A BGG mechanic or category link - `id` is what makes it linkable to BGG's own page. */
export interface BggTag {
  id: number;
  name: string;
}

export interface Boardgame {
  bggId: number;
  name: string;
  description: string;
  rating: number | null;
  numRatings: number | null;
  /** Up to 3 snippets, best/most-cited first. null when nothing qualified. */
  good: string[] | null;
  /** Same shape as `good`, worst first. */
  bad: string[] | null;
  /**
   * True when the answer came from the imported BGG ranks dump rather than
   * the live API - rating and name only, no description or comments. The
   * page says so rather than rendering the gaps as empty sections.
   */
  partial: boolean;
  /** Empty when no other source has an entry for this game. */
  ratings: ExternalRating[];
  /** null when Board Game Quest has no review for exactly this game. */
  bgq: BoardGameQuestReview | null;
  players: string | null;
  duration: string | null;
  /** As the source words it, e.g. "ab 8 Jahren" - never reduced to a number. */
  age: string | null;
  /**
   * How heavy the game is, on the publishing site's own scale. A descriptor,
   * not a verdict: it belongs nowhere near `ratings`.
   */
  complexity: Complexity | null;
  /** null when amazon.de has no title-matching listing with a visible price. */
  price: RetailPrice | null;
  /** True when this needs a base game rather than standing on its own. */
  isExpansion: boolean;
  /**
   * BGG's overall position. null for the four fifths of their catalog they
   * don't rank at all - never 0, which is how their export says "unranked".
   */
  rank: number | null;
  /**
   * #131: BGG's own mechanic and category (theme) links. Each carries BGG's
   * id, which is what makes the tag linkable to BGG's own page for it
   * (boardgamemechanic/{id}, boardgamecategory/{id} - BGG redirects an
   * id-only URL to the correctly-slugged one). Absent on the dump-backed
   * partial answer, which has neither - treat a missing field as an empty
   * list.
   */
  mechanics?: BggTag[];
  categories?: BggTag[];
  /**
   * #131: derived from the mechanics above (Cooperative/Semi-Cooperative/
   * Traitor Game), never a guess - null when the thing carries no mechanics
   * at all to derive it from (the dump-backed partial answer), not when it
   * happens to be a competitive game (that's a real "competitive", not an
   * absence).
   */
  interaction?: "competitive" | "cooperative" | "one-vs-all" | null;
  /**
   * BGG's "family" league tables alongside the overall rank - a game's
   * position among strategy games / family games / thematic games
   * specifically, not a separate rank of a different kind. Absent on the
   * dump-backed partial answer, same convention as mechanics/categories;
   * null (present but no such table) for a game BGG has not placed in that
   * family at all.
   */
  strategyRank?: number | null;
  familyRank?: number | null;
  thematicRank?: number | null;
  source: BoardgameSource;
}

export type BoardgameLookupResult =
  | { status: "ok"; game: Boardgame }
  | { status: "disambiguation"; candidates: BoardgameCandidate[] }
  /**
   * The search ran and found nothing - a result, not a failure, so it
   * arrives as a 200. `suggestions` holds the closest names in the local
   * catalogue and is empty when even those miss.
   */
  | { status: "not_found"; query: string; suggestions: BoardgameCandidate[] };

/**
 * #130: which name to display - the German alias where one exists ("Die
 * Siedler von Catan"), or BGG's own primary name for "en" (today's
 * behaviour). Never affects which game is found, only what its name reads
 * as once found.
 */
export type Lang = "de" | "en";

function withLang(base: Record<string, string>, lang?: Lang): URLSearchParams {
  return new URLSearchParams(lang ? { ...base, lang } : base);
}

export function lookupBoardgame(query: string, lang?: Lang): Promise<BoardgameLookupResult> {
  const params = withLang({ q: query }, lang);
  return apiFetch<BoardgameLookupResult>(`/api/boardgames/lookup?${params.toString()}`);
}

export function lookupBoardgameById(bggId: number, lang?: Lang): Promise<BoardgameLookupResult> {
  const params = withLang({ bgg_id: String(bggId) }, lang);
  return apiFetch<BoardgameLookupResult>(`/api/boardgames/lookup?${params.toString()}`);
}

/**
 * The instant half of a lookup (#91): only what the local BGG ranks dump
 * knows, with no external call behind it. "unavailable" means the dump has
 * not been imported - that is "we can't see", not "no such game".
 */
export type BoardgameLocalResult =
  | { status: "ok"; game: Boardgame }
  | { status: "disambiguation"; candidates: BoardgameCandidate[] }
  | { status: "not_found" }
  | { status: "unavailable" };

export function lookupBoardgameLocal(query: string, lang?: Lang): Promise<BoardgameLocalResult> {
  const params = withLang({ q: query }, lang);
  return apiFetch<BoardgameLocalResult>(`/api/boardgames/local?${params.toString()}`);
}

/**
 * The instant half of a lookup by id (#115): a shared link, a reload, or a
 * top-10 click has a bgg_id but no name, so it can't use the name-based local
 * lookup - but it wants the same millisecond dump answer before the cold full
 * lookup lands, instead of a blank page.
 */
export function lookupBoardgameLocalById(bggId: number, lang?: Lang): Promise<BoardgameLocalResult> {
  const params = withLang({ bgg_id: String(bggId) }, lang);
  return apiFetch<BoardgameLocalResult>(`/api/boardgames/local?${params.toString()}`);
}

/**
 * One entry in the pre-search top-10 (#102). Deliberately not a `Boardgame`:
 * this is a card in a list, not an answer, and it carries only the four
 * facts the local ranks dump actually holds. No image - see #101.
 */
export interface TopBoardgame {
  bggId: number;
  name: string;
  yearPublished: number | null;
  rank: number;
  rating: number | null;
}

/** Empty when the ranks dump has not been imported - render nothing, not an empty grid. */
export function topBoardgames(): Promise<TopBoardgame[]> {
  return apiFetch<{ games: TopBoardgame[] }>("/api/boardgames/top").then((res) => res.games);
}

/**
 * One entry (winner, nominee, or recommendation) in the award panel. bggId is
 * optional per entry: a click resolves the game directly when it is set, and
 * falls back to a name search when it is null. Winners always carry one;
 * nominees/recommendations may.
 */
export interface AwardEntry {
  bggId: number | null;
  name: string;
}

/**
 * One award category in the pre-search Spiel-des-Jahres panel (#105). Read
 * from the hand-maintained sdj_awards table, latest year only.
 */
export interface AwardCategory {
  category: string;
  winner: AwardEntry;
  nominees: AwardEntry[];
  recommended: AwardEntry[];
}

export interface BoardgameAwards {
  year: number | null;
  categories: AwardCategory[];
}

/** `year: null` / empty categories when nothing is seeded - render nothing. */
export function boardgameAwards(): Promise<BoardgameAwards> {
  return apiFetch<BoardgameAwards>("/api/boardgames/awards");
}

/**
 * One random game for the "Surprise me" button (#120). null when the dump
 * has no eligible game (empty or un-imported) - the caller hides the button
 * rather than offering one that goes nowhere.
 */
export function randomBoardgame(): Promise<number | null> {
  return apiFetch<{ bggId: number | null }>("/api/boardgames/random").then((res) => res.bggId);
}

export function suggestBoardgames(query: string, lang?: Lang): Promise<BoardgameCandidate[]> {
  const params = withLang({ q: query }, lang);
  return apiFetch<{ suggestions: BoardgameCandidate[] }>(`/api/boardgames/suggest?${params.toString()}`).then(
    (res) => res.suggestions
  );
}

/**
 * #90: used-market search link-outs, not a fetched price. eBay's robots.txt
 * disallows scraping its search paths and carries an explicit anti-scraping
 * banner; Kleinanzeigen's Nutzungsbedingungen name "Crawler, Spider, Scraper"
 * directly. Both were checked live before this issue was scoped - see its
 * source-by-source table - and neither is a source this project reads from.
 * A plain search link needs no permission, same as the existing Moxfield
 * link-out, and it is what "at least the lowest price" resolves to today.
 */
export function usedMarketSearchUrls(gameName: string): { ebay: string; kleinanzeigen: string } {
  const q = encodeURIComponent(gameName);
  return {
    ebay: `https://www.ebay.de/sch/i.html?_nkw=${q}`,
    kleinanzeigen: `https://www.kleinanzeigen.de/s-suchanfrage.html?keywords=${q}`,
  };
}
