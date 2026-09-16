package com.security_management.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;
import jakarta.persistence.EntityNotFoundException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(InvalidFileException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidFile(InvalidFileException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, "INVALID_FILE", ex.getMessage());
    }

    @ExceptionHandler(MalwareDetectedException.class)
    public ResponseEntity<Map<String, Object>> handleMalware(MalwareDetectedException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, "MALWARE_DETECTED", ex.getMessage());
    }

    @ExceptionHandler(IntegrityException.class)
    public ResponseEntity<Map<String, Object>> handleIntegrity(IntegrityException ex) {
        return buildResponse(HttpStatus.UNPROCESSABLE_ENTITY, "INTEGRITY_FAILURE", ex.getMessage());
    }

    @ExceptionHandler(EncryptionException.class)
    public ResponseEntity<Map<String, Object>> handleEncryption(EncryptionException ex) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "ENCRYPTION_ERROR", ex.getMessage());
    }

    @ExceptionHandler(DocumentNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(DocumentNotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleEntityNotFound(EntityNotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, Object>> handleForbidden(SecurityException ex) {
        return buildResponse(HttpStatus.FORBIDDEN, "FORBIDDEN", ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(IllegalStateException ex) {
        return buildResponse(HttpStatus.CONFLICT, "CONFLICT", ex.getMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxSize(MaxUploadSizeExceededException ex) {
        return buildResponse(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "File size exceeds maximum allowed limit (100MB)");
    }

    @ExceptionHandler({
            org.springframework.security.authentication.BadCredentialsException.class,
            org.springframework.security.core.userdetails.UsernameNotFoundException.class
    })
    public ResponseEntity<Map<String, Object>> handleBadCredentials(Exception ex) {
        return buildResponse(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Invalid email or password.");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        return buildResponse(HttpStatus.valueOf(ex.getStatusCode().value()), "HTTP_ERROR", ex.getReason() != null ? ex.getReason() : "Request failed");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", ex.getMessage() != null ? ex.getMessage() : "An unexpected error occurred");
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String error, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status.value());
        body.put("error", error);
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
