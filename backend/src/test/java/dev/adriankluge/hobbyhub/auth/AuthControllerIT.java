package dev.adriankluge.hobbyhub.auth;

import static org.assertj.core.api.Assertions.assertThat;

import dev.adriankluge.hobbyhub.auth.dto.AuthResponse;
import dev.adriankluge.hobbyhub.auth.dto.LoginRequest;
import dev.adriankluge.hobbyhub.auth.dto.PasswordResetConfirm;
import dev.adriankluge.hobbyhub.auth.dto.PasswordResetRequest;
import dev.adriankluge.hobbyhub.auth.dto.SignupRequest;
import dev.adriankluge.hobbyhub.auth.dto.UserResponse;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Exercises the full auth flow against a real Postgres (via Testcontainers,
 * not H2) so the Flyway migration and its Postgres-specific SQL are
 * actually validated, not just mocked-around.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
@Testcontainers
// Otherwise NewsRefreshService/MtgMetaRefreshService would fire real
// outbound calls during this test - slow and dependent on external services.
@TestPropertySource(properties = {"app.news.scheduling-enabled=false", "app.mtg.meta-scheduling-enabled=false"})
class AuthControllerIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private TestRestTemplate restTemplate;

    @BeforeEach
    void useJdkHttpClient() {
        // TestRestTemplate's default request factory is backed by the
        // legacy HttpURLConnection, which throws "HttpRetryException:
        // cannot retry due to server authentication, in streaming mode" on
        // POSTs that get a non-2xx response (e.g. our 401s) - it can't
        // replay a streamed request body to process an error response.
        // JdkClientHttpRequestFactory (java.net.http.HttpClient, JDK 11+)
        // doesn't have this limitation. Caught on CI (Linux, where
        // Testcontainers actually runs), not locally.
        restTemplate.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());
    }

    private static String cookieNameAndValue(ResponseEntity<?> response) {
        String setCookie = response.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).as("Set-Cookie header").isNotNull();
        return setCookie.split(";", 2)[0];
    }

    private HttpEntity<Void> withCookie(String cookie) {
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.COOKIE, cookie);
        return new HttpEntity<>(headers);
    }

    @Test
    void signupLoginRefreshReuseDetectionAndLogout() {
        String email = "flow-" + System.nanoTime() + "@example.com";

        ResponseEntity<AuthResponse> signup = restTemplate.postForEntity(
                "/api/auth/signup", new SignupRequest(email, "password123", "Flow Tester"), AuthResponse.class);
        assertThat(signup.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(signup.getBody()).isNotNull();
        String firstRefreshCookie = cookieNameAndValue(signup);

        // Access token from signup works against a protected endpoint.
        HttpHeaders authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(signup.getBody().accessToken());
        ResponseEntity<UserResponse> me = restTemplate.exchange(
                "/api/users/me", HttpMethod.GET, new HttpEntity<>(authHeaders), UserResponse.class);
        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(me.getBody().email()).isEqualTo(email);

        // Login separately issues its own, independent refresh token.
        ResponseEntity<AuthResponse> login = restTemplate.postForEntity(
                "/api/auth/login", new LoginRequest(email, "password123"), AuthResponse.class);
        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);

        // Rotate the token from signup.
        ResponseEntity<AuthResponse> refresh = restTemplate.exchange(
                "/api/auth/refresh", HttpMethod.POST, withCookie(firstRefreshCookie), AuthResponse.class);
        assertThat(refresh.getStatusCode()).isEqualTo(HttpStatus.OK);
        String rotatedRefreshCookie = cookieNameAndValue(refresh);
        assertThat(rotatedRefreshCookie).isNotEqualTo(firstRefreshCookie);

        // Presenting the now-revoked original cookie again must fail - reuse detection.
        ResponseEntity<String> reuse = restTemplate.exchange(
                "/api/auth/refresh", HttpMethod.POST, withCookie(firstRefreshCookie), String.class);
        assertThat(reuse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        // Reuse detection revokes every session for the user, including the one
        // just rotated - so the "new" cookie from the refresh above is dead too.
        ResponseEntity<String> rotatedNowDead = restTemplate.exchange(
                "/api/auth/refresh", HttpMethod.POST, withCookie(rotatedRefreshCookie), String.class);
        assertThat(rotatedNowDead.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        // The independent login session survives all of that and can log out cleanly.
        String loginRefreshCookie = cookieNameAndValue(login);
        ResponseEntity<Void> logout = restTemplate.exchange(
                "/api/auth/logout", HttpMethod.POST, withCookie(loginRefreshCookie), Void.class);
        assertThat(logout.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> refreshAfterLogout = restTemplate.exchange(
                "/api/auth/refresh", HttpMethod.POST, withCookie(loginRefreshCookie), String.class);
        assertThat(refreshAfterLogout.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void protectedEndpointRejectsRequestsWithNoToken() {
        ResponseEntity<String> response = restTemplate.getForEntity("/api/users/me", String.class);
        assertThat(response.getStatusCode()).isIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }

    @Test
    void signupRejectsADuplicateEmail() {
        String email = "dup-" + System.nanoTime() + "@example.com";
        restTemplate.postForEntity(
                "/api/auth/signup", new SignupRequest(email, "password123", "First"), AuthResponse.class);

        ResponseEntity<String> second = restTemplate.postForEntity(
                "/api/auth/signup", new SignupRequest(email, "password123", "Second"), String.class);

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void loginRejectsWrongPassword() {
        String email = "wrongpw-" + System.nanoTime() + "@example.com";
        restTemplate.postForEntity(
                "/api/auth/signup", new SignupRequest(email, "password123", "Someone"), AuthResponse.class);

        ResponseEntity<String> loginAttempt = restTemplate.postForEntity(
                "/api/auth/login", new LoginRequest(email, "totally-wrong"), String.class);

        assertThat(loginAttempt.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @SuppressWarnings("unchecked")
    void passwordResetFlowEndToEnd() {
        String email = "reset-" + System.nanoTime() + "@example.com";
        restTemplate.postForEntity(
                "/api/auth/signup", new SignupRequest(email, "oldPassword1", "Resetter"), AuthResponse.class);

        ResponseEntity<Map> resetRequest = restTemplate.postForEntity(
                "/api/auth/password-reset/request", new PasswordResetRequest(email), Map.class);
        assertThat(resetRequest.getStatusCode()).isEqualTo(HttpStatus.OK);
        String devToken = (String) resetRequest.getBody().get("devToken");
        assertThat(devToken).as("dev profile should expose the reset token").isNotNull();

        ResponseEntity<Void> confirm = restTemplate.postForEntity(
                "/api/auth/password-reset/confirm",
                new PasswordResetConfirm(devToken, "newPassword2"),
                Void.class);
        assertThat(confirm.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> oldPasswordLogin = restTemplate.postForEntity(
                "/api/auth/login", new LoginRequest(email, "oldPassword1"), String.class);
        assertThat(oldPasswordLogin.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        ResponseEntity<AuthResponse> newPasswordLogin = restTemplate.postForEntity(
                "/api/auth/login", new LoginRequest(email, "newPassword2"), AuthResponse.class);
        assertThat(newPasswordLogin.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
