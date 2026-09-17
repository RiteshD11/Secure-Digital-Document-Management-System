package com.security_management.backend.controller;

import com.security_management.backend.audit.AuditService;
import com.security_management.backend.dto.AuditLogResponse;
import com.security_management.backend.dto.DocumentDetailResponse;
import com.security_management.backend.dto.DocumentVerificationResponse;
import com.security_management.backend.dto.UploadDocumentResponse;
import com.security_management.backend.entity.AuditLog;
import com.security_management.backend.entity.Document;
import com.security_management.backend.entity.DocumentVersion;
import com.security_management.backend.exception.DocumentNotFoundException;
import com.security_management.backend.repository.DocumentRepository;
import com.security_management.backend.repository.DocumentVersionRepository;
import com.security_management.backend.service.DocumentDownloadService;
import com.security_management.backend.service.DocumentUploadService;
import com.security_management.backend.service.DocumentVerificationService;
import com.security_management.backend.storage.StorageService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.security_management.backend.repository.AuditLogRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class DocumentController {

    private final DocumentUploadService documentUploadService;
    private final DocumentDownloadService documentDownloadService;
    private final DocumentVerificationService documentVerificationService;
    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditService auditService;
    private final StorageService storageService;
    private final com.security_management.backend.service.DocumentAccessService documentAccessService;
    private final com.security_management.backend.service.CaseAccessService caseAccessService;

    @Autowired
    public DocumentController(DocumentUploadService documentUploadService,
                              DocumentDownloadService documentDownloadService,
                              DocumentVerificationService documentVerificationService,
                              DocumentRepository documentRepository,
                              DocumentVersionRepository documentVersionRepository,
                              AuditLogRepository auditLogRepository,
                              AuditService auditService,
                              StorageService storageService,
                              com.security_management.backend.service.DocumentAccessService documentAccessService,
                              com.security_management.backend.service.CaseAccessService caseAccessService) {
        this.documentUploadService = documentUploadService;
        this.documentDownloadService = documentDownloadService;
        this.documentVerificationService = documentVerificationService;
        this.documentRepository = documentRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.auditLogRepository = auditLogRepository;
        this.auditService = auditService;
        this.storageService = storageService;
        this.documentAccessService = documentAccessService;
        this.caseAccessService = caseAccessService;
    }

    /**
     * Phase 18 Step 20: POST /api/documents/upload
     */
    @PostMapping(value = "/documents/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UploadDocumentResponse> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("caseId") String caseId,
            @RequestParam(value = "documentType", required = false, defaultValue = "FIR") String documentType,
            @RequestParam(value = "classification", required = false, defaultValue = "CONFIDENTIAL") String classification,
            @RequestParam(value = "uploadedBy", required = false) String ignoredUploadedBy,
            HttpServletRequest request) {

        String clientIp = request.getRemoteAddr();
        UploadDocumentResponse response = documentUploadService.uploadDocument(
                file, caseId, documentType, classification, requireAuthenticatedUser(), clientIp
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Phase 23: POST /api/documents/{id}/versions
     */
    @PostMapping(value = "/documents/{id}/versions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UploadDocumentResponse> uploadNewVersion(
            @PathVariable("id") String documentId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "uploadedBy", required = false) String ignoredUploadedBy,
            HttpServletRequest request) {

        String clientIp = request.getRemoteAddr();
        UploadDocumentResponse response = documentUploadService.uploadNewVersion(
            documentId, file, requireAuthenticatedUser(), clientIp
        );
        return ResponseEntity.ok(response);
    }

    /**
     * List all documents
     */
    @GetMapping("/documents")
    public ResponseEntity<List<Document>> getAllDocuments() {
        String userId = requireAuthenticatedUser();
        List<String> caseIds = caseAccessService.getAllCases(userId).stream()
            .map(com.security_management.backend.entity.cases::getCase_number)
            .toList();
        return ResponseEntity.ok(documentRepository.findAllByOrderByCreatedAtDesc().stream()
            .filter(document -> caseIds.contains(document.getCaseId()))
            .toList());
    }

    /**
     * Get document details and all version histories
     */
    @GetMapping("/documents/{id}")
    public ResponseEntity<DocumentDetailResponse> getDocumentDetails(@PathVariable("id") String documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found: " + documentId));
        caseAccessService.requireCaseAccess(document.getCaseId(), requireAuthenticatedUser());
        List<DocumentVersion> versions = documentVersionRepository
                .findByDocumentIdOrderByVersionNumberDesc(documentId);

        return ResponseEntity.ok(new DocumentDetailResponse(document, versions));
    }

    /**
     * Phase 20: GET /api/documents/{id}/download
     */
    @GetMapping("/documents/{id}/download")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable("id") String documentId,
            @RequestParam(value = "version", required = false) Integer version,
            @RequestParam(value = "userId", required = false) String ignoredUserId,
            HttpServletRequest request) {

        String clientIp = request.getRemoteAddr();
        String userId = requireAuthenticatedUser();

        boolean authorized = documentAccessService.checkAccess(documentId, userId, com.security_management.backend.entity.accessList.DocumentPermission.DOWNLOAD);
        if (!authorized) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not authorized to download this document.");
        }

        DocumentDownloadService.DecryptedDocument doc = documentDownloadService
                .downloadAndDecrypt(documentId, version, userId, clientIp);

        ByteArrayResource resource = new ByteArrayResource(doc.getContent());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(doc.getMimeType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getFilename() + "\"")
                .header("X-DMS-SHA256", doc.getSha256())
                .header("X-DMS-Integrity-Verified", String.valueOf(doc.isIntegrityVerified()))
                .header("X-DMS-Signature-Valid", String.valueOf(doc.isSignatureValid()))
                .header("X-DMS-Version", String.valueOf(doc.getVersion()))
                .body(resource);
    }

    /**
     * Download specific version: GET /api/documents/{id}/versions/{version}/download
     */
    @GetMapping("/documents/{id}/versions/{version}/download")
    public ResponseEntity<Resource> downloadSpecificVersion(
            @PathVariable("id") String documentId,
            @PathVariable("version") Integer version,
            @RequestParam(value = "userId", required = false, defaultValue = "OFFICER-A") String userId,
            HttpServletRequest request) {
        return downloadDocument(documentId, version, userId, request);
    }

    /**
     * Phase 25: GET /api/documents/{id}/verify
     */
    @GetMapping("/documents/{id}/verify")
    public ResponseEntity<DocumentVerificationResponse> verifyDocument(
            @PathVariable("id") String documentId,
            @RequestParam(value = "version", required = false) Integer version) {
        Document document = documentRepository.findById(documentId)
            .orElseThrow(() -> new DocumentNotFoundException("Document not found: " + documentId));
        caseAccessService.requireCaseAccess(document.getCaseId(), requireAuthenticatedUser());
        DocumentVerificationResponse response = documentVerificationService
                .verifyDocumentSecurity(documentId, version);
        return ResponseEntity.ok(response);
    }

    /**
     * Audit log retrieval: GET /api/audit-logs
     */
    @GetMapping({"/audit-logs", "/audit/logs"})
    public ResponseEntity<List<AuditLogResponse>> getAuditLogs(
            @RequestParam(value = "documentId", required = false) String documentId,
            @RequestParam(value = "caseId", required = false) String caseId) {

        String userId = requireAuthenticatedUser();
        List<AuditLog> logs;
        if (documentId != null && !documentId.trim().isEmpty()) {
            logs = auditService.getAuditLogsForDocument(documentId);
        } else if (caseId != null && !caseId.trim().isEmpty()) {
            logs = auditService.getAuditLogsForCase(caseId);
        } else {
            logs = auditService.getAllAuditLogs();
        }

        logs = logs.stream()
            .filter(log -> caseAccessService.hasActiveAccess(log.getCaseId(), userId))
            .toList();

        List<AuditLogResponse> response = logs.stream()
                .map(l -> AuditLogResponse.builder()
                        .id(l.getId())
                        .userId(l.getUserId())
                        .documentId(l.getDocumentId())
                        .caseId(l.getCaseId())
                        .action(l.getAction())
                        .timestamp(l.getTimestamp())
                        .ipAddress(l.getIpAddress())
                        .result(l.getResult())
                        .details(l.getDetails())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    private String requireAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equalsIgnoreCase(authentication.getName())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required.");
        }
        return authentication.getName();
    }

    /**
     * Clear all documents, version history, audit logs, and encrypted storage files.
     * Resets document counter back to DOC-1001 for fresh test runs.
     */
    @PostMapping("/test/reset")
    public ResponseEntity<Map<String, String>> resetAllData() {
        documentVersionRepository.deleteAll();
        documentRepository.deleteAll();
        auditLogRepository.deleteAll();
        documentUploadService.resetCounter();

        // Clear local encrypted storage files
        try {
            Path storageDir = Paths.get("storage/encrypted");
            if (Files.exists(storageDir)) {
                try (var stream = Files.walk(storageDir)) {
                    stream.sorted(Comparator.reverseOrder())
                            .filter(p -> !p.equals(storageDir))
                            .forEach(p -> {
                                try { Files.deleteIfExists(p); } catch (Exception ignored) {}
                            });
                }
            }
        } catch (Exception ignored) {}

        Map<String, String> res = new HashMap<>();
        res.put("status", "SUCCESS");
        res.put("message", "Database and encrypted storage completely cleared! Starting from DOC-1001.");
        return ResponseEntity.ok(res);
    }
}
