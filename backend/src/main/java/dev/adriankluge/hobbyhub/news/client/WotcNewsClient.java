package dev.adriankluge.hobbyhub.news.client;

import java.util.List;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// WotC discontinued their news RSS feed and there's no public news API, so
// this scrapes magic.wizards.com/en/news (permitted per its robots.txt, no
// disallow rules as of 2026-08-05) for article title + link only - not full
// article bodies. This is explicitly a "may break" integration per section
// 4.1 of the brief: if WotC's page structure changes, the CSS selector below
// stops matching and this falls back to FALLBACK_ITEMS rather than showing
// an empty panel or throwing.
@Component
public class WotcNewsClient {

    private static final Logger log = LoggerFactory.getLogger(WotcNewsClient.class);
    private static final int MAX_ITEMS = 3;
    private static final int TIMEOUT_MILLIS = 10_000;

    // Manual-curation fallback (section 4.1: "keep a manual-curation
    // fallback ... in case the scraper breaks"). There's no admin UI in this
    // app to edit this live, so it's a small hardcoded list for now - update
    // by hand if the scraper starts failing and stays broken.
    private static final List<FetchedNewsItem> FALLBACK_ITEMS =
            List.of(new FetchedNewsItem("Magic: The Gathering news", null, "https://magic.wizards.com/en/news", null));

    private final String newsUrl;

    public WotcNewsClient(@Value("${app.news.wotc-news-url}") String newsUrl) {
        this.newsUrl = newsUrl;
    }

    public List<FetchedNewsItem> fetchLatest() {
        try {
            Document doc = Jsoup.connect(newsUrl)
                    .userAgent("HobbyHub/0.1 (+https://github.com/Sheodred/hobbyhub)")
                    .timeout(TIMEOUT_MILLIS)
                    .get();
            return parseItems(doc);
        } catch (Exception e) {
            log.warn("Failed to scrape WotC news - falling back to the manual list", e);
            return FALLBACK_ITEMS;
        }
    }

    // Split out from fetchLatest() so the selector logic is testable against
    // a fixed HTML fixture without making a real network call.
    List<FetchedNewsItem> parseItems(Document doc) {
        List<FetchedNewsItem> items = doc.select("a[data-link-type=forced-server][href^=/en/news/]").stream()
                .map(this::toFetchedItem)
                .filter(item -> !item.headline().isBlank())
                .distinct()
                .limit(MAX_ITEMS)
                .toList();

        return items.isEmpty() ? FALLBACK_ITEMS : items;
    }

    private FetchedNewsItem toFetchedItem(Element link) {
        String href = link.attr("href");
        String absoluteUrl = href.startsWith("http") ? href : "https://magic.wizards.com" + href;
        return new FetchedNewsItem(link.text().trim(), null, absoluteUrl, null);
    }
}
