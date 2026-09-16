package com.security_management.backend.service;

import com.security_management.backend.audit.AuditService;
import com.security_management.backend.dto.DocumentAccessGrantRequest;
import com.security_management.backend.dto.DocumentAccessResponse;
import com.security_management.backend.entity.Document;
import com.security_management.backend.entity.accessList.AccessStatus;
import com.security_management.backend.entity.accessList.DocumentAccess;
import com.security_management.backend.entity.accessList.DocumentAccessId;
import com.security_management.backend.entity.accessList.DocumentPermission;
import com.security_management.backend.model.user;
import com.security_management.backend.repository.DocumentAccessRepository;
import com.security_management.backend.repository.DocumentRepository;
import com.security_management.backend.repository.userRepository;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class DocumentAccessService {

    private static final Logger log = LoggerFactory.getLogger(DocumentAccessService.class);

    private final DocumentAccessRepository documentAccessRepository;
    private final DocumentRepository documentRepository;
    private final userRepository userRepository;
    private final AuditService auditService;
    private final CaseAccessService caseAccessService;

    public DocumentAccessService(DocumentAccessRepository documentAccessRepository,
                                 DocumentRepository documentRepository,
                                 userRepository userRepository,
                                 AuditService auditService,
                                 CaseAccessService caseAccessService) {
        this.documentAccessRepository = documentAccessRepository;
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.caseAccessService = caseAccessService;
    }

    @Transactional
    public DocumentAccessResponse grantAccess(String documentId, DocumentAccessGrantRequest request, String requestingUserId, String ipAddress) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("Document not found: " + documentId));

        user targetUser = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + request.getUserId()));

        if (requestingUserId == null || requestingUserId.isBlank()) {
            throw new SecurityException("Authenticated user is required to grant document access.");
        }

        Optional<DocumentAccess> existingAccess = documentAccessRepository.findByDocumentAndUser(document, targetUser);

        if (existingAccess.isPresent()) {
            DocumentAccess access = existingAccess.get();
            if (access.getStatus() == AccessStatus.ACTIVE) {
                log.info("Access already exists for document {} and user {}", documentId, request.getUserId());
                auditService.logEvent(requestingUserId, documentId, document.getCaseId(),
                        "ACCESS_CONFLICT", "FAILURE", ipAddress,
                        "Duplicate active access attempt for user " + request.getUserId());
                throw new IllegalStateException("Active access already exists for this document and user.");
            }
            access.setPermission(request.getPermission());
            access.setGrantedBy(request.getGrantedBy());
            access.setGrantedAt(LocalDateTime.now());
            access.setExpiresAt(request.getExpiresAt());
            access.setStatus(AccessStatus.ACTIVE);
            DocumentAccess saved = documentAccessRepository.save(access);

            auditService.logEvent(requestingUserId, documentId, document.getCaseId(),
                    "ACCESS_GRANTED", "SUCCESS", ipAddress,
                    "Reactivated access for user " + request.getUserId() + " with permission " + request.getPermission());
            return toResponse(saved);
        }

        DocumentAccessId id = new DocumentAccessId(documentId, request.getUserId());
        DocumentAccess access = new DocumentAccess();
        access.setId(id);
        access.setDocument(document);
        access.setUser(targetUser);
        access.setPermission(request.getPermission());
        access.setGrantedBy(request.getGrantedBy());
        access.setGrantedAt(LocalDateTime.now());
        access.setExpiresAt(request.getExpiresAt());
        access.setStatus(AccessStatus.ACTIVE);

        DocumentAccess saved = documentAccessRepository.save(access);

        auditService.logEvent(requestingUserId, documentId, document.getCaseId(),
                "ACCESS_GRANTED", "SUCCESS", ipAddress,
                "Granted access to user " + request.getUserId() + " with permission " + request.getPermission());

        return toResponse(saved);
    }

    @Transactional
    public DocumentAccessResponse revokeAccess(String documentId, Integer userId, String requestingUserId, String ipAddress) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("Document not found: " + documentId));

        user targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        DocumentAccess access = documentAccessRepository.findByDocumentAndUser(document, targetUser)
                .orElseThrow(() -> new EntityNotFoundException("No access record found for document " + documentId + " and user " + userId));

        access.setStatus(AccessStatus.REVOKED);
        access.setExpiresAt(LocalDateTime.now());
        documentAccessRepository.save(access);

        auditService.logEvent(requestingUserId, documentId, document.getCaseId(),
                "ACCESS_REVOKED", "SUCCESS", ipAddress,
                "Revoked access for user " + userId);

        return toResponse(access);
    }

    @Transactional
    public DocumentAccessResponse updatePermission(String documentId, Integer userId, DocumentPermission permission,
                                                  String requestingUserId, String ipAddress) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("Document not found: " + documentId));

        user targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        DocumentAccess access = documentAccessRepository.findByDocumentAndUser(document, targetUser)
                .orElseThrow(() -> new EntityNotFoundException("No access record found for document " + documentId + " and user " + userId));

        access.setPermission(permission);
        access.setGrantedBy(requestingUserId);
        access.setGrantedAt(LocalDateTime.now());
        documentAccessRepository.save(access);

        auditService.logEvent(requestingUserId, documentId, document.getCaseId(),
                "ACCESS_PERMISSION_UPDATED", "SUCCESS", ipAddress,
                "Updated permission to " + permission + " for user " + userId);

        return toResponse(access);
    }

    public boolean checkAccess(String documentId, String userId, DocumentPermission requestedPermission) {
        Optional<Document> document = documentRepository.findById(documentId);
        if (document.isPresent()
                && (requestedPermission == DocumentPermission.VIEW
                || requestedPermission == DocumentPermission.DOWNLOAD
                || requestedPermission == DocumentPermission.UPLOAD)
                && caseAccessService.hasActiveAccess(document.get().getCaseId(), userId)) {
            return true;
        }
        Integer resolvedUserId = resolveUserId(userId);
        if (resolvedUserId == null) {
            return false;
        }
        return checkAccess(documentId, resolvedUserId, requestedPermission);
    }

    @Transactional(readOnly = true)
    public void requireDocumentCaseAccess(String documentId, String userId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("Document not found: " + documentId));
        caseAccessService.requireCaseAccess(document.getCaseId(), userId);
    }

    public boolean checkAccess(String documentId, Integer userId, DocumentPermission requestedPermission) {
        Optional<Document> document = documentRepository.findById(documentId);
        if (document.isEmpty()) {
            return false;
        }

        if ((requestedPermission == DocumentPermission.VIEW
                || requestedPermission == DocumentPermission.DOWNLOAD
                || requestedPermission == DocumentPermission.UPLOAD)
                && caseAccessService.hasActiveAccess(document.get().getCaseId(), String.valueOf(userId))) {
            return true;
        }

        Optional<user> targetUser = userRepository.findById(userId);
        if (targetUser.isEmpty()) {
            return false;
        }

        Optional<DocumentAccess> accessOpt = documentAccessRepository.findByDocumentAndUser(document.get(), targetUser.get());
        if (accessOpt.isEmpty()) {
            return false;
        }

        DocumentAccess access = accessOpt.get();

        if (access.getStatus() != AccessStatus.ACTIVE) {
            return false;
        }

        if (access.getExpiresAt() != null && access.getExpiresAt().isBefore(LocalDateTime.now())) {
            access.setStatus(AccessStatus.EXPIRED);
            documentAccessRepository.save(access);
            return false;
        }

        return hasPermission(access.getPermission(), requestedPermission);
    }

    @Transactional(readOnly = true)
    public List<DocumentAccessResponse> getDocumentUsers(String documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("Document not found: " + documentId));

        return documentAccessRepository.findByDocument(document).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DocumentAccessResponse> getUserDocuments(Integer userId) {
        user targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        return documentAccessRepository.findByUser(targetUser).stream()
                .map(this::toResponse)
                .toList();
    }

    private boolean hasPermission(DocumentPermission assignedPermission, DocumentPermission requestedPermission) {
        if (assignedPermission == null) {
            return false;
        }

        if (assignedPermission == DocumentPermission.DELETE) {
            return requestedPermission == DocumentPermission.DELETE || requestedPermission == DocumentPermission.EDIT
                    || requestedPermission == DocumentPermission.SHARE || requestedPermission == DocumentPermission.UPLOAD
                    || requestedPermission == DocumentPermission.DOWNLOAD || requestedPermission == DocumentPermission.VIEW;
        }
        if (assignedPermission == DocumentPermission.SHARE) {
            return requestedPermission == DocumentPermission.SHARE || requestedPermission == DocumentPermission.UPLOAD
                    || requestedPermission == DocumentPermission.DOWNLOAD || requestedPermission == DocumentPermission.VIEW;
        }
        if (assignedPermission == DocumentPermission.EDIT) {
            return requestedPermission == DocumentPermission.EDIT || requestedPermission == DocumentPermission.UPLOAD
                    || requestedPermission == DocumentPermission.DOWNLOAD || requestedPermission == DocumentPermission.VIEW;
        }
        if (assignedPermission == DocumentPermission.UPLOAD) {
            return requestedPermission == DocumentPermission.UPLOAD || requestedPermission == DocumentPermission.DOWNLOAD
                    || requestedPermission == DocumentPermission.VIEW;
        }
        if (assignedPermission == DocumentPermission.DOWNLOAD) {
            return requestedPermission == DocumentPermission.DOWNLOAD || requestedPermission == DocumentPermission.VIEW;
        }
        return assignedPermission == requestedPermission || requestedPermission == DocumentPermission.VIEW;
    }

    public Integer resolveUserId(String userIdValue) {
        if (userIdValue == null || userIdValue.isBlank()) {
            return null;
        }

        try {
            return Integer.valueOf(userIdValue.trim());
        } catch (NumberFormatException ignored) {
            user existingUser = userRepository.findByUsername(userIdValue.trim());
            return existingUser != null ? existingUser.getUserId() : null;
        }
    }

    private DocumentAccessResponse toResponse(DocumentAccess access) {
        return DocumentAccessResponse.builder()
                .documentId(access.getId().getDocumentId())
                .userId(access.getId().getUserId())
                .permission(access.getPermission())
                .grantedBy(access.getGrantedBy())
                .grantedAt(access.getGrantedAt())
                .expiresAt(access.getExpiresAt())
                .status(access.getStatus())
                .build();
    }
}
