package dev.adriankluge.hobbyhub.auth.exception;

public class DuplicateEmailException extends RuntimeException {
    public DuplicateEmailException(String email) {
        super("An account with email '%s' already exists".formatted(email));
    }
}
