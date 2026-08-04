package dev.adriankluge.hobbyhub.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import dev.adriankluge.hobbyhub.auth.entity.PasswordResetToken;
import dev.adriankluge.hobbyhub.auth.entity.User;
import dev.adriankluge.hobbyhub.auth.exception.InvalidResetTokenException;
import dev.adriankluge.hobbyhub.auth.repository.PasswordResetTokenRepository;
import dev.adriankluge.hobbyhub.auth.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class PasswordResetServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final PasswordResetTokenRepository resetTokenRepository = mock(PasswordResetTokenRepository.class);
    private final TokenHasher tokenHasher = mock(TokenHasher.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final RefreshTokenService refreshTokenService = mock(RefreshTokenService.class);
    private final PasswordResetService service = new PasswordResetService(
            userRepository, resetTokenRepository, tokenHasher, passwordEncoder, refreshTokenService, 3600);

    private final User user = new User("alice@example.com", "old-hash", "Alice");

    @BeforeEach
    void stubHashing() {
        when(tokenHasher.generateRawToken()).thenReturn("raw-reset-token");
        when(tokenHasher.hash(any())).thenReturn("hashed-reset-token");
    }

    @Test
    void requestResetReturnsATokenWhenTheEmailMatchesAnAccount() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));

        Optional<String> token = service.requestReset("alice@example.com");

        assertThat(token).contains("raw-reset-token");
        verify(resetTokenRepository).save(any());
    }

    @Test
    void requestResetReturnsEmptyForAnUnknownEmailWithoutSavingAnything() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        Optional<String> token = service.requestReset("nobody@example.com");

        assertThat(token).isEmpty();
        verify(resetTokenRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void confirmResetUpdatesThePasswordMarksTheTokenUsedAndRevokesAllSessions() {
        PasswordResetToken token = new PasswordResetToken(user, "hashed-reset-token", Instant.now().plusSeconds(60));
        when(resetTokenRepository.findByTokenHash("hashed-reset-token")).thenReturn(Optional.of(token));
        when(passwordEncoder.encode("newPassword123")).thenReturn("new-hash");

        service.confirmReset("raw-reset-token", "newPassword123");

        assertThat(user.getPasswordHash()).isEqualTo("new-hash");
        verify(refreshTokenService).revokeAllForUser(user);
        verify(resetTokenRepository).save(token);
    }

    @Test
    void confirmResetRejectsAnAlreadyUsedToken() {
        PasswordResetToken token = new PasswordResetToken(user, "hashed-reset-token", Instant.now().plusSeconds(60));
        token.markUsed();
        when(resetTokenRepository.findByTokenHash("hashed-reset-token")).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.confirmReset("raw-reset-token", "newPassword123"))
                .isInstanceOf(InvalidResetTokenException.class);
    }

    @Test
    void confirmResetRejectsAnExpiredToken() {
        PasswordResetToken token = new PasswordResetToken(user, "hashed-reset-token", Instant.now().minusSeconds(1));
        when(resetTokenRepository.findByTokenHash("hashed-reset-token")).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.confirmReset("raw-reset-token", "newPassword123"))
                .isInstanceOf(InvalidResetTokenException.class);
    }

    @Test
    void confirmResetRejectsAnUnknownToken() {
        when(resetTokenRepository.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.confirmReset("raw-reset-token", "newPassword123"))
                .isInstanceOf(InvalidResetTokenException.class);
    }
}
