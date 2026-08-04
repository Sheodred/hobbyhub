package dev.adriankluge.hobbyhub.mtg.client;

import dev.adriankluge.hobbyhub.mtg.dto.Card;
import dev.adriankluge.hobbyhub.mtg.dto.CardSearchResponse;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

// Talks to Scryfall directly (see docs/adr/0003). Two things this owns that
// a plain frontend fetch wouldn't: a minimum spacing between outbound calls
// (Scryfall's API guidelines ask for ~100ms between requests) and a short
// cache on top (see CacheConfig) so repeated queries and card-detail views
// don't re-hit Scryfall at all.
@Component
public class ScryfallClient {

    private static final long MIN_INTERVAL_MILLIS = 100;

    private final RestClient restClient;
    private final Object throttleLock = new Object();
    private long lastRequestAtMillis = 0;

    public ScryfallClient(
            RestClient.Builder restClientBuilder,
            @Value("${app.mtg.scryfall-base-url}") String baseUrl,
            @Value("${app.mtg.user-agent}") String userAgent) {
        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .defaultHeader("User-Agent", userAgent)
                .defaultHeader("Accept", "application/json")
                .build();
    }

    @Cacheable(cacheNames = "scryfallSearch", key = "#query + ':' + #page")
    public CardSearchResponse search(String query, int page) {
        throttle();
        try {
            // RestClient's UriComponentsBuilder already percent-encodes template
            // variables - encoding `query` ourselves first would double-encode it
            // (e.g. a space becomes "+" here, then "%2B" again below) and Scryfall
            // would silently see a different, non-matching search string.
            ScryfallSearchResponseDto response = restClient
                    .get()
                    .uri("/cards/search?q={q}&page={page}", query, page)
                    .retrieve()
                    .body(ScryfallSearchResponseDto.class);
            if (response == null) {
                return CardSearchResponse.empty();
            }
            return new CardSearchResponse(
                    response.data().stream().map(ScryfallMapper::toCard).toList(),
                    response.hasMore(),
                    response.totalCards());
        } catch (HttpClientErrorException.NotFound e) {
            // Scryfall's documented response for "no cards match this query".
            return CardSearchResponse.empty();
        }
    }

    // All printings of a single named card - exact-name match (`!"..."`) plus
    // `unique=prints` so Scryfall returns one result per printing instead of
    // deduplicating to just the most recent one, sorted newest first.
    @Cacheable(cacheNames = "scryfallSearch", key = "'prints:' + #cardName")
    public List<Card> getPrintings(String cardName) {
        throttle();
        try {
            ScryfallSearchResponseDto response = restClient
                    .get()
                    .uri("/cards/search?q={q}&unique=prints&order=released&dir=desc", "!\"" + cardName + "\"")
                    .retrieve()
                    .body(ScryfallSearchResponseDto.class);
            if (response == null) {
                return List.of();
            }
            return response.data().stream().map(ScryfallMapper::toCard).toList();
        } catch (HttpClientErrorException.NotFound e) {
            return List.of();
        }
    }

    @Cacheable(cacheNames = "scryfallCard", key = "#scryfallId")
    public Optional<Card> getCard(String scryfallId) {
        throttle();
        try {
            ScryfallCardDto dto = restClient.get().uri("/cards/{id}", scryfallId).retrieve().body(ScryfallCardDto.class);
            return Optional.ofNullable(dto).map(ScryfallMapper::toCard);
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    private void throttle() {
        synchronized (throttleLock) {
            long wait = MIN_INTERVAL_MILLIS - (System.currentTimeMillis() - lastRequestAtMillis);
            if (wait > 0) {
                try {
                    Thread.sleep(wait);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            lastRequestAtMillis = System.currentTimeMillis();
        }
    }
}
