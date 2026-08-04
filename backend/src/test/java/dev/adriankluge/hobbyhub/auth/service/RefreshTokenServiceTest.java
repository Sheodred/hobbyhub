package dev.adriankluge.hobbyhub.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import dev.adriankluge.hobbyhub.auth.entity.RefreshToken;
import dev.adriankluge.hobbyhub.auth.entity.User;
import dev.adriankluge.hobbyhub.auth.exception.InvalidRefreshTokenException;
import dev.adriankluge.hobbyhub.auth.repository.RefreshTokenRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RefreshTokenServiceTest {

    private final RefreshTokenRepository repository = mock(RefreshTokenRepository.class);
    private final TokenHasher tokenHasher = mock(TokenHasher.class);
    private final RefreshTokenService service = new RefreshTokenService(repository, tokenHasher, 2_592_000);

    private final User user = new User("alice@example.com", "hashed", "Alice");

    @BeforeEach
    void stubHashing() {
        when(tokenHasher.generateRawToken()).thenReturn("raw-token");
        when(tokenHasher.hash(any())).thenAnswer(invocation -> "hash-of-" + invocation.getArgument(0));
    }

    @Test
    void issueSavesAHashedTokenAndReturnsTheRawOne() {
        String raw = service.issue(user);

        assertThat(raw).isEqualTo("raw-token");
        verify(repository)
                .save(org.mockito.ArgumentMatchers.argThat(
                        token -> token.getTokenHash().equals("hash-of-raw-token")));
    }

    @Test
    void rotatingAValidTokenRevokesItAndIssuesAReplacement() {
        RefreshToken existing = validToken(user);
        when(repository.findByTokenHash("hash-of-raw-token")).thenReturn(Optional.of(existing));

        var result = service.rotate("raw-token");

        assertThat(existing.isRevoked()).isTrue();
        assertThat(result.newRawToken()).isEqualTo("raw-token"); // stubbed hasher always returns the same raw value
        assertThat(result.user()).isEqualTo(user);
    }

    @Test
    void rotatingAnAlreadyRevokedTokenRevokesEverySessionForThatUserAndThrows() {
        RefreshToken reused = validToken(user);
        reused.revoke();
        when(repository.findByTokenHash("hash-of-raw-token")).thenReturn(Optional.of(reused));

        RefreshToken otherActiveSession = validToken(user);
        when(repository.findAllByUserAndRevokedAtIsNull(user)).thenReturn(List.of(otherActiveSession));

        assertThatThrownBy(() -> service.rotate("raw-token")).isInstanceOf(InvalidRefreshTokenException.class);

        assertThat(otherActiveSession.isRevoked())
                .as("reuse of a revoked token must revoke every other active session too")
                .isTrue();
    }

    @Test
    void rotatingAnExpiredTokenThrowsWithoutTouchingOtherSessions() {
        RefreshToken expired = expiredToken(user);
        when(repository.findByTokenHash("hash-of-raw-token")).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> service.rotate("raw-token")).isInstanceOf(InvalidRefreshTokenException.class);

        // Expired (but not reused) tokens are rejected outright, not revoked -
        // nothing should be written back for this case.
        verify(repository, never()).save(any());
        verify(repository, never()).saveAll(any());
    }

    @Test
    void rotatingAnUnknownTokenThrows() {
        when(repository.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.rotate("raw-token")).isInstanceOf(InvalidRefreshTokenException.class);
    }

    private RefreshToken validToken(User user) {
        return new RefreshToken(user, "hash-of-raw-token", Instant.now().plusSeconds(3600));
    }

    private RefreshToken expiredToken(User user) {
        RefreshToken token = new RefreshToken(user, "hash-of-raw-token", Instant.now().minusSeconds(1));
        return token;
    }
}
