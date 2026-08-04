package dev.adriankluge.hobbyhub.auth.exception;

public class InvalidResetTokenException extends RuntimeException {
    public InvalidResetTokenException() {
        super("Reset token is invalid, expired, or already used");
    }
}
