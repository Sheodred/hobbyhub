package dev.adriankluge.hobbyhub.mtg.combo.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class CommanderSpellbookClientTest {

    private MockRestServiceServer server;
    private CommanderSpellbookClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new CommanderSpellbookClient(builder, "https://backend.commanderspellbook.com");
    }

    // Trimmed down from a real backend.commanderspellbook.com/variants/
    // response (2026-08-05) - only the fields this app actually reads are
    // modeled (card images, legalities, zone locations, etc. are ignored).
    private static final String SAMPLE_RESPONSE =
            """
            {
              "results": [
                {
                  "id": "2320-3368-4462-4673",
                  "uses": [
                    {"card": {"name": "Firemind's Foresight"}},
                    {"card": {"name": "Lightning Bolt"}}
                  ],
                  "produces": [
                    {"feature": {"name": "Infinite colored mana"}},
                    {"feature": {"name": "Infinite damage"}}
                  ],
                  "popularity": 206
                }
              ]
            }
            """;

    @Test
    void mapsACombosOtherCardsCountAndProducedEffects() {
        server.expect(requestTo(
                        "https://backend.commanderspellbook.com/variants/?q=card:%22Lightning%20Bolt%22&limit=3"))
                .andRespond(withSuccess(SAMPLE_RESPONSE, MediaType.APPLICATION_JSON));

        var combos = client.findCombos("Lightning Bolt");

        assertThat(combos).hasSize(1);
        var combo = combos.get(0);
        assertThat(combo.otherCards()).containsExactly("Firemind's Foresight");
        assertThat(combo.cardCount()).isEqualTo(2);
        assertThat(combo.numDecks()).isEqualTo(206);
        assertThat(combo.produces()).containsExactly("Infinite colored mana", "Infinite damage");
        assertThat(combo.url()).isEqualTo("https://commanderspellbook.com/combo/2320-3368-4462-4673/");
    }

    @Test
    void returnsAnEmptyListWhenNoCombosExist() {
        server.expect(requestTo(
                        "https://backend.commanderspellbook.com/variants/?q=card:%22Nonexistent%20Card%22&limit=3"))
                .andRespond(withSuccess("{\"results\": []}", MediaType.APPLICATION_JSON));

        assertThat(client.findCombos("Nonexistent Card")).isEmpty();
    }
}
