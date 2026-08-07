import { apiFetch } from "../../../lib/apiClient";

export interface NewsItem {
  headline: string;
  teaser: string | null;
  url: string;
  publishedAt: string | null;
}

export function getTagesschauNews(): Promise<NewsItem[]> {
  return apiFetch<NewsItem[]>("/api/news/tagesschau");
}

export function getWotcNews(): Promise<NewsItem[]> {
  return apiFetch<NewsItem[]>("/api/news/wotc");
}

export function getDortmundNews(): Promise<NewsItem[]> {
  return apiFetch<NewsItem[]>("/api/news/dortmund");
}

export interface FleaMarketEvent {
  name: string;
  location: string | null;
  url: string;
  date: string;
}

export function getFleaMarketEvents(): Promise<FleaMarketEvent[]> {
  return apiFetch<FleaMarketEvent[]>("/api/news/fleamarket");
}
