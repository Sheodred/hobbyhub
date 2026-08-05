package dev.adriankluge.hobbyhub.mtg.meta.client;

import static org.assertj.core.api.Assertions.assertThat;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.Test;

class MtgGoldfishClientTest {

    private final MtgGoldfishClient client = new MtgGoldfishClient(
            "https://www.mtggoldfish.com/metagame/standard", "https://www.mtggoldfish.com/metagame/commander");

    // Trimmed down from the real mtggoldfish.com/metagame/standard markup
    // (2026-08-05) - each archetype tile links twice (#online and #paper
    // anchors on the same path); only #paper should survive.
    @Test
    void extractsArchetypeNameAndLinkKeepingOnlyThePaperAnchor() {
        Document doc = Jsoup.parse(
                """
                <html><body>
                <div>
                  <span class='deck-price-online'><a href="/archetype/standard-4c-control-woe#online">4c Control</a></span>
                  <span class='deck-price-paper'><a href="/archetype/standard-4c-control-woe#paper">4c Control</a></span>
                </div>
                <div>
                  <span class='deck-price-online'><a href="/archetype/standard-izzet-lessons-woe#online">Izzet Lessons</a></span>
                  <span class='deck-price-paper'><a href="/archetype/standard-izzet-lessons-woe#paper">Izzet Lessons</a></span>
                </div>
                </body></html>
                """);

        var items = client.parseItems(doc);

        assertThat(items).hasSize(2);
        assertThat(items.get(0).name()).isEqualTo("4c Control");
        assertThat(items.get(0).url()).isEqualTo("https://www.mtggoldfish.com/archetype/standard-4c-control-woe");
    }

    @Test
    void capsAtThreeItems() {
        StringBuilder html = new StringBuilder("<html><body>");
        for (int i = 0; i < 6; i++) {
            html.append("<a href=\"/archetype/deck-%d#paper\">Deck %d</a>".formatted(i, i));
        }
        html.append("</body></html>");

        assertThat(client.parseItems(Jsoup.parse(html.toString()))).hasSize(3);
    }

    @Test
    void returnsAnEmptyListWhenNothingMatches() {
        Document doc = Jsoup.parse("<html><body><p>Page redesigned - nothing to see here.</p></body></html>");

        assertThat(client.parseItems(doc)).isEmpty();
    }
}
