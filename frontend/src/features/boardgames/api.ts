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
  url: string;
}

export interface Boardgame {
  bggId: number;
  name: string;
  description: string;
  rating: number | null;
  numRatings: number | null;
  good: string | null;
  bad: string | null;
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
  /** True when this needs a base game rather than standing on its own. */
  isExpansion: boolean;
  /**
   * BGG's overall position. null for the four fifths of their catalog they
   * don't rank at all - never 0, which is how their export says "unranked".
   */
  rank: number | null;
  /**
   * #131: BGG's own mechanic and category (theme) links, as plain labels.
   * Absent on the dump-backed partial answer, which has neither - treat a
   * missing field as an empty list.
   */
  mechanics?: string[];
  categories?: string[];
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

export function lookupBoardgame(query: string): Promise<BoardgameLookupResult> {
  const params = new URLSearchParams({ q: query });
  return apiFetch<BoardgameLookupResult>(`/api/boardgames/lookup?${params.toString()}`);
}

export function lookupBoardgameById(bggId: number): Promise<BoardgameLookupResult> {
  const params = new URLSearchParams({ bgg_id: String(bggId) });
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

export function lookupBoardgameLocal(query: string): Promise<BoardgameLocalResult> {
  const params = new URLSearchParams({ q: query });
  return apiFetch<BoardgameLocalResult>(`/api/boardgames/local?${params.toString()}`);
}

/**
 * The instant half of a lookup by id (#115): a shared link, a reload, or a
 * top-10 click has a bgg_id but no name, so it can't use the name-based local
 * lookup - but it wants the same millisecond dump answer before the cold full
 * lookup lands, instead of a blank page.
 */
export function lookupBoardgameLocalById(bggId: number): Promise<BoardgameLocalResult> {
  const params = new URLSearchParams({ bgg_id: String(bggId) });
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

export function suggestBoardgames(query: string): Promise<BoardgameCandidate[]> {
  const params = new URLSearchParams({ q: query });
  return apiFetch<{ suggestions: BoardgameCandidate[] }>(`/api/boardgames/suggest?${params.toString()}`).then(
    (res) => res.suggestions
  );
}
