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
  source: BoardgameSource;
}

export type BoardgameLookupResult =
  | { status: "ok"; game: Boardgame }
  | { status: "disambiguation"; candidates: BoardgameCandidate[] };

export function lookupBoardgame(query: string): Promise<BoardgameLookupResult> {
  const params = new URLSearchParams({ q: query });
  return apiFetch<BoardgameLookupResult>(`/api/boardgames/lookup?${params.toString()}`);
}

export function lookupBoardgameById(bggId: number): Promise<BoardgameLookupResult> {
  const params = new URLSearchParams({ bgg_id: String(bggId) });
  return apiFetch<BoardgameLookupResult>(`/api/boardgames/lookup?${params.toString()}`);
}
