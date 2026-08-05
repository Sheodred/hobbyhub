package dev.adriankluge.hobbyhub.mtg.meta.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class EdhrecClientTest {

    private MockRestServiceServer server;
    private EdhrecClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new EdhrecClient(builder, "https://json.edhrec.com");
    }

    // Trimmed down from the real json.edhrec.com/pages/top/week.json
    // response (2026-08-05) - only the container.json_dict.cardlists[0]
    // path this app actually reads is modeled, everything else is ignored.
    private static final String SAMPLE_RESPONSE =
            """
            {
              "container": {
                "json_dict": {
                  "cardlists": [
                    {
                      "header": "Top Cards (Past Week)",
                      "tag": "toplist",
                      "cardviews": [
                        {"name": "Sol Ring", "url": "/cards/sol-ring", "num_decks": 223511},
                        {"name": "Arcane Signet", "url": "/cards/arcane-signet", "num_decks": 198000},
                        {"name": "Command Tower", "url": "/cards/command-tower", "num_decks": 180000},
                        {"name": "Fourth Card", "url": "/cards/fourth-card", "num_decks": 100000}
                      ]
                    }
                  ]
                }
              }
            }
            """;

    @Test
    void mapsTopCardsCappedAtThree() {
        server.expect(requestTo("https://json.edhrec.com/pages/top/week.json"))
                .andRespond(withSuccess(SAMPLE_RESPONSE, MediaType.APPLICATION_JSON));

        var result = client.mostPlayedCards();

        assertThat(result).hasSize(3);
        assertThat(result.get(0).name()).isEqualTo("Sol Ring");
        assertThat(result.get(0).url()).isEqualTo("https://edhrec.com/cards/sol-ring");
        assertThat(result.get(0).numDecks()).isEqualTo(223511);
    }

    @Test
    void mapsPopularCommandersFromTheCommandersEndpoint() {
        server.expect(requestTo("https://json.edhrec.com/pages/commanders/week.json"))
                .andRespond(withSuccess(SAMPLE_RESPONSE, MediaType.APPLICATION_JSON));

        var result = client.popularCommanderDecks();

        assertThat(result).hasSize(3);
        assertThat(result.get(0).name()).isEqualTo("Sol Ring");
    }
}
