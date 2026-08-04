package dev.adriankluge.hobbyhub.auth.filter;

import dev.adriankluge.hobbyhub.auth.entity.Role;
import java.util.UUID;

/**
 * Principal populated from the access token's own claims - no database
 * round-trip needed to identify who's making the request, which is the
 * point of using a JWT for this rather than a server-side session lookup.
 */
public record AuthenticatedUser(UUID id, String email, Role role) {}
