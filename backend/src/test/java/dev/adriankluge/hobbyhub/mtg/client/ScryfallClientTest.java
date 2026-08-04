package dev.adriankluge.hobbyhub.mtg.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import dev.adriankluge.hobbyhub.mtg.dto.Card;
import dev.adriankluge.hobbyhub.mtg.dto.CardSearchResponse;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class ScryfallClientTest {

    private MockRestServiceServer server;
    private ScryfallClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new ScryfallClient(builder, "https://api.scryfall.com", "HobbyHubTest/1.0");
    }

    @Test
    void mapsSearchResultsIncludingArtCrop() {
        // Deliberately a multi-word query: RestClient's own URI-template encoding
        // must be the only encoding applied, or a space becomes a mismatched,
        // double-encoded query Scryfall won't match (a real bug caught only by
        // live verification, not by an earlier version of this test that used a
        // single-word query where single vs. double encoding looked identical).
        server.expect(requestTo("https://api.scryfall.com/cards/search?q=lightning%20bolt&page=1"))
                .andRespond(withSuccess(
                        """
                        {
                          "data": [
                            {
                              "id": "abc-123",
                              "name": "Lightning Bolt",
                              "mana_cost": "{R}",
                              "type_line": "Instant",
                              "oracle_text": "Lightning Bolt deals 3 damage to any target.",
                              "colors": ["R"],
                              "set_name": "Alpha",
                              "rarity": "common",
                              "image_uris": {"normal": "https://img/normal.jpg", "art_crop": "https://img/art.jpg"}
                            }
                          ],
                          "has_more": false,
                          "total_cards": 1
                        }
                        """,
                        MediaType.APPLICATION_JSON));

        CardSearchResponse result = client.search("lightning bolt", 1);

        assertThat(result.totalCards()).isEqualTo(1);
        assertThat(result.hasMore()).isFalse();
        Card card = result.cards().get(0);
        assertThat(card.name()).isEqualTo("Lightning Bolt");
        assertThat(card.imageUrl()).isEqualTo("https://img/normal.jpg");
        assertThat(card.artCropUrl()).isEqualTo("https://img/art.jpg");
    }

    @Test
    void returnsEmptyResultWhenScryfallReports404ForNoMatches() {
        server.expect(requestTo("https://api.scryfall.com/cards/search?q=zzzznomatch&page=1"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"object\":\"error\",\"code\":\"not_found\",\"status\":404,\"details\":\"no matches\"}"));

        CardSearchResponse result = client.search("zzzznomatch", 1);

        assertThat(result.cards()).isEmpty();
        assertThat(result.totalCards()).isZero();
    }

    @Test
    void resolvesImagesFromFirstCardFaceWhenTopLevelImageUrisAreMissing() {
        server.expect(requestTo("https://api.scryfall.com/cards/double-face-id"))
                .andRespond(withSuccess(
                        """
                        {
                          "id": "double-face-id",
                          "name": "Delver // Insectile Aberration",
                          "card_faces": [
                            {"image_uris": {"normal": "https://img/front.jpg", "art_crop": "https://img/front-art.jpg"}},
                            {"image_uris": {"normal": "https://img/back.jpg", "art_crop": "https://img/back-art.jpg"}}
                          ]
                        }
                        """,
                        MediaType.APPLICATION_JSON));

        Optional<Card> result = client.getCard("double-face-id");

        assertThat(result).isPresent();
        assertThat(result.get().imageUrl()).isEqualTo("https://img/front.jpg");
    }

    @Test
    void returnsEmptyOptionalWhenCardNotFound() {
        server.expect(requestTo("https://api.scryfall.com/cards/missing-id"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND).contentType(MediaType.APPLICATION_JSON).body("{}"));

        assertThat(client.getCard("missing-id")).isEmpty();
    }
}
