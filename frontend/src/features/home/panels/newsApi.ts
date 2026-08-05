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
