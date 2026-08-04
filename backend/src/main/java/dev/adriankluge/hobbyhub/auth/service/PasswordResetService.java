package dev.adriankluge.hobbyhub.auth.service;

import dev.adriankluge.hobbyhub.auth.entity.PasswordResetToken;
import dev.adriankluge.hobbyhub.auth.entity.User;
import dev.adriankluge.hobbyhub.auth.exception.InvalidResetTokenException;
import dev.adriankluge.hobbyhub.auth.repository.PasswordResetTokenRepository;
import dev.adriankluge.hobbyhub.auth.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * v1 is dev-mode only per docs/adr/0007: the raw token is handed back to
 * the caller (AuthController decides, based on the active Spring profile,
 * whether to actually include it in the HTTP response - see
 * app.password-reset.expose-token-in-response). Real email delivery is a
 * deferred follow-up; without it, a reset request in `prod` currently has
 * no way to reach the user.
 */
@Service
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final TokenHasher tokenHasher;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final long resetTokenTtlSeconds;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository resetTokenRepository,
            TokenHasher tokenHasher,
            PasswordEncoder passwordEncoder,
            RefreshTokenService refreshTokenService,
            @Value("${app.password-reset.token-ttl-seconds:3600}") long resetTokenTtlSeconds) {
        this.userRepository = userRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.tokenHasher = tokenHasher;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenService = refreshTokenService;
        this.resetTokenTtlSeconds = resetTokenTtlSeconds;
    }

    /** Returns the raw token if the email matched an account, empty otherwise. Callers must not let this
     * distinction leak into the HTTP response - always respond with the same generic message either way. */
    @Transactional
    public Optional<String> requestReset(String email) {
        return userRepository.findByEmail(email).map(user -> {
            String rawToken = tokenHasher.generateRawToken();
            PasswordResetToken entity = new PasswordResetToken(
                    user, tokenHasher.hash(rawToken), Instant.now().plusSeconds(resetTokenTtlSeconds));
            resetTokenRepository.save(entity);
            return rawToken;
        });
    }

    @Transactional
    public void confirmReset(String rawToken, String newPassword) {
        PasswordResetToken entity = resetTokenRepository
                .findByTokenHash(tokenHasher.hash(rawToken))
                .filter(PasswordResetToken::isUsable)
                .orElseThrow(InvalidResetTokenException::new);

        User user = entity.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        entity.markUsed();
        resetTokenRepository.save(entity);

        // A password change should invalidate every existing session, not just future logins.
        refreshTokenService.revokeAllForUser(user);
    }
}
