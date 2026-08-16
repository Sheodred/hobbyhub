import { apiFetch } from "../../lib/apiClient";

export interface CardFace {
  name: string;
  manaCost: string | null;
  typeLine: string | null;
  oracleText: string | null;
  imageUrl: string | null;
}

export interface Card {
  id: string;
  name: string;
  manaCost: string | null;
  typeLine: string | null;
  oracleText: string | null;
  setName: string | null;
  rarity: string | null;
  imageUrl: string | null;
  artCropUrl: string | null;
  // Scryfall's own layout value, passed through untouched.
  layout: string | null;
  // Null when the card has no card_faces at all.
  faces: CardFace[] | null;
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

export interface ComboCard {
  name: string;
  // Straight off Scryfall's CDN - null when EDHREC gave no usable card id.
  imageUrl: string | null;
}

export interface Combo {
  otherCards: ComboCard[];
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

export interface DeckSummary {
  deckId: string;
  name: string;
  pilot: string | null;
  event: string | null;
  url: string | null;
}

export interface ArchetypeDecksResponse {
  archetypeName: string | null;
  decks: DeckSummary[];
}

export function getArchetypeDecks(path: string): Promise<ArchetypeDecksResponse> {
  const params = new URLSearchParams({ path });
  return apiFetch<ArchetypeDecksResponse>(`/api/mtg/archetype-decks?${params.toString()}`);
}

export interface DeckSection {
  section: string;
  cards: { name: string; count: number }[];
}

export interface Deck extends DeckSummary {
  format: string;
  archetypeName: string;
  sections: DeckSection[];
}

export function getDeck(deckId: string): Promise<Deck> {
  return apiFetch<Deck>(`/api/mtg/decks/${deckId}`);
}
