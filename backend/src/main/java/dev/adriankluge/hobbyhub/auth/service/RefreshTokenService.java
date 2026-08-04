package dev.adriankluge.hobbyhub.auth.service;

import dev.adriankluge.hobbyhub.auth.entity.RefreshToken;
import dev.adriankluge.hobbyhub.auth.entity.User;
import dev.adriankluge.hobbyhub.auth.exception.InvalidRefreshTokenException;
import dev.adriankluge.hobbyhub.auth.repository.RefreshTokenRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Issues and rotates refresh tokens per docs/adr/0001: every refresh
 * revokes the presented token and issues a new one. If a token that was
 * already revoked gets presented again - a strong signal the token was
 * stolen and the legitimate rotation already happened - every active
 * session for that user is revoked, not just the one token.
 */
@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final TokenHasher tokenHasher;
    private final long refreshTokenTtlSeconds;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            TokenHasher tokenHasher,
            @Value("${app.jwt.refresh-token-ttl-seconds:2592000}") long refreshTokenTtlSeconds) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.tokenHasher = tokenHasher;
        this.refreshTokenTtlSeconds = refreshTokenTtlSeconds;
    }

    public long getRefreshTokenTtlSeconds() {
        return refreshTokenTtlSeconds;
    }

    /** Issues a new refresh token for the user and returns the RAW token (never stored). */
    @Transactional
    public String issue(User user) {
        String rawToken = tokenHasher.generateRawToken();
        RefreshToken entity =
                new RefreshToken(user, tokenHasher.hash(rawToken), Instant.now().plusSeconds(refreshTokenTtlSeconds));
        refreshTokenRepository.save(entity);
        return rawToken;
    }

    public record RotationResult(User user, String newRawToken) {}

    /**
     * Validates the presented raw refresh token and, if valid, revokes it
     * and issues a replacement. Throws InvalidRefreshTokenException if the
     * token is unknown or expired, or if reuse of an already-revoked token
     * is detected (in which case every session for that user is revoked
     * first, so the caller's error message can say so).
     *
     * <p>noRollbackFor is required here: Spring rolls back the whole
     * transaction by default on any unchecked exception, which would
     * silently undo the revokeAllForUser() call in the reuse-detection
     * branch below - the one write we most need to keep, since it's the
     * actual security response to a stolen/replayed token. Caught live
     * against a real Postgres instance; the mocked-repository unit tests
     * couldn't see this because they have no real transaction semantics.
     */
    @Transactional(noRollbackFor = InvalidRefreshTokenException.class)
    public RotationResult rotate(String rawToken) {
        RefreshToken existing =
                refreshTokenRepository
                        .findByTokenHash(tokenHasher.hash(rawToken))
                        .orElseThrow(() -> new InvalidRefreshTokenException("Refresh token not recognized"));

        if (existing.isRevoked()) {
            revokeAllForUser(existing.getUser());
            throw new InvalidRefreshTokenException(
                    "Refresh token was already used - all sessions for this account have been revoked");
        }

        if (existing.isExpired()) {
            throw new InvalidRefreshTokenException("Refresh token has expired");
        }

        existing.revoke();
        refreshTokenRepository.save(existing);

        User user = existing.getUser();
        return new RotationResult(user, issue(user));
    }

    @Transactional
    public void revoke(String rawToken) {
        refreshTokenRepository.findByTokenHash(tokenHasher.hash(rawToken)).ifPresent(token -> {
            token.revoke();
            refreshTokenRepository.save(token);
        });
    }

    @Transactional
    public void revokeAllForUser(User user) {
        List<RefreshToken> active = refreshTokenRepository.findAllByUserAndRevokedAtIsNull(user);
        active.forEach(RefreshToken::revoke);
        refreshTokenRepository.saveAll(active);
    }
}
