package dev.adriankluge.hobbyhub.auth.service;

import dev.adriankluge.hobbyhub.auth.dto.AuthResponse;
import dev.adriankluge.hobbyhub.auth.dto.SignupRequest;
import dev.adriankluge.hobbyhub.auth.dto.UserResponse;
import dev.adriankluge.hobbyhub.auth.entity.User;
import dev.adriankluge.hobbyhub.auth.exception.DuplicateEmailException;
import dev.adriankluge.hobbyhub.auth.exception.InvalidCredentialsException;
import dev.adriankluge.hobbyhub.auth.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenService refreshTokenService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    public record IssuedSession(AuthResponse response, String rawRefreshToken) {}

    @Transactional
    public IssuedSession signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateEmailException(request.email());
        }
        User user = new User(request.email(), passwordEncoder.encode(request.password()), request.displayName());
        userRepository.save(user);
        return issueSession(user);
    }

    @Transactional
    public IssuedSession login(String email, String password) {
        User user = userRepository.findByEmail(email).orElseThrow(InvalidCredentialsException::new);
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        return issueSession(user);
    }

    // Deliberately NOT @Transactional: this method makes no repository calls
    // of its own, only delegating to RefreshTokenService.rotate(), which
    // already manages its own transaction (including a noRollbackFor rule
    // for the reuse-detection case - see its Javadoc). Wrapping this method
    // in its own @Transactional would join that same physical transaction
    // and re-evaluate rollback rules at this wider scope, silently
    // overriding rotate()'s more careful exemption. Caught live against a
    // real Postgres instance - mocked-repository unit tests can't see
    // transaction propagation bugs like this.
    public IssuedSession refresh(String rawRefreshToken) {
        RefreshTokenService.RotationResult rotation = refreshTokenService.rotate(rawRefreshToken);
        return new IssuedSession(
                new AuthResponse(
                        jwtService.generateAccessToken(rotation.user()),
                        jwtService.getAccessTokenTtlSeconds(),
                        UserResponse.from(rotation.user())),
                rotation.newRawToken());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenService.revoke(rawRefreshToken);
    }

    private IssuedSession issueSession(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String rawRefreshToken = refreshTokenService.issue(user);
        return new IssuedSession(
                new AuthResponse(accessToken, jwtService.getAccessTokenTtlSeconds(), UserResponse.from(user)),
                rawRefreshToken);
    }
}
