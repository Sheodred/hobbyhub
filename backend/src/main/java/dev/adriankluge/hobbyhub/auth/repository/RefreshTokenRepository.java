package dev.adriankluge.hobbyhub.auth.repository;

import dev.adriankluge.hobbyhub.auth.entity.RefreshToken;
import dev.adriankluge.hobbyhub.auth.entity.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findAllByUserAndRevokedAtIsNull(User user);
}
