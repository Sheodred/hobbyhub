package dev.adriankluge.hobbyhub.mtg.meta.client;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

// EDHREC's open, key-free JSON API (json.edhrec.com) - the same data source
// that powers edhrec.com's own pages. Used for two of the four "Meta &
// Stats" widgets (section 4.5): most-played cards and popular Commander
// decks. Timeout comes from the shared RestClientCustomizer (see
// config.RestClientConfig), same as every other RestClient this app builds.
@Component
public class EdhrecClient {

    private static final int MAX_ITEMS = 3;

    private final RestClient restClient;

    public EdhrecClient(RestClient.Builder restClientBuilder, @Value("${app.mtg.edhrec-json-base-url}") String baseUrl) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).defaultHeader("Accept", "application/json").build();
    }

    public List<MetaEntry> mostPlayedCards() {
        return fetch("/pages/top/week.json");
    }

    public List<MetaEntry> popularCommanderDecks() {
        return fetch("/pages/commanders/week.json");
    }

    private List<MetaEntry> fetch(String path) {
        EdhrecPageDto response = restClient.get().uri(path).retrieve().body(EdhrecPageDto.class);
        if (response == null) {
            return List.of();
        }
        return response.firstCardlistViews().stream()
                .limit(MAX_ITEMS)
                .map(view -> new MetaEntry(view.name(), "https://edhrec.com" + view.url(), view.numDecks()))
                .toList();
    }
}
