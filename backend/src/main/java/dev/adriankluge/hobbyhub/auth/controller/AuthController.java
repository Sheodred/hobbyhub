package dev.adriankluge.hobbyhub.auth.controller;

import dev.adriankluge.hobbyhub.auth.dto.AuthResponse;
import dev.adriankluge.hobbyhub.auth.dto.LoginRequest;
import dev.adriankluge.hobbyhub.auth.dto.PasswordResetConfirm;
import dev.adriankluge.hobbyhub.auth.dto.PasswordResetRequest;
import dev.adriankluge.hobbyhub.auth.dto.SignupRequest;
import dev.adriankluge.hobbyhub.auth.exception.InvalidRefreshTokenException;
import dev.adriankluge.hobbyhub.auth.service.AuthService;
import dev.adriankluge.hobbyhub.auth.service.PasswordResetService;
import dev.adriankluge.hobbyhub.auth.service.RefreshTokenService;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String REFRESH_COOKIE_NAME = "refreshToken";
    private static final String REFRESH_COOKIE_PATH = "/api/auth";

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final RefreshTokenService refreshTokenService;
    private final Environment environment;
    private final boolean secureCookies;

    public AuthController(
            AuthService authService,
            PasswordResetService passwordResetService,
            RefreshTokenService refreshTokenService,
            Environment environment,
            @Value("${app.cookie.secure:true}") boolean secureCookies) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.refreshTokenService = refreshTokenService;
        this.environment = environment;
        this.secureCookies = secureCookies;
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request) {
        var session = authService.signup(request);
        return withRefreshCookie(session.response(), session.rawRefreshToken());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        var session = authService.login(request.email(), request.password());
        return withRefreshCookie(session.response(), session.rawRefreshToken());
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(value = REFRESH_COOKIE_NAME, required = false) String refreshToken) {
        if (refreshToken == null) {
            throw new InvalidRefreshTokenException("No refresh token cookie present");
        }
        var session = authService.refresh(refreshToken);
        return withRefreshCookie(session.response(), session.rawRefreshToken());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(value = REFRESH_COOKIE_NAME, required = false) String refreshToken) {
        if (refreshToken != null) {
            authService.logout(refreshToken);
        }
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, clearedCookie().toString()).build();
    }

    @PostMapping("/password-reset/request")
    public ResponseEntity<Map<String, String>> requestPasswordReset(
            @Valid @RequestBody PasswordResetRequest request) {
        var rawToken = passwordResetService.requestReset(request.email());

        // Always the same response regardless of whether the email matched an
        // account - the distinction must never leak through the API.
        Map<String, String> body = new HashMap<>();
        body.put("message", "If that email is registered, a reset link has been sent.");
        if (environment.matchesProfiles("dev")) {
            rawToken.ifPresent(token -> body.put("devToken", token));
        }
        return ResponseEntity.ok(body);
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<Void> confirmPasswordReset(@Valid @RequestBody PasswordResetConfirm request) {
        passwordResetService.confirmReset(request.token(), request.newPassword());
        return ResponseEntity.ok().build();
    }

    private ResponseEntity<AuthResponse> withRefreshCookie(AuthResponse response, String rawRefreshToken) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, rawRefreshToken)
                .httpOnly(true)
                .secure(secureCookies)
                .sameSite("Strict")
                .path(REFRESH_COOKIE_PATH)
                .maxAge(refreshTokenService.getRefreshTokenTtlSeconds())
                .build();
        return ResponseEntity.status(HttpStatus.OK)
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(response);
    }

    private ResponseCookie clearedCookie() {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(secureCookies)
                .sameSite("Strict")
                .path(REFRESH_COOKIE_PATH)
                .maxAge(0)
                .build();
    }
}
