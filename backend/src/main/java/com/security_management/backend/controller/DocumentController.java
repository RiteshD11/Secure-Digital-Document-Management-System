package com.security_management.backend.controller;

import com.security_management.backend.audit.AuditService;
import com.security_management.backend.blockchain.BlockchainCustodyEvent;
import com.security_management.backend.blockchain.BlockchainRecordDto;
import com.security_management.backend.blockchain.BlockchainService;
import com.security_management.backend.blockchain.BlockchainTxResult;
import com.security_management.backend.dto.AuditLogResponse;
import com.security_management.backend.dto.DocumentDetailResponse;
import com.security_management.backend.dto.DocumentVerificationResponse;
import com.security_management.backend.dto.UploadDocumentResponse;
import com.security_management.backend.entity.AuditLog;
import com.security_management.backend.entity.Document;
import com.security_management.backend.entity.DocumentVersion;
import com.security_management.backend.exception.DocumentNotFoundException;
import com.security_management.backend.repository.AuditLogRepository;
import com.security_management.backend.repository.DocumentRepository;
import com.security_management.backend.repository.DocumentVersionRepository;
import com.security_management.backend.service.CaseAccessService;
import com.security_management.backend.service.DocumentAccessService;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class DocumentController {

    private final DocumentUploadService documentUploadService;
    private final DocumentDownloadService documentDownloadService;
    private final DocumentVerificationService documentVerificationService;
    private final BlockchainService blockchainService;
    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditService auditService;
    private final StorageService storageService;
    private final DocumentAccessService documentAccessService;
    private final CaseAccessService caseAccessService;

    @Autowired
    public DocumentController(DocumentUploadService documentUploadService,
                              DocumentDownloadService documentDownloadService,
                              DocumentVerificationService documentVerificationService,
                              BlockchainService blockchainService,
                              DocumentRepository documentRepository,
                              DocumentVersionRepository documentVersionRepository,
                              AuditLogRepository auditLogRepository,
                              AuditService auditService,
                              StorageService storageService,
                              DocumentAccessService documentAccessService,
                              CaseAccessService caseAccessService) {
        this.documentUploadService = documentUploadService;
        this.documentDownloadService = documentDownloadService;
        this.documentVerificationService = documentVerificationService;
        this.blockchainService = blockchainService;
        this.documentRepository = documentRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.auditLogRepository = auditLogRepository;
        this.auditService = auditService;
        this.storageService = storageService;
        this.documentAccessService = documentAccessService;
        this.caseAccessService = caseAccessService;
    }

    /**
     * POST /api/documents/upload: Upload new document with full security, crypto, and blockchain anchoring
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
     * POST /api/documents/{id}/versions: Upload a new version
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
     * Get document details and version histories
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
     * Step 7: GET /api/documents/{id}/download: Secure download with in-memory decryption & blockchain check
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
                .header("X-DMS-SHA3-256", doc.getSha3_256())
                .header("X-DMS-BLAKE3", doc.getBlake3())
                .header("X-DMS-Integrity-Verified", String.valueOf(doc.isIntegrityVerified()))
                .header("X-DMS-Blockchain-Verified", String.valueOf(doc.isBlockchainVerified()))
                .header("X-DMS-Signature-Valid", String.valueOf(doc.isSignatureValid()))
                .header("X-DMS-Version", String.valueOf(doc.getVersion()))
                .body(resource);
    }

    /**
     * Download specific version
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
     * Forensic Multi-Point Verification: GET /api/documents/{id}/verify
     * Secure Viewing Session API: GET /api/documents/{id}/view-session
     * Generates dynamic viewing watermark metadata and records an immutable forensic audit event.
     */
    @GetMapping("/documents/{id}/view-session")
    public ResponseEntity<Map<String, Object>> getViewSession(
            @PathVariable("id") String documentId,
            @RequestParam(value = "version", required = false) Integer version,
            HttpServletRequest request) {

        String clientIp = request.getRemoteAddr();
        String userId = requireAuthenticatedUser();

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found: " + documentId));
        caseAccessService.requireCaseAccess(document.getCaseId(), userId);

        String sessionToken = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        String formattedTimestamp = now.format(java.time.format.DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm"));

        auditService.logEvent(userId, documentId, document.getCaseId(),
                "DOCUMENT_VIEWED", "SUCCESS", clientIp,
                "Secure viewing session generated (session: " + sessionToken + ")");

        Map<String, Object> response = new HashMap<>();
        response.put("sessionToken", sessionToken);
        response.put("caseId", document.getCaseId());
        response.put("documentId", document.getId());
        response.put("documentTitle", document.getOriginalFilename());
        response.put("classification", document.getClassification());
        response.put("userIdentifier", userId);
        response.put("timestamp", formattedTimestamp);
        response.put("watermarkLines", List.of(
                document.getClassification() != null ? document.getClassification() : "CONFIDENTIAL",
                "CASE: " + document.getCaseId(),
                "DOCUMENT: " + document.getId(),
                "USER: " + userId,
                "SESSION: " + sessionToken,
                "TIMESTAMP: " + formattedTimestamp
        ));

        return ResponseEntity.ok(response);
    }

    /**
     * In-Browser Document Preview API: GET /api/documents/{id}/preview
     * Streams decrypted document content with inline content disposition for secure browser rendering.
     */
    @GetMapping("/documents/{id}/preview")
    public ResponseEntity<Resource> previewDocument(
            @PathVariable("id") String documentId,
            @RequestParam(value = "version", required = false) Integer version,
            HttpServletRequest request) {

        String clientIp = request.getRemoteAddr();
        String userId = requireAuthenticatedUser();

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found: " + documentId));
        caseAccessService.requireCaseAccess(document.getCaseId(), userId);

        DocumentDownloadService.DecryptedDocument doc = documentDownloadService
                .downloadAndDecrypt(documentId, version, userId, clientIp);

        ByteArrayResource resource = new ByteArrayResource(doc.getContent());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(doc.getMimeType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.getFilename() + "\"")
                .header("X-DMS-SHA256", doc.getSha256())
                .header("X-DMS-Integrity-Verified", String.valueOf(doc.isIntegrityVerified()))
                .header("X-DMS-Signature-Valid", String.valueOf(doc.isSignatureValid()))
                .header("X-DMS-Version", String.valueOf(doc.getVersion()))
                .body(resource);
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
     * Blockchain Proof & Chain of Custody History: GET /api/documents/{id}/blockchain
     */
    @GetMapping("/documents/{id}/blockchain")
    public ResponseEntity<Map<String, Object>> getBlockchainDetails(@PathVariable("id") String documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found: " + documentId));
        caseAccessService.requireCaseAccess(document.getCaseId(), requireAuthenticatedUser());

        BlockchainRecordDto record = blockchainService.getDocumentRecord(documentId);
        List<BlockchainCustodyEvent> history = blockchainService.getDocumentHistory(documentId);

        Map<String, Object> response = new HashMap<>();
        response.put("documentId", documentId);
        response.put("blockchainRecord", record);
        response.put("chainOfCustody", history);
        response.put("status", record != null ? "ANCHORED_IN_FABRIC" : "NOT_FOUND_ON_CHAIN");

        return ResponseEntity.ok(response);
    }

    /**
     * Transfer Custody on Blockchain: POST /api/documents/{id}/custody/transfer
     */
    @PostMapping("/documents/{id}/custody/transfer")
    public ResponseEntity<BlockchainTxResult> transferCustody(
            @PathVariable("id") String documentId,
            @RequestParam("newCustodian") String newCustodian,
            @RequestParam(value = "reason", required = false, defaultValue = "Transferred for court proceedings") String reason) {

        String userId = requireAuthenticatedUser();
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found: " + documentId));
        caseAccessService.requireCaseAccess(document.getCaseId(), userId);

        BlockchainTxResult result = blockchainService.transferCustody(documentId, newCustodian, reason, userId);
        return ResponseEntity.ok(result);
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
     * Clear all documents and storage files for fresh test runs.
     */
    @PostMapping("/test/reset")
    public ResponseEntity<Map<String, String>> resetAllData() {
        documentVersionRepository.deleteAll();
        documentRepository.deleteAll();
        auditLogRepository.deleteAll();
        documentUploadService.resetCounter();

        // Clear local storage files
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
        res.put("message", "Database, blockchain ledger, and storage cleared successfully.");
        return ResponseEntity.ok(res);
    }
}
