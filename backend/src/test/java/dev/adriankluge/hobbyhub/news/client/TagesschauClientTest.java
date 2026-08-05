package dev.adriankluge.hobbyhub.news.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class TagesschauClientTest {

    private MockRestServiceServer server;
    private TagesschauClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new TagesschauClient(builder, "https://www.tagesschau.de");
    }

    @Test
    void mapsTheFieldsTheHomepagePanelActuallyUses() {
        server.expect(requestTo("https://www.tagesschau.de/api2u/homepage"))
                .andRespond(withSuccess(
                        """
                        {
                          "news": [
                            {
                              "sophoraId": "example-100",
                              "title": "Headline one",
                              "date": "2026-08-05T08:58:28.644+02:00",
                              "firstSentence": "A short teaser sentence.",
                              "shareURL": "https://www.tagesschau.de/example-100.html",
                              "teaserImage": {"copyright": "ignored, not modeled"},
                              "tags": [{"tag": "ignored"}]
                            }
                          ]
                        }
                        """,
                        MediaType.APPLICATION_JSON));

        var items = client.fetchLatest();

        assertThat(items).hasSize(1);
        FetchedNewsItem item = items.get(0);
        assertThat(item.headline()).isEqualTo("Headline one");
        assertThat(item.teaser()).isEqualTo("A short teaser sentence.");
        assertThat(item.url()).isEqualTo("https://www.tagesschau.de/example-100.html");
        assertThat(item.publishedAt()).isEqualTo(Instant.parse("2026-08-05T06:58:28.644Z"));
    }

    @Test
    void capsAtFiveItemsEvenIfTheResponseHasMore() {
        StringBuilder itemsJson = new StringBuilder();
        for (int i = 0; i < 8; i++) {
            if (i > 0) itemsJson.append(",");
            itemsJson.append(
                    """
                    {"sophoraId": "item-%d", "title": "Item %d", "date": "2026-08-05T08:00:00.000+02:00",
                     "firstSentence": "Teaser", "shareURL": "https://www.tagesschau.de/item-%d.html"}
                    """
                            .formatted(i, i, i));
        }
        server.expect(requestTo("https://www.tagesschau.de/api2u/homepage"))
                .andRespond(withSuccess("{\"news\": [" + itemsJson + "]}", MediaType.APPLICATION_JSON));

        assertThat(client.fetchLatest()).hasSize(5);
    }
}
