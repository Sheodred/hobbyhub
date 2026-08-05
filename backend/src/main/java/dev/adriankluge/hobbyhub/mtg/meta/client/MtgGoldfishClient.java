package dev.adriankluge.hobbyhub.mtg.meta.client;

import java.util.List;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// MTGGoldfish has no official metagame API, and there's no other viable
// source for competitive tier-list-style "strongest decks" data (see
// docs/project-brief.md section 4.5) - this scrapes their metagame pages
// for archetype name + link only, not full decklists. Their robots.txt
// (checked 2026-08-05) allows general crawling/reference use (`Allow: /`,
// `Content-Signal: search=yes, use=reference`) and only restricts AI
// training, which this isn't. Explicitly a "may break" integration, same
// spirit as WotcNewsClient - returns an empty list on failure rather than
// throwing, so the panel just shows its existing "no data" state.
@Component
public class MtgGoldfishClient {

    private static final Logger log = LoggerFactory.getLogger(MtgGoldfishClient.class);
    private static final int MAX_ITEMS = 3;
    private static final int TIMEOUT_MILLIS = 10_000;

    private final String standardMetagameUrl;
    private final String commanderMetagameUrl;

    public MtgGoldfishClient(
            @Value("${app.mtg.mtggoldfish-standard-url}") String standardMetagameUrl,
            @Value("${app.mtg.mtggoldfish-commander-url}") String commanderMetagameUrl) {
        this.standardMetagameUrl = standardMetagameUrl;
        this.commanderMetagameUrl = commanderMetagameUrl;
    }

    public List<MetaEntry> standardDecks() {
        return scrape(standardMetagameUrl);
    }

    public List<MetaEntry> commanderDecks() {
        return scrape(commanderMetagameUrl);
    }

    private List<MetaEntry> scrape(String url) {
        try {
            Document doc = Jsoup.connect(url)
                    .userAgent("HobbyHub/0.1 (+https://github.com/Sheodred/hobbyhub)")
                    .timeout(TIMEOUT_MILLIS)
                    .get();
            return parseItems(doc);
        } catch (Exception e) {
            log.warn("Failed to scrape MTGGoldfish metagame page {}", url, e);
            return List.of();
        }
    }

    // Split out from scrape() so the selector logic is testable against a
    // fixed HTML fixture without making a real network call.
    List<MetaEntry> parseItems(Document doc) {
        // Each archetype tile links twice (#online and #paper anchors on the
        // same /archetype/{slug} path) - keeping only #paper avoids double
        // counting while still picking the more universally recognized
        // paper-metagame view.
        return doc.select("a[href*=/archetype/][href*=#paper]").stream()
                .map(this::toMetaEntry)
                .filter(entry -> !entry.name().isBlank())
                .distinct()
                .limit(MAX_ITEMS)
                .toList();
    }

    private MetaEntry toMetaEntry(Element link) {
        String href = link.attr("href").split("#")[0];
        String absoluteUrl = href.startsWith("http") ? href : "https://www.mtggoldfish.com" + href;
        return new MetaEntry(link.text().trim(), absoluteUrl, null);
    }
}
