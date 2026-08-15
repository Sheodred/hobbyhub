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

export interface Boardgame {
  bggId: number;
  name: string;
  description: string;
  rating: number | null;
  numRatings: number | null;
  good: string | null;
  bad: string | null;
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
