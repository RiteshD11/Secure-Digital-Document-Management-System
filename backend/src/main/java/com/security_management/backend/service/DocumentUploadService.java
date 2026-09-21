package com.security_management.backend.service;

import com.security_management.backend.audit.AuditService;
import com.security_management.backend.blockchain.BlockchainRecordDto;
import com.security_management.backend.blockchain.BlockchainService;
import com.security_management.backend.blockchain.BlockchainTxResult;
import com.security_management.backend.dto.DocumentAccessGrantRequest;
import com.security_management.backend.dto.UploadDocumentResponse;
import com.security_management.backend.encryption.EncryptionService;
import com.security_management.backend.encryption.KeyManagementService;
import com.security_management.backend.entity.Document;
import com.security_management.backend.entity.DocumentVersion;
import com.security_management.backend.exception.DocumentNotFoundException;
import com.security_management.backend.exception.MalwareDetectedException;
import com.security_management.backend.hashing.DualHashResult;
import com.security_management.backend.hashing.HashService;
import com.security_management.backend.malware.MalwareScanService;
import com.security_management.backend.repository.DocumentRepository;
import com.security_management.backend.repository.DocumentVersionRepository;
import com.security_management.backend.signature.DigitalSignatureService;
import com.security_management.backend.timestamp.RFC3161Service;
import com.security_management.backend.timestamp.TSAResult;
import com.security_management.backend.storage.MinioStorageService;
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
import java.util.UUID;
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
    private final BlockchainService blockchainService;
    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final AuditService auditService;
    private final DocumentAccessService documentAccessService;
    private final CaseAccessService caseAccessService;
    private final RFC3161Service rfc3161Service;

    @Autowired
    public DocumentUploadService(FileValidationService fileValidationService,
                                 MalwareScanService malwareScanService,
                                 HashService hashService,
                                 DigitalSignatureService digitalSignatureService,
                                 KeyManagementService keyManagementService,
                                 EncryptionService encryptionService,
                                 StorageService storageService,
                                 BlockchainService blockchainService,
                                 DocumentRepository documentRepository,
                                 DocumentVersionRepository documentVersionRepository,
                                 AuditService auditService,
                                 DocumentAccessService documentAccessService,
                                 CaseAccessService caseAccessService,
                                 RFC3161Service rfc3161Service) {
        this.fileValidationService = fileValidationService;
        this.malwareScanService = malwareScanService;
        this.hashService = hashService;
        this.digitalSignatureService = digitalSignatureService;
        this.keyManagementService = keyManagementService;
        this.encryptionService = encryptionService;
        this.storageService = storageService;
        this.blockchainService = blockchainService;
        this.documentRepository = documentRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.auditService = auditService;
        this.documentAccessService = documentAccessService;
        this.caseAccessService = caseAccessService;
        this.rfc3161Service = rfc3161Service;
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
            docId = "doc_" + UUID.randomUUID().toString().replace("-", "").substring(0, 24);
        } while (documentRepository.existsById(docId));
        return docId;
    }

    /**
     * Complete upload pipeline (Steps 2 to 5):
     * 1. Validate file format & magic numbers
     * 2. Malware & Threat Scanning (ClamAV / YARA)
     * 3. Cryptographic Dual Hashing (SHA3-256 + BLAKE3)
     * 4. Digital Signature (RSA-PSS) over dual hash
     * 5. Envelope Encryption (AES-256-GCM + HSM/KEK wrapped DEK)
     * 6. Blockchain Anchoring (Hyperledger Fabric)
     * 7. Secure MinIO Storage (Ciphertext only)
     * 8. Database Metadata Indexing & Audit Trail
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

        log.info("Starting AegisVault secure upload pipeline: user='{}', case='{}', file='{}'",
                effectiveUserId, effectiveCaseId, file != null ? file.getOriginalFilename() : "null");

        // Step 2.1: File Validation (Magic byte inspection)
        fileValidationService.validateFile(file);

        byte[] rawBytes;
        try {
            rawBytes = file.getBytes();
        } catch (IOException e) {
            auditService.logEvent(effectiveUserId, null, effectiveCaseId, "UPLOAD_FAILED", "FAILURE", ipAddress, "Could not read uploaded bytes");
            throw new RuntimeException("Could not read uploaded file content: " + e.getMessage(), e);
        }

        // Step 2.2: Malware Scanning (ClamAV / EICAR / YARA)
        MalwareScanService.ScanResult scanResult = malwareScanService.scan(rawBytes);
        if (scanResult == MalwareScanService.ScanResult.INFECTED) {
            String quarantineKey = "quarantine/" + UUID.randomUUID() + "_" + fileValidationService.sanitizeFilename(file.getOriginalFilename());
            if (storageService instanceof MinioStorageService minioService) {
                try {
                    minioService.storeQuarantined(quarantineKey, rawBytes, "application/octet-stream");
                } catch (Exception ex) {
                    log.warn("Failed to store malware payload to quarantine bucket: {}", ex.getMessage());
                }
            }
            auditService.logEvent(
                    effectiveUserId,
                    null,
                    effectiveCaseId,
                    "MALWARE_DETECTED",
                    "REJECTED",
                    ipAddress,
                    "Upload aborted: Malware signature detected. Raw file preserved in isolated quarantine bucket. No processing performed."
            );
            throw new MalwareDetectedException("Security alert: Upload rejected because malware or virus signature was detected in the file.");
        }

        // Step 3.A: Dual Hashing (SHA3-256 + BLAKE3 + SHA-256)
        DualHashResult dualHash = hashService.calculateDualHash(rawBytes);

        // Step 3.B: Digital Signature (Officer RSA-PSS Private Key signing dual hash)
        String signatureBase64 = digitalSignatureService.signDualHash(dualHash);

        // Step 3.C: Envelope Encryption (AES-256-GCM DEK wrapped by KEK)
        SecretKey dek = keyManagementService.generateDek();
        EncryptionService.EncryptedResult encrypted = encryptionService.encrypt(rawBytes, dek);
        byte[] wrappedDekBytes = keyManagementService.wrapDek(dek);
        String wrappedDekBase64 = Base64.getEncoder().encodeToString(wrappedDekBytes);

        // Step 3.D: RFC-3161 Timestamping
        TSAResult tsaResult = null;
        try {
            tsaResult = rfc3161Service.getSecureTimestamp(dualHash.getSha256());
        } catch (Exception e) {
            log.warn("Failed to acquire RFC-3161 timestamp, proceeding without it.", e);
        }

        String sanitizedFilename = fileValidationService.sanitizeFilename(file.getOriginalFilename());
        String mimeType = fileValidationService.detectMimeType(rawBytes, sanitizedFilename);
        String documentId = generateUniqueDocumentId();
        int versionNumber = 1;

        // Step 4: Blockchain Anchoring (Hyperledger Fabric Smart Contract)
        BlockchainRecordDto blockchainRecord = BlockchainRecordDto.builder()
                .documentId(documentId)
                .sha3_256(dualHash.getSha3_256())
                .blake3(dualHash.getBlake3())
                .sha256(dualHash.getSha256())
                .digitalSignature(signatureBase64)
                .signatureAlgorithm(digitalSignatureService.getSignatureAlgorithm())
                .signerId(effectiveUserId)
                .caseId(effectiveCaseId)
                .classification(effectiveClassification)
                .currentCustodian(effectiveUserId)
                .timestamp(LocalDateTime.now())
                .build();

        BlockchainTxResult txResult = blockchainService.anchorDocument(blockchainRecord);

        // Step 5: Secure Storage in MinIO (Ciphertext only with unpredictable object key)
        String randomStorageId = UUID.randomUUID().toString();
        String objectKey = String.format("cases/%s/documents/%s/versions/v%d/%s.enc",
                effectiveCaseId, documentId, versionNumber, randomStorageId);

        boolean storedSuccessfully = false;
        try {
            storageService.store(objectKey, encrypted.getCiphertextWithTag(), "application/octet-stream");
            storedSuccessfully = true;

            // Save metadata & cryptographic proofs in Database
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
                    .originalSha256(dualHash.getSha256())
                    .sha3_256(dualHash.getSha3_256())
                    .blake3(dualHash.getBlake3())
                    .blockchainTxId(txResult.getTxId())
                    .blockchainBlockNumber(txResult.getBlockNumber())
                    .encryptionAlgorithm("AES-256-GCM")
                    .encryptionNonce(encrypted.getIvBase64())
                    .authenticationTag("GCM-128BIT")
                    .wrappedDek(wrappedDekBase64)
                    .signature(signatureBase64)
                    .signatureAlgorithm(digitalSignatureService.getSignatureAlgorithm())
                    .signedBy(effectiveUserId)
                    .signedAt(LocalDateTime.now())
                    .createdBy(effectiveUserId)
                    .createdAt(LocalDateTime.now())
                    .status("ACTIVE")
                    .filename(sanitizedFilename)
                    .mimeType(mimeType)
                    .tsaToken(tsaResult != null ? tsaResult.getTokenBase64() : null)
                    .tsaTimestamp(tsaResult != null ? tsaResult.getTimestamp() : null)
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

            // Audit Logging
            auditService.logEvent(
                    effectiveUserId,
                    documentId,
                    effectiveCaseId,
                    "DOCUMENT_UPLOADED",
                    "SUCCESS",
                    ipAddress,
                    String.format("Encrypted & Anchored on Hyperledger Fabric (Block #%d, Tx: %s, SHA3: %s, BLAKE3: %s, DEK: Protected by HSM)",
                            txResult.getBlockNumber(), txResult.getTxId(), dualHash.getSha3_256(), dualHash.getBlake3())
            );

            return UploadDocumentResponse.builder()
                    .documentId(documentId)
                    .version(versionNumber)
                    .status("UPLOADED")
                    .sha256(dualHash.getSha256())
                    .sha3_256(dualHash.getSha3_256())
                    .blake3(dualHash.getBlake3())
                    .blockchainTxId(txResult.getTxId())
                    .blockchainBlockNumber(txResult.getBlockNumber())
                    .objectKey(objectKey)
                    .originalFilename(sanitizedFilename)
                    .fileSize((long) rawBytes.length)
                    .mimeType(mimeType)
                    .caseId(effectiveCaseId)
                    .documentType(effectiveDocType)
                    .classification(effectiveClassification)
                    .signatureAlgorithm(digitalSignatureService.getSignatureAlgorithm())
                    .encryptionAlgorithm("AES-256-GCM")
                    .createdAt(document.getCreatedAt())
                    .tsaTimestamp(tsaResult != null ? tsaResult.getTimestamp() : null)
                    .build();

        } catch (Exception e) {
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
     * Upload a new version of an existing document with complete cryptographic & blockchain pipeline.
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
                    "Version upload rejected due to detected malware signature"
            );
            throw new MalwareDetectedException("Security alert: New version rejected because malware was detected.");
        }

        DualHashResult dualHash = hashService.calculateDualHash(rawBytes);
        String signatureBase64 = digitalSignatureService.signDualHash(dualHash);

        SecretKey dek = keyManagementService.generateDek();
        EncryptionService.EncryptedResult encrypted = encryptionService.encrypt(rawBytes, dek);
        byte[] wrappedDekBytes = keyManagementService.wrapDek(dek);
        String wrappedDekBase64 = Base64.getEncoder().encodeToString(wrappedDekBytes);

        TSAResult tsaResult = null;
        try {
            tsaResult = rfc3161Service.getSecureTimestamp(dualHash.getSha256());
        } catch (Exception e) {
            log.warn("Failed to acquire RFC-3161 timestamp, proceeding without it.", e);
        }

        String sanitizedFilename = fileValidationService.sanitizeFilename(file.getOriginalFilename());
        String detectedMime = fileValidationService.detectMimeType(rawBytes, sanitizedFilename);
        int newVersionNumber = document.getCurrentVersion() + 1;

        String randomStorageId = UUID.randomUUID().toString();
        String objectKey = String.format("cases/%s/documents/%s/versions/v%d/%s.enc",
                document.getCaseId(), documentId, newVersionNumber, randomStorageId);

        // Store version ciphertext in MinIO
        storageService.store(objectKey, encrypted.getCiphertextWithTag(), "application/octet-stream");

        // Record custody update on blockchain
        BlockchainTxResult txResult = blockchainService.recordAccess(documentId, effectiveUserId, "NEW_VERSION_UPLOADED_V" + newVersionNumber);

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
                .originalSha256(dualHash.getSha256())
                .sha3_256(dualHash.getSha3_256())
                .blake3(dualHash.getBlake3())
                .blockchainTxId(txResult != null && txResult.getTxId() != null ? txResult.getTxId() : "tx_v" + newVersionNumber)
                .blockchainBlockNumber(txResult != null && txResult.getBlockNumber() != null ? txResult.getBlockNumber() : (long) newVersionNumber)
                .encryptionAlgorithm("AES-256-GCM")
                .encryptionNonce(encrypted.getIvBase64())
                .authenticationTag("GCM-128BIT")
                .wrappedDek(wrappedDekBase64)
                .signature(signatureBase64)
                .signatureAlgorithm(digitalSignatureService.getSignatureAlgorithm())
                .signedBy(effectiveUserId)
                .signedAt(LocalDateTime.now())
                .createdBy(effectiveUserId)
                .createdAt(LocalDateTime.now())
                .status("ACTIVE")
                .filename(sanitizedFilename)
                .mimeType(detectedMime)
                .tsaToken(tsaResult != null ? tsaResult.getTokenBase64() : null)
                .tsaTimestamp(tsaResult != null ? tsaResult.getTimestamp() : null)
                .build();

        documentVersionRepository.save(newVersion);

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
                String.format("Stored version %d encrypted in MinIO for '%s' (SHA3: %s, BLAKE3: %s)",
                        newVersionNumber, sanitizedFilename, dualHash.getSha3_256(), dualHash.getBlake3())
        );

        return UploadDocumentResponse.builder()
                .documentId(documentId)
                .version(newVersionNumber)
                .status("UPLOADED")
                .sha256(dualHash.getSha256())
                .sha3_256(dualHash.getSha3_256())
                .blake3(dualHash.getBlake3())
                .blockchainTxId(newVersion.getBlockchainTxId())
                .blockchainBlockNumber(newVersion.getBlockchainBlockNumber())
                .objectKey(objectKey)
                .originalFilename(sanitizedFilename)
                .fileSize((long) rawBytes.length)
                .mimeType(detectedMime)
                .caseId(document.getCaseId())
                .documentType(document.getDocumentType())
                .classification(document.getClassification())
                .signatureAlgorithm(digitalSignatureService.getSignatureAlgorithm())
                .encryptionAlgorithm("AES-256-GCM")
                .createdAt(newVersion.getCreatedAt())
                .tsaTimestamp(tsaResult != null ? tsaResult.getTimestamp() : null)
                .build();
    }

    private String requireValue(String value, String fieldName) {
        if (value == null || value.trim().isEmpty()) {
            throw new SecurityException("Authenticated " + fieldName + " is required.");
        }
        return value.trim();
    }
}
