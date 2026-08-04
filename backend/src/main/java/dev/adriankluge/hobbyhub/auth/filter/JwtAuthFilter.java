package dev.adriankluge.hobbyhub.auth.filter;

import dev.adriankluge.hobbyhub.auth.service.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Reads the short-lived access token from the Authorization header (never
 * from a cookie - only the refresh token lives in a cookie, per
 * docs/adr/0001) and, if valid, populates the SecurityContext. Leaves
 * enforcement of which routes require authentication to SecurityConfig.
 */
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        extractBearerToken(request)
                .flatMap(jwtService::parseClaims)
                .ifPresent(claims -> authenticate(claims));

        filterChain.doFilter(request, response);
    }

    private void authenticate(Claims claims) {
        AuthenticatedUser user = new AuthenticatedUser(
                jwtService.extractUserId(claims), claims.get("email", String.class), jwtService.extractRole(claims));

        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.role().name()));
        var authentication = new UsernamePasswordAuthenticationToken(user, null, authorities);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private Optional<String> extractBearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return Optional.of(header.substring("Bearer ".length()));
        }
        return Optional.empty();
    }
}
