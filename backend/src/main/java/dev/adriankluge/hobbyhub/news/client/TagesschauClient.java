package dev.adriankluge.hobbyhub.news.client;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

// Unofficial-but-documented Tagesschau API (github.com/bundesAPI/tagesschau-api).
// Free, keyless, private/non-commercial use only, capped at 60 req/hour - this
// app calls it a handful of times per hour from NewsRefreshService, never live
// per page view (see docs/deploy-checklist.md and section 4.1 of the brief).
//
// Connect/read timeouts come from the shared RestClientCustomizer (see
// config.RestClientConfig) rather than being set here - overriding the
// request factory directly in this constructor would clobber whatever
// factory a caller already configured on the builder, which is exactly how
// MockRestServiceServer.bindTo() intercepts requests in tests.
@Component
public class TagesschauClient {

    private static final int MAX_ITEMS = 5;

    private final RestClient restClient;

    public TagesschauClient(RestClient.Builder restClientBuilder, @Value("${app.news.tagesschau-base-url}") String baseUrl) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).defaultHeader("Accept", "application/json").build();
    }

    public List<FetchedNewsItem> fetchLatest() {
        // No trailing slash - the API 308-redirects "/api2u/homepage/" to
        // "/api2u/homepage", and that redirect isn't followed (a real bug
        // caught only by live verification: it deserialized the redirect's
        // empty body into a DTO with a null `news` list instead of throwing,
        // so it looked like "zero headlines today" rather than an error).
        TagesschauResponseDto response = restClient.get().uri("/api2u/homepage").retrieve().body(TagesschauResponseDto.class);
        if (response == null || response.news() == null) {
            return List.of();
        }
        return response.news().stream()
                .limit(MAX_ITEMS)
                .map(item -> new FetchedNewsItem(item.title(), item.firstSentence(), item.shareURL(), item.date()))
                .toList();
    }
}
