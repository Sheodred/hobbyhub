import { apiFetch } from "../../lib/apiClient";

export interface Card {
  id: string;
  name: string;
  manaCost: string | null;
  typeLine: string | null;
  oracleText: string | null;
  colors: string[] | null;
  setName: string | null;
  rarity: string | null;
  imageUrl: string | null;
  artCropUrl: string | null;
}

export interface CardSearchResponse {
  cards: Card[];
  hasMore: boolean;
  totalCards: number;
}

export function searchCards(query: string, page: number): Promise<CardSearchResponse> {
  const params = new URLSearchParams({ q: query, page: String(page) });
  return apiFetch<CardSearchResponse>(`/api/mtg/search?${params.toString()}`);
}

export function getCard(id: string): Promise<Card> {
  return apiFetch<Card>(`/api/mtg/cards/${id}`);
}

export function getPrintings(name: string): Promise<Card[]> {
  const params = new URLSearchParams({ name });
  return apiFetch<Card[]>(`/api/mtg/printings?${params.toString()}`);
}

export function getCardByName(name: string): Promise<Card> {
  const params = new URLSearchParams({ name });
  return apiFetch<Card>(`/api/mtg/cards/by-name?${params.toString()}`);
}

export interface Combo {
  otherCards: string[];
  cardCount: number;
  numDecks: number | null;
  produces: string[];
  url: string;
}

export function getCombos(cardName: string): Promise<Combo[]> {
  const params = new URLSearchParams({ cardName });
  return apiFetch<Combo[]>(`/api/mtg/combos?${params.toString()}`);
}

export interface MetaEntry {
  name: string;
  url: string;
  numDecks: number | null;
}

export interface MtgMetaResponse {
  mostPlayedCards: MetaEntry[];
  popularCommanderDecks: MetaEntry[];
  standardDecks: MetaEntry[];
  commanderDecks: MetaEntry[];
}

export function getMtgMeta(): Promise<MtgMetaResponse> {
  return apiFetch<MtgMetaResponse>("/api/mtg/meta");
}
