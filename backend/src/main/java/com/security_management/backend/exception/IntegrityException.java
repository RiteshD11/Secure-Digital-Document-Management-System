package com.security_management.backend.exception;

public class IntegrityException extends RuntimeException {
    public IntegrityException(String message) {
        super(message);
    }

    public IntegrityException(String message, Throwable cause) {
        super(message, cause);
    }
}
