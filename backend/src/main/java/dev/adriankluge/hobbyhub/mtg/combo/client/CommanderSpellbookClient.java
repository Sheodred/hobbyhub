package dev.adriankluge.hobbyhub.mtg.combo.client;

import dev.adriankluge.hobbyhub.mtg.combo.dto.ComboResponse;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

// Commander Spellbook (backend.commanderspellbook.com) is the actual combo
// database behind EDHREC's own combo pages - querying it directly is more
// reliable than scraping EDHREC's HTML (section 4.4 of the brief). Open, no
// key required. Cached per card name (same Caffeine pattern as Scryfall,
// see CacheConfig) rather than a scheduled Postgres refresh like the news/
// meta features - there's no fixed small set of "top N" results to
// precompute here, every card is its own query.
@Component
public class CommanderSpellbookClient {

    private static final int MAX_COMBOS = 3;
    private static final int MAX_PRODUCES_SHOWN = 3;

    private final RestClient restClient;

    public CommanderSpellbookClient(
            RestClient.Builder restClientBuilder, @Value("${app.mtg.commander-spellbook-base-url}") String baseUrl) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).defaultHeader("Accept", "application/json").build();
    }

    @Cacheable(cacheNames = "commanderSpellbookCombos", key = "#cardName")
    public List<ComboResponse> findCombos(String cardName) {
        String query = "card:\"" + cardName + "\"";
        VariantsResponseDto response = restClient
                .get()
                .uri(uriBuilder -> uriBuilder
                        .path("/variants/")
                        .queryParam("q", query)
                        .queryParam("limit", MAX_COMBOS)
                        .build())
                .retrieve()
                .body(VariantsResponseDto.class);

        if (response == null || response.results() == null) {
            return List.of();
        }
        return response.results().stream().map(variant -> toComboResponse(variant, cardName)).toList();
    }

    private ComboResponse toComboResponse(VariantDto variant, String searchedCardName) {
        List<UsesDto> uses = variant.uses() == null ? List.of() : variant.uses();
        List<String> otherCards = uses.stream()
                .map(use -> use.card().name())
                .filter(name -> !name.equalsIgnoreCase(searchedCardName))
                .toList();
        List<String> produces = variant.produces() == null
                ? List.of()
                : variant.produces().stream().map(p -> p.feature().name()).limit(MAX_PRODUCES_SHOWN).toList();

        return new ComboResponse(
                otherCards, uses.size(), variant.popularity(), produces, "https://commanderspellbook.com/combo/"
                        + variant.id() + "/");
    }
}
