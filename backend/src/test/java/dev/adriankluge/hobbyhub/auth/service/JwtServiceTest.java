package dev.adriankluge.hobbyhub.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import dev.adriankluge.hobbyhub.auth.entity.Role;
import dev.adriankluge.hobbyhub.auth.entity.User;
import io.jsonwebtoken.Claims;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private final JwtService jwtService =
            new JwtService("test-secret-key-at-least-32-bytes-long-for-hmac", 900);

    private final User user = new User("alice@example.com", "hashed", "Alice");

    @Test
    void generatedTokenParsesBackToTheSameUserIdEmailAndRole() {
        String token = jwtService.generateAccessToken(user);

        Optional<Claims> claims = jwtService.parseClaims(token);

        assertThat(claims).isPresent();
        assertThat(jwtService.extractUserId(claims.get())).isEqualTo(user.getId());
        assertThat(claims.get().get("email", String.class)).isEqualTo("alice@example.com");
        assertThat(jwtService.extractRole(claims.get())).isEqualTo(Role.USER);
    }

    @Test
    void garbageTokenFailsToParse() {
        assertThat(jwtService.parseClaims("not-a-real-jwt")).isEmpty();
    }

    @Test
    void tokenSignedWithADifferentKeyFailsToParse() {
        JwtService otherService = new JwtService("a-completely-different-secret-key-32-bytes!", 900);
        String token = otherService.generateAccessToken(user);

        assertThat(jwtService.parseClaims(token)).isEmpty();
    }

    @Test
    void expiredTokenFailsToParse() {
        JwtService shortLived = new JwtService("test-secret-key-at-least-32-bytes-long-for-hmac", -1);
        String token = shortLived.generateAccessToken(user);

        assertThat(jwtService.parseClaims(token)).isEmpty();
    }
}
