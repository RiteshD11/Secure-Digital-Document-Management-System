package com.security_management.backend.controller;

import com.security_management.backend.dto.DocumentAccessGrantRequest;
import com.security_management.backend.dto.DocumentAccessRequestDto;
import com.security_management.backend.dto.DocumentAccessResponse;
import com.security_management.backend.entity.accessList.DocumentAccessRequest;
import com.security_management.backend.entity.accessList.DocumentPermission;
import com.security_management.backend.service.DocumentAccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class DocumentAccessController {

    private final DocumentAccessService documentAccessService;

    public DocumentAccessController(DocumentAccessService documentAccessService) {
        this.documentAccessService = documentAccessService;
    }

    @PostMapping("/documents/{documentId}/access")
    public ResponseEntity<DocumentAccessResponse> grantAccess(
            @PathVariable String documentId,
            @Valid @RequestBody DocumentAccessGrantRequest request,
            HttpServletRequest httpServletRequest) {

        String requestingUserId = resolveRequestingUserId(httpServletRequest);
        if (requestingUserId == null || requestingUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user is required to manage document access.");
        }

        DocumentAccessResponse response = documentAccessService.grantAccess(
                documentId,
                request,
                requestingUserId,
                httpServletRequest.getRemoteAddr()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/documents/{documentId}/access/request")
    public ResponseEntity<DocumentAccessRequest> requestAccess(
            @PathVariable String documentId,
            @Valid @RequestBody DocumentAccessRequestDto request,
            HttpServletRequest httpServletRequest) {

        String requestingUserId = resolveRequestingUserId(httpServletRequest);
        DocumentAccessRequest accessRequest = documentAccessService.requestAccess(
                documentId, request, requestingUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(accessRequest);
    }

    @GetMapping("/documents/{documentId}/access/requests")
    public ResponseEntity<List<DocumentAccessRequest>> getAccessRequests(@PathVariable String documentId) {
        String requestingUserId = resolveRequestingUserId();
        return ResponseEntity.ok(documentAccessService.getAccessRequests(documentId, requestingUserId));
    }

    @PutMapping("/documents/access/requests/{requestId}")
    public ResponseEntity<DocumentAccessRequest> reviewAccessRequest(
            @PathVariable Long requestId,
            @RequestParam boolean approved,
            HttpServletRequest httpServletRequest) {

        String reviewedBy = resolveRequestingUserId(httpServletRequest);
        DocumentAccessRequest updatedRequest = documentAccessService.reviewAccessRequest(
                requestId, approved, reviewedBy, httpServletRequest.getRemoteAddr());
        return ResponseEntity.ok(updatedRequest);
    }

    @GetMapping("/documents/{documentId}/access")
    public ResponseEntity<List<DocumentAccessResponse>> getDocumentUsers(@PathVariable String documentId) {
        documentAccessService.requireDocumentCaseAccess(documentId, resolveRequestingUserId());
        return ResponseEntity.ok(documentAccessService.getDocumentUsers(documentId));
    }

    @PutMapping("/documents/{documentId}/access/{userId}")
    public ResponseEntity<DocumentAccessResponse> updatePermission(
            @PathVariable String documentId,
            @PathVariable Integer userId,
            @Valid @RequestBody DocumentAccessGrantRequest request,
            HttpServletRequest httpServletRequest) {

        String requestingUserId = resolveRequestingUserId(httpServletRequest);
        if (requestingUserId == null || requestingUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user is required to manage document access.");
        }

        DocumentAccessResponse response = documentAccessService.updatePermission(
                documentId,
                userId,
                request.getPermission(),
                requestingUserId,
                httpServletRequest.getRemoteAddr()
        );

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/documents/{documentId}/access/{userId}")
    public ResponseEntity<DocumentAccessResponse> revokeAccess(
            @PathVariable String documentId,
            @PathVariable Integer userId,
            HttpServletRequest httpServletRequest) {

        String requestingUserId = resolveRequestingUserId(httpServletRequest);
        if (requestingUserId == null || requestingUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user is required to manage document access.");
        }

        DocumentAccessResponse response = documentAccessService.revokeAccess(
                documentId,
                userId,
                requestingUserId,
                httpServletRequest.getRemoteAddr()
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/documents/{documentId}/access/check")
    public ResponseEntity<Boolean> checkAccess(
            @PathVariable String documentId,
            @RequestParam(required = false) Integer ignoredUserId,
            @RequestParam DocumentPermission permission) {

        boolean allowed = documentAccessService.checkAccess(documentId, resolveRequestingUserId(), permission);
        return ResponseEntity.ok(allowed);
    }

    @GetMapping("/users/{userId}/access")
    public ResponseEntity<List<DocumentAccessResponse>> getUserDocuments(@PathVariable Integer userId) {
        String authenticatedUser = resolveRequestingUserId();
        Integer authenticatedUserId = documentAccessService.resolveUserId(authenticatedUser);
        if (authenticatedUserId == null || !authenticatedUserId.equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Users may only inspect their own document access.");
        }
        return ResponseEntity.ok(documentAccessService.getUserDocuments(authenticatedUserId));
    }

    private String resolveRequestingUserId(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && authentication.getName() != null
                && !"anonymousUser".equalsIgnoreCase(authentication.getName())) {
            return authentication.getName();
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required.");
    }

    private String resolveRequestingUserId() {
        return resolveRequestingUserId(null);
    }
}
