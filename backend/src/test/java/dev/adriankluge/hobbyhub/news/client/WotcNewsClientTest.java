package dev.adriankluge.hobbyhub.news.client;

import static org.assertj.core.api.Assertions.assertThat;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.Test;

class WotcNewsClientTest {

    private final WotcNewsClient client = new WotcNewsClient("https://magic.wizards.com/en/news");

    @Test
    void extractsArticleTitleAndLinkFromTheRealPageStructure() {
        // Trimmed down from the real magic.wizards.com/en/news markup (2026-08-05):
        // article title links are the only ones with data-link-type="forced-server"
        // and an href starting with /en/news/ - the category link (e.g.
        // "Announcements") points at /en/news/announcements with no further path
        // segment and lacks that attribute entirely, so it's correctly excluded.
        Document doc = Jsoup.parse(
                """
                <html><body>
                <article>
                  <a href="/en/news/announcements" target="_blank" class="css-e7rj5">Announcements</a>
                  <a data-navigation-type="server-side" data-link-type="forced-server"
                     href="/en/news/announcements/secret-lair-commander-deck-hatsune-miku-decklist">
                    Secret Lair Commander Deck: Hatsune Miku Decklist
                  </a>
                </article>
                <article>
                  <a href="/en/news/feature" target="_blank" class="css-e7rj5">Feature</a>
                  <a data-navigation-type="server-side" data-link-type="forced-server"
                     href="/en/news/feature/designing-all-the-dwarves-of-the-hobbit">
                    Designing All the Dwarves of Magic: The Gathering | The Hobbit
                  </a>
                </article>
                </body></html>
                """);

        var items = client.parseItems(doc);

        assertThat(items).hasSize(2);
        assertThat(items.get(0).headline()).isEqualTo("Secret Lair Commander Deck: Hatsune Miku Decklist");
        assertThat(items.get(0).url())
                .isEqualTo("https://magic.wizards.com/en/news/announcements/secret-lair-commander-deck-hatsune-miku-decklist");
    }

    @Test
    void capsAtThreeItems() {
        StringBuilder html = new StringBuilder("<html><body>");
        for (int i = 0; i < 6; i++) {
            html.append(
                    """
                    <a data-navigation-type="server-side" data-link-type="forced-server"
                       href="/en/news/feature/item-%d">Item %d</a>
                    """
                            .formatted(i, i));
        }
        html.append("</body></html>");

        assertThat(client.parseItems(Jsoup.parse(html.toString()))).hasSize(3);
    }

    @Test
    void fallsBackToTheManualListWhenTheSelectorMatchesNothing() {
        Document doc = Jsoup.parse("<html><body><p>WotC redesigned the page - nothing matches anymore.</p></body></html>");

        var items = client.parseItems(doc);

        assertThat(items).hasSize(1);
        assertThat(items.get(0).url()).isEqualTo("https://magic.wizards.com/en/news");
    }
}
