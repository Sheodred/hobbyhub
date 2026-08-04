package dev.adriankluge.hobbyhub.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetConfirm(
        @NotBlank String token, @NotBlank @Size(min = 8, max = 100) String newPassword) {}
