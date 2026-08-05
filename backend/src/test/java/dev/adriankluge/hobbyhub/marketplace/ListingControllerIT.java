package dev.adriankluge.hobbyhub.marketplace;

import static org.assertj.core.api.Assertions.assertThat;

import dev.adriankluge.hobbyhub.auth.dto.AuthResponse;
import dev.adriankluge.hobbyhub.auth.dto.SignupRequest;
import dev.adriankluge.hobbyhub.marketplace.dto.CreateListingRequest;
import dev.adriankluge.hobbyhub.marketplace.dto.ListingResponse;
import dev.adriankluge.hobbyhub.marketplace.dto.UpdateListingRequest;
import dev.adriankluge.hobbyhub.marketplace.entity.ListingCategory;
import dev.adriankluge.hobbyhub.marketplace.entity.ListingStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Full stack (real Postgres via Testcontainers) coverage for the two things
 * that matter most here per the project's test plan: filter/sort/pagination
 * correctness, and the IDOR case - one user must not be able to edit or
 * delete another user's listing. Deliberately no "dev" profile, so
 * MarketplaceDevSeeder doesn't run and pollute the counts these tests assert
 * on.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
// Otherwise NewsRefreshService would fire a real outbound call to Tagesschau
// during this test - slow and dependent on an external service being up.
@TestPropertySource(properties = "app.news.scheduling-enabled=false")
class ListingControllerIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private TestRestTemplate restTemplate;

    @BeforeEach
    void useJdkHttpClient() {
        // See AuthControllerIT for why - TestRestTemplate's default request
        // factory can't handle non-2xx responses to streamed POST/PATCH bodies.
        restTemplate.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());
    }

    private String signUpAndGetAccessToken(String emailPrefix) {
        String email = emailPrefix + "-" + System.nanoTime() + "@example.com";
        ResponseEntity<AuthResponse> signup = restTemplate.postForEntity(
                "/api/auth/signup", new SignupRequest(email, "password123", "Seller"), AuthResponse.class);
        assertThat(signup.getStatusCode()).isEqualTo(HttpStatus.OK);
        return signup.getBody().accessToken();
    }

    private HttpEntity<CreateListingRequest> createRequest(String accessToken, CreateListingRequest body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return new HttpEntity<>(body, headers);
    }

    private <T> HttpEntity<T> authed(String accessToken, T body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return new HttpEntity<>(body, headers);
    }

    @Test
    void createListAndFilterByCategoryAndPrice() {
        String seller = signUpAndGetAccessToken("filter-seller");

        restTemplate.exchange(
                "/api/listings",
                HttpMethod.POST,
                createRequest(seller, new CreateListingRequest(
                        "Catan", "Board game", ListingCategory.BOARD_GAME, new BigDecimal("20.00"), "Good", null)),
                ListingResponse.class);
        restTemplate.exchange(
                "/api/listings",
                HttpMethod.POST,
                createRequest(seller, new CreateListingRequest(
                        "Lightning Bolt", "MTG card", ListingCategory.MTG_SINGLE, new BigDecimal("1.50"), "Near Mint",
                        null)),
                ListingResponse.class);
        restTemplate.exchange(
                "/api/listings",
                HttpMethod.POST,
                createRequest(seller, new CreateListingRequest(
                        "Black Lotus", "MTG card", ListingCategory.MTG_SINGLE, new BigDecimal("9999.00"),
                        "Near Mint", null)),
                ListingResponse.class);

        ResponseEntity<Map<String, Object>> mtgOnly = restTemplate.exchange(
                "/api/listings?category=MTG_SINGLE",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {});
        assertThat(mtgOnly.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<?> mtgContent = (List<?>) mtgOnly.getBody().get("content");
        assertThat(mtgContent).hasSize(2);

        ResponseEntity<Map<String, Object>> underFive = restTemplate.exchange(
                "/api/listings?category=MTG_SINGLE&maxPrice=5.00",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {});
        List<Map<String, Object>> underFiveContent = (List<Map<String, Object>>) underFive.getBody().get("content");
        assertThat(underFiveContent).hasSize(1);
        assertThat(underFiveContent.get(0).get("title")).isEqualTo("Lightning Bolt");
    }

    @Test
    void sortsByPriceAscending() {
        String seller = signUpAndGetAccessToken("sort-seller");
        String marker = "sort-" + System.nanoTime();

        restTemplate.exchange(
                "/api/listings",
                HttpMethod.POST,
                createRequest(seller, new CreateListingRequest(
                        marker, "expensive", ListingCategory.OTHER, new BigDecimal("50.00"), "Good", null)),
                ListingResponse.class);
        restTemplate.exchange(
                "/api/listings",
                HttpMethod.POST,
                createRequest(seller, new CreateListingRequest(
                        marker, "cheap", ListingCategory.OTHER, new BigDecimal("5.00"), "Good", null)),
                ListingResponse.class);

        ResponseEntity<Map<String, Object>> sorted = restTemplate.exchange(
                "/api/listings?sort=price_asc&size=50",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {});
        List<Map<String, Object>> content = (List<Map<String, Object>>) sorted.getBody().get("content");
        List<Map<String, Object>> matching = content.stream()
                .filter(l -> marker.equals(l.get("title")))
                .toList();
        assertThat(matching).hasSize(2);
        assertThat(matching.get(0).get("description")).isEqualTo("cheap");
        assertThat(matching.get(1).get("description")).isEqualTo("expensive");
    }

    @Test
    void ownerCanEditButAnotherUserCannotIdorCheck() {
        String owner = signUpAndGetAccessToken("owner");
        String stranger = signUpAndGetAccessToken("stranger");

        ResponseEntity<ListingResponse> created = restTemplate.exchange(
                "/api/listings",
                HttpMethod.POST,
                createRequest(owner, new CreateListingRequest(
                        "My Listing", "desc", ListingCategory.OTHER, new BigDecimal("10.00"), "Good", null)),
                ListingResponse.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UUID id = created.getBody().id();

        UpdateListingRequest maliciousUpdate = new UpdateListingRequest(
                "Hijacked", "desc", ListingCategory.OTHER, new BigDecimal("0.01"), "Good", ListingStatus.ACTIVE, null);
        ResponseEntity<String> strangerAttempt = restTemplate.exchange(
                "/api/listings/" + id, HttpMethod.PATCH, authed(stranger, maliciousUpdate), String.class);
        assertThat(strangerAttempt.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<String> strangerDeleteAttempt = restTemplate.exchange(
                "/api/listings/" + id, HttpMethod.DELETE, authed(stranger, null), String.class);
        assertThat(strangerDeleteAttempt.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        UpdateListingRequest legitimateUpdate = new UpdateListingRequest(
                "Updated Title", "desc", ListingCategory.OTHER, new BigDecimal("12.00"), "Good",
                ListingStatus.ACTIVE, null);
        ResponseEntity<ListingResponse> ownerUpdate = restTemplate.exchange(
                "/api/listings/" + id, HttpMethod.PATCH, authed(owner, legitimateUpdate), ListingResponse.class);
        assertThat(ownerUpdate.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(ownerUpdate.getBody().title()).isEqualTo("Updated Title");

        // A fresh GET, not just the PATCH response echo - the update handler
        // once mutated the entity in memory without calling save(), which the
        // PATCH response body couldn't reveal (it echoes the in-memory object
        // either way) but a separately-loaded read immediately did.
        ResponseEntity<ListingResponse> reread =
                restTemplate.exchange("/api/listings/" + id, HttpMethod.GET, null, ListingResponse.class);
        assertThat(reread.getBody().title()).isEqualTo("Updated Title");
        assertThat(reread.getBody().price()).isEqualByComparingTo("12.00");

        ResponseEntity<Void> ownerDelete = restTemplate.exchange(
                "/api/listings/" + id, HttpMethod.DELETE, authed(owner, null), Void.class);
        assertThat(ownerDelete.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<String> getAfterDelete =
                restTemplate.exchange("/api/listings/" + id, HttpMethod.GET, null, String.class);
        assertThat(getAfterDelete.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void creatingAListingRequiresAuthentication() {
        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/listings",
                new CreateListingRequest(
                        "No Auth", "desc", ListingCategory.OTHER, new BigDecimal("1.00"), "Good", null),
                String.class);
        assertThat(response.getStatusCode()).isIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }
}
