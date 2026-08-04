import { apiFetch } from "../../lib/apiClient";

export type ListingCategory = "BOARD_GAME" | "MTG_SINGLE" | "MTG_SEALED" | "OTHER";
export type ListingStatus = "ACTIVE" | "RESERVED" | "SOLD" | "REMOVED";

export interface Listing {
  id: string;
  title: string;
  description: string | null;
  category: ListingCategory;
  price: number;
  condition: string;
  status: ListingStatus;
  imageUrls: string[];
  sellerId: string;
  sellerDisplayName: string;
  createdAt: string;
}

export interface ListingPage {
  content: Listing[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface ListingFilters {
  category?: ListingCategory;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
}

export interface ListingFormValues {
  title: string;
  description: string;
  category: ListingCategory;
  price: number;
  condition: string;
  imageUrls: string[];
}

export function listListings(filters: ListingFilters): Promise<ListingPage> {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.minPrice != null) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) params.set("maxPrice", String(filters.maxPrice));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page != null) params.set("page", String(filters.page));
  return apiFetch<ListingPage>(`/api/listings?${params.toString()}`);
}

export function getListing(id: string): Promise<Listing> {
  return apiFetch<Listing>(`/api/listings/${id}`);
}

export function createListing(values: ListingFormValues): Promise<Listing> {
  return apiFetch<Listing>("/api/listings", { method: "POST", body: JSON.stringify(values) });
}

export function updateListing(
  id: string,
  values: ListingFormValues & { status: ListingStatus },
): Promise<Listing> {
  return apiFetch<Listing>(`/api/listings/${id}`, { method: "PATCH", body: JSON.stringify(values) });
}

export function deleteListing(id: string): Promise<void> {
  return apiFetch<void>(`/api/listings/${id}`, { method: "DELETE" });
}
