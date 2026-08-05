package dev.adriankluge.hobbyhub.config;

import org.springframework.boot.web.client.RestClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

// Applies to every RestClient.Builder Spring hands out (Scryfall, Tagesschau,
// WotC, ...) - without an explicit timeout, RestClient's default JDK
// HttpClient-backed factory can hang indefinitely on a stalled connection.
// That's a real risk for NewsRefreshService in particular: it runs on the
// single-threaded default @Scheduled executor, so one stuck call would
// silently stop every future scheduled refresh, not just that one call (see
// news.client.TagesschauClient). A RestClientCustomizer bean, rather than
// setting the request factory per-client, keeps this out of the way of
// MockRestServiceServer.bindTo() in tests, which manually build a
// RestClient.Builder outside the Spring context this customizer applies to.
@Configuration
public class RestClientConfig {

    private static final int TIMEOUT_MILLIS = 10_000;

    @Bean
    public RestClientCustomizer timeoutRestClientCustomizer() {
        return builder -> {
            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(TIMEOUT_MILLIS);
            requestFactory.setReadTimeout(TIMEOUT_MILLIS);
            builder.requestFactory(requestFactory);
        };
    }
}
