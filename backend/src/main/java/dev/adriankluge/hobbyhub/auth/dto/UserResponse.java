package dev.adriankluge.hobbyhub.auth.dto;

import dev.adriankluge.hobbyhub.auth.entity.Role;
import dev.adriankluge.hobbyhub.auth.entity.User;
import java.util.UUID;

public record UserResponse(UUID id, String email, String displayName, Role role) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole());
    }
}
