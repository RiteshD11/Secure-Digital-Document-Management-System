package com.security_management.backend.service;

import com.security_management.backend.audit.AuditService;
import com.security_management.backend.dto.DocumentAccessGrantRequest;
import com.security_management.backend.dto.UploadDocumentResponse;
import com.security_management.backend.encryption.EncryptionService;
import com.security_management.backend.encryption.KeyManagementService;
import com.security_management.backend.entity.Document;
import com.security_management.backend.entity.DocumentVersion;
import com.security_management.backend.exception.DocumentNotFoundException;
import com.security_management.backend.exception.MalwareDetectedException;
import com.security_management.backend.hashing.HashService;
import com.security_management.backend.malware.MalwareScanService;
import com.security_management.backend.repository.DocumentRepository;
import com.security_management.backend.repository.DocumentVersionRepository;
import com.security_management.backend.signature.DigitalSignatureService;
import com.security_management.backend.storage.StorageService;
import com.security_management.backend.validation.FileValidationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class DocumentUploadService {

    private static final Logger log = LoggerFactory.getLogger(DocumentUploadService.class);
    private static final AtomicLong DOC_ID_COUNTER = new AtomicLong(1000);

    private final FileValidationService fileValidationService;
    private final MalwareScanService malwareScanService;
    private final HashService hashService;
    private final DigitalSignatureService digitalSignatureService;
    private final KeyManagementService keyManagementService;
    private final EncryptionService encryptionService;
    private final StorageService storageService;
    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final AuditService auditService;
    private final DocumentAccessService documentAccessService;
    private final CaseAccessService caseAccessService;

    @Autowired
    public DocumentUploadService(FileValidationService fileValidationService,
                                 MalwareScanService malwareScanService,
                                 HashService hashService,
                                 DigitalSignatureService digitalSignatureService,
                                 KeyManagementService keyManagementService,
                                 EncryptionService encryptionService,
                                 StorageService storageService,
                                 DocumentRepository documentRepository,
                                 DocumentVersionRepository documentVersionRepository,
                                 AuditService auditService,
                                 DocumentAccessService documentAccessService,
                                 CaseAccessService caseAccessService) {
        this.fileValidationService = fileValidationService;
        this.malwareScanService = malwareScanService;
        this.hashService = hashService;
        this.digitalSignatureService = digitalSignatureService;
        this.keyManagementService = keyManagementService;
        this.encryptionService = encryptionService;
        this.storageService = storageService;
        this.documentRepository = documentRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.auditService = auditService;
        this.documentAccessService = documentAccessService;
        this.caseAccessService = caseAccessService;
    }

    @jakarta.annotation.PostConstruct
    public void initCounter() {
        long count = documentRepository.count();
        DOC_ID_COUNTER.set(Math.max(1000, 1000 + count));
    }

    public void resetCounter() {
        DOC_ID_COUNTER.set(1000);
    }

    private synchronized String generateUniqueDocumentId() {
        String docId;
        do {
            docId = "DOC-" + DOC_ID_COUNTER.incrementAndGet();
        } while (documentRepository.existsById(docId));
        return docId;
    }

    /**
     * Complete upload pipeline matching Phases 0, 6-18.
     */
    @Transactional
    public UploadDocumentResponse uploadDocument(MultipartFile file,
                                                 String caseId,
                                                 String documentType,
                                                 String classification,
                                                 String userId,
                                                 String ipAddress) {
        String effectiveUserId = requireValue(userId, "userId");
        String effectiveCaseId = requireValue(caseId, "caseId");
        String effectiveDocType = (documentType != null && !documentType.trim().isEmpty()) ? documentType : "FIR";
        String effectiveClassification = (classification != null && !classification.trim().isEmpty()) ? classification : "CONFIDENTIAL";

        caseAccessService.requireCaseAccess(effectiveCaseId, effectiveUserId);

        // Step 1 & 2: User and Case authorization (validated here for demo context)
        log.info("Starting upload pipeline for user '{}', case '{}', file '{}'",
                effectiveUserId, effectiveCaseId, file != null ? file.getOriginalFilename() : "null");

        // Step 3: Phase 6 - File Validation
        fileValidationService.validateFile(file);

        byte[] rawBytes;
        try {
            rawBytes = file.getBytes();
        } catch (IOException e) {
            auditService.logEvent(effectiveUserId, null, effectiveCaseId, "UPLOAD_FAILED", "FAILURE", ipAddress, "Could not read uploaded bytes");
            throw new RuntimeException("Could not read uploaded file content: " + e.getMessage(), e);
        }

        // Step 4: Phase 7 - Malware Scanning (ClamAV / EICAR)
        MalwareScanService.ScanResult scanResult = malwareScanService.scan(rawBytes);
        if (scanResult == MalwareScanService.ScanResult.INFECTED) {
            auditService.logEvent(
                    effectiveUserId,
                    null,
                    effectiveCaseId,
                    "MALWARE_DETECTED",
                    "REJECTED",
                    ipAddress,
                    "Upload aborted: File is infected with malware/EICAR signature. No data stored or encrypted."
            );
            throw new MalwareDetectedException("Security alert: Upload rejected because malware or virus signature was detected in the file.");
        }

        // Step 5: Phase 8 - SHA-256 Hashing of original file
        String originalSha256 = hashService.calculateSha256(rawBytes);

        // Step 6: Phase 9 - Digital Signature (RSA-PSS)
        String signatureBase64 = digitalSignatureService.sign(rawBytes);

        String sanitizedFilename = fileValidationService.sanitizeFilename(file.getOriginalFilename());
        String mimeType = fileValidationService.detectMimeType(rawBytes, sanitizedFilename);

        // Generate ID and direct MinIO object key (preserving sanitized filename)
        String documentId = generateUniqueDocumentId();
        int versionNumber = 1;
        String objectKey = String.format("cases/%s/documents/%s/versions/v%d/%s",
                effectiveCaseId, documentId, versionNumber, sanitizedFilename);

        // Step 7: Store readable file directly in Storage (MinIO S3 / Local) with native MIME type
        boolean storedSuccessfully = false;
        try {
            storageService.store(objectKey, rawBytes, mimeType);
            storedSuccessfully = true;

            // Step 8: Save metadata & cryptographic signatures in MySQL Database
            Document document = Document.builder()
                    .id(documentId)
                    .caseId(effectiveCaseId)
                    .originalFilename(sanitizedFilename)
                    .mimeType(mimeType)
                    .fileSize((long) rawBytes.length)
                    .documentType(effectiveDocType)
                    .classification(effectiveClassification)
                    .uploadedBy(effectiveUserId)
                    .createdAt(LocalDateTime.now())
                    .currentVersion(versionNumber)
                    .status("ACTIVE")
                    .build();

            DocumentVersion documentVersion = DocumentVersion.builder()
                    .documentId(documentId)
                    .versionNumber(versionNumber)
                    .objectKey(objectKey)
                    .originalSha256(originalSha256)
                    .encryptionAlgorithm("MINIO_DIRECT_STORAGE")
                    .encryptionNonce("N/A")
                    .authenticationTag("N/A")
                    .wrappedDek("DIRECT_STORAGE")
                    .signature(signatureBase64)
                    .signatureAlgorithm(digitalSignatureService.getSignatureAlgorithm())
                    .signedBy("SECURE_DMS_SIGNER")
                    .signedAt(LocalDateTime.now())
                    .createdBy(effectiveUserId)
                    .createdAt(LocalDateTime.now())
                    .status("ACTIVE")
                    .filename(sanitizedFilename)
                    .mimeType(mimeType)
                    .build();

            documentRepository.save(document);
            documentVersionRepository.save(documentVersion);

            Integer grantedUserId = documentAccessService.resolveUserId(effectiveUserId);
            if (grantedUserId != null) {
                DocumentAccessGrantRequest accessRequest = new DocumentAccessGrantRequest();
                accessRequest.setUserId(grantedUserId);
                accessRequest.setPermission(com.security_management.backend.entity.accessList.DocumentPermission.DELETE);
                accessRequest.setGrantedBy(effectiveUserId);
                documentAccessService.grantAccess(documentId, accessRequest, effectiveUserId, ipAddress);
            }

            // Step 9: Audit Logging
            auditService.logEvent(
                    effectiveUserId,
                    documentId,
                    effectiveCaseId,
                    "DOCUMENT_UPLOADED",
                    "SUCCESS",
                    ipAddress,
                    String.format("Stored '%s' in MinIO at '%s' (Version %d, SHA-256: %s, Digital Signature: %s)",
                            sanitizedFilename, objectKey, versionNumber, originalSha256, digitalSignatureService.getSignatureAlgorithm())
            );

            return UploadDocumentResponse.builder()
                    .documentId(documentId)
                    .version(versionNumber)
                    .status("UPLOADED")
                    .sha256(originalSha256)
                    .objectKey(objectKey)
                    .originalFilename(sanitizedFilename)
                    .fileSize((long) rawBytes.length)
                    .mimeType(mimeType)
                    .caseId(effectiveCaseId)
                    .documentType(effectiveDocType)
                    .classification(effectiveClassification)
                    .signatureAlgorithm(digitalSignatureService.getSignatureAlgorithm())
                    .encryptionAlgorithm("MINIO_DIRECT_STORAGE")
                    .createdAt(document.getCreatedAt())
                    .build();

        } catch (Exception e) {
            // Handle failures correctly - clean up orphan object
            if (storedSuccessfully) {
                log.warn("Database save failed after storage upload; rolling back and deleting orphan object {}", objectKey);
                storageService.delete(objectKey);
            }
            auditService.logEvent(
                    effectiveUserId,
                    documentId,
                    effectiveCaseId,
                    "UPLOAD_FAILED",
                    "FAILURE",
                    ipAddress,
                    "Pipeline failed during storage or DB save: " + e.getMessage()
            );
            throw new RuntimeException("Upload failed during pipeline execution: " + e.getMessage(), e);
        }
    }

    /**
     * Phase 23: Upload a new version for an existing document.
     * Never overwrites v1; creates v2, v3, etc.
     */
    @Transactional
    public UploadDocumentResponse uploadNewVersion(String documentId,
                                                   MultipartFile file,
                                                   String userId,
                                                   String ipAddress) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found with ID: " + documentId));

        String effectiveUserId = requireValue(userId, "userId");
        caseAccessService.requireCaseAccess(document.getCaseId(), effectiveUserId);

        fileValidationService.validateFile(file);

        // Strict validation: Version N must match the file extension/type of the document (e.g. txt to txt, pdf to pdf)
        try {
            fileValidationService.validateVersionExtensionMatch(document.getOriginalFilename(), file.getOriginalFilename());
        } catch (com.security_management.backend.exception.InvalidFileException ex) {
            auditService.logEvent(
                    effectiveUserId,
                    documentId,
                    document.getCaseId(),
                    "VERSION_TYPE_MISMATCH",
                    "REJECTED",
                    ipAddress,
                    ex.getMessage()
            );
            throw ex;
        }

        byte[] rawBytes;
        try {
            rawBytes = file.getBytes();
        } catch (IOException e) {
            auditService.logEvent(effectiveUserId, documentId, document.getCaseId(), "VERSION_UPLOAD_FAILED", "FAILURE", ipAddress, "Could not read bytes");
            throw new RuntimeException("Could not read file content: " + e.getMessage(), e);
        }

        MalwareScanService.ScanResult scanResult = malwareScanService.scan(rawBytes);
        if (scanResult == MalwareScanService.ScanResult.INFECTED) {
            auditService.logEvent(
                    effectiveUserId,
                    documentId,
                    document.getCaseId(),
                    "MALWARE_DETECTED",
                    "REJECTED",
                    ipAddress,
                    "Version upload rejected due to detected malware/EICAR signature"
            );
            throw new MalwareDetectedException("Security alert: New version rejected because malware was detected.");
        }

        String originalSha256 = hashService.calculateSha256(rawBytes);
        String signatureBase64 = digitalSignatureService.sign(rawBytes);

        String sanitizedFilename = fileValidationService.sanitizeFilename(file.getOriginalFilename());
        String detectedMime = fileValidationService.detectMimeType(rawBytes, sanitizedFilename);

        int newVersionNumber = document.getCurrentVersion() + 1;
        String objectKey = String.format("cases/%s/documents/%s/versions/v%d/%s",
                document.getCaseId(), documentId, newVersionNumber, sanitizedFilename);

        // Store version file directly in MinIO / Local storage with native MIME type
        storageService.store(objectKey, rawBytes, detectedMime);

        // Mark previous version as SUPERSEDED
        documentVersionRepository.findTopByDocumentIdOrderByVersionNumberDesc(documentId)
                .ifPresent(prev -> {
                    prev.setStatus("SUPERSEDED");
                    documentVersionRepository.save(prev);
                });

        DocumentVersion newVersion = DocumentVersion.builder()
                .documentId(documentId)
                .versionNumber(newVersionNumber)
                .objectKey(objectKey)
                .originalSha256(originalSha256)
                .encryptionAlgorithm("MINIO_DIRECT_STORAGE")
                .encryptionNonce("N/A")
                .authenticationTag("N/A")
                .wrappedDek("DIRECT_STORAGE")
                .signature(signatureBase64)
                .signatureAlgorithm(digitalSignatureService.getSignatureAlgorithm())
                .signedBy("SECURE_DMS_SIGNER")
                .signedAt(LocalDateTime.now())
                .createdBy(effectiveUserId)
                .createdAt(LocalDateTime.now())
                .status("ACTIVE")
                .filename(sanitizedFilename)
                .mimeType(detectedMime)
                .build();

        documentVersionRepository.save(newVersion);

        // Update document's current version, filename, mimeType, and size
        document.setCurrentVersion(newVersionNumber);
        document.setOriginalFilename(sanitizedFilename);
        document.setMimeType(detectedMime);
        document.setFileSize((long) rawBytes.length);
        documentRepository.save(document);

        auditService.logEvent(
                effectiveUserId,
                documentId,
                document.getCaseId(),
                "VERSION_CREATED",
                "SUCCESS",
                ipAddress,
                String.format("Stored version %d in MinIO for '%s' at '%s' (SHA-256: %s, MIME: %s)",
                        newVersionNumber, sanitizedFilename, objectKey, originalSha256, detectedMime)
        );

        return UploadDocumentResponse.builder()
                .documentId(documentId)
                .version(newVersionNumber)
                .status("UPLOADED")
                .sha256(originalSha256)
                .objectKey(objectKey)
                .originalFilename(sanitizedFilename)
                .fileSize((long) rawBytes.length)
                .mimeType(detectedMime)
                .caseId(document.getCaseId())
                .documentType(document.getDocumentType())
                .classification(document.getClassification())
                .signatureAlgorithm(digitalSignatureService.getSignatureAlgorithm())
                .encryptionAlgorithm("MINIO_DIRECT_STORAGE")
                .createdAt(newVersion.getCreatedAt())
                .build();
    }

    private String requireValue(String value, String fieldName) {
        if (value == null || value.trim().isEmpty()) {
            throw new SecurityException("Authenticated " + fieldName + " is required.");
        }
        return value.trim();
    }
}
