package dev.adriankluge.hobbyhub.auth.dto;

public record AuthResponse(String accessToken, long expiresInSeconds, UserResponse user) {}
