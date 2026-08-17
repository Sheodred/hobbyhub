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

export function suggestBoardgames(query: string): Promise<BoardgameCandidate[]> {
  const params = new URLSearchParams({ q: query });
  return apiFetch<{ suggestions: BoardgameCandidate[] }>(`/api/boardgames/suggest?${params.toString()}`).then(
    (res) => res.suggestions
  );
}
