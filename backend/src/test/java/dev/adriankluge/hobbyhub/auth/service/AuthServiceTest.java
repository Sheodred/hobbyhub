package dev.adriankluge.hobbyhub.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import dev.adriankluge.hobbyhub.auth.dto.SignupRequest;
import dev.adriankluge.hobbyhub.auth.entity.User;
import dev.adriankluge.hobbyhub.auth.exception.DuplicateEmailException;
import dev.adriankluge.hobbyhub.auth.exception.InvalidCredentialsException;
import dev.adriankluge.hobbyhub.auth.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final JwtService jwtService = mock(JwtService.class);
    private final RefreshTokenService refreshTokenService = mock(RefreshTokenService.class);
    private final AuthService authService =
            new AuthService(userRepository, passwordEncoder, jwtService, refreshTokenService);

    @BeforeEach
    void stubTokenIssuance() {
        when(jwtService.generateAccessToken(any())).thenReturn("access-token");
        when(jwtService.getAccessTokenTtlSeconds()).thenReturn(900L);
        when(refreshTokenService.issue(any())).thenReturn("raw-refresh-token");
    }

    @Test
    void signupCreatesUserWithHashedPasswordAndIssuesASession() {
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed-password");

        var session = authService.signup(new SignupRequest("alice@example.com", "password123", "Alice"));

        verify(userRepository)
                .save(org.mockito.ArgumentMatchers.argThat(
                        user -> user.getEmail().equals("alice@example.com")
                                && user.getPasswordHash().equals("hashed-password")));
        assertThat(session.response().accessToken()).isEqualTo("access-token");
        assertThat(session.rawRefreshToken()).isEqualTo("raw-refresh-token");
    }

    @Test
    void signupRejectsADuplicateEmail() {
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(true);

        assertThatThrownBy(() ->
                        authService.signup(new SignupRequest("alice@example.com", "password123", "Alice")))
                .isInstanceOf(DuplicateEmailException.class);
    }

    @Test
    void loginSucceedsWithCorrectCredentials() {
        User user = new User("alice@example.com", "hashed-password", "Alice");
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "hashed-password")).thenReturn(true);

        var session = authService.login("alice@example.com", "password123");

        assertThat(session.response().accessToken()).isEqualTo("access-token");
    }

    @Test
    void loginFailsWithWrongPassword() {
        User user = new User("alice@example.com", "hashed-password", "Alice");
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> authService.login("alice@example.com", "wrong-password"))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void loginFailsForAnUnknownEmailWithTheSameErrorAsWrongPassword() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        // Deliberately the same exception/message as a wrong password - this must
        // not distinguish "no such account" from "wrong password" to an attacker.
        assertThatThrownBy(() -> authService.login("nobody@example.com", "whatever"))
                .isInstanceOf(InvalidCredentialsException.class);
    }
}
