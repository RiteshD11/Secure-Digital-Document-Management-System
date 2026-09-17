package com.security_management.backend.service;

import com.security_management.backend.audit.AuditService;
import com.security_management.backend.encryption.EncryptionService;
import com.security_management.backend.encryption.KeyManagementService;
import com.security_management.backend.entity.Document;
import com.security_management.backend.entity.DocumentVersion;
import com.security_management.backend.exception.DocumentNotFoundException;
import com.security_management.backend.exception.IntegrityException;
import com.security_management.backend.hashing.HashService;
import com.security_management.backend.repository.DocumentRepository;
import com.security_management.backend.repository.DocumentVersionRepository;
import com.security_management.backend.signature.DigitalSignatureService;
import com.security_management.backend.storage.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.util.Base64;

@Service
public class DocumentDownloadService {

    private static final Logger log = LoggerFactory.getLogger(DocumentDownloadService.class);

    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final StorageService storageService;
    private final KeyManagementService keyManagementService;
    private final EncryptionService encryptionService;
    private final HashService hashService;
    private final DigitalSignatureService digitalSignatureService;
    private final AuditService auditService;
    private final CaseAccessService caseAccessService;

    @Autowired
    public DocumentDownloadService(DocumentRepository documentRepository,
                                   DocumentVersionRepository documentVersionRepository,
                                   StorageService storageService,
                                   KeyManagementService keyManagementService,
                                   EncryptionService encryptionService,
                                   HashService hashService,
                                   DigitalSignatureService digitalSignatureService,
                                   AuditService auditService,
                                   CaseAccessService caseAccessService) {
        this.documentRepository = documentRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.storageService = storageService;
        this.keyManagementService = keyManagementService;
        this.encryptionService = encryptionService;
        this.hashService = hashService;
        this.digitalSignatureService = digitalSignatureService;
        this.auditService = auditService;
        this.caseAccessService = caseAccessService;
    }

    public static class DecryptedDocument {
        private final String filename;
        private final String mimeType;
        private final byte[] content;
        private final String sha256;
        private final boolean integrityVerified;
        private final boolean signatureValid;
        private final int version;

        public DecryptedDocument(String filename, String mimeType, byte[] content, String sha256,
                                 boolean integrityVerified, boolean signatureValid, int version) {
            this.filename = filename;
            this.mimeType = mimeType;
            this.content = content;
            this.sha256 = sha256;
            this.integrityVerified = integrityVerified;
            this.signatureValid = signatureValid;
            this.version = version;
        }

        public String getFilename() {
            return filename;
        }

        public String getMimeType() {
            return mimeType;
        }

        public byte[] getContent() {
            return content;
        }

        public String getSha256() {
            return sha256;
        }

        public boolean isIntegrityVerified() {
            return integrityVerified;
        }

        public boolean isSignatureValid() {
            return signatureValid;
        }

        public int getVersion() {
            return version;
        }
    }

    /**
     * Complete reverse download/decryption flow matching Phases 20, 21, 22.
     */
    @Transactional
    public DecryptedDocument downloadAndDecrypt(String documentId, Integer requestedVersion,
                                                String userId, String ipAddress) {
        String effectiveUserId = (userId != null && !userId.trim().isEmpty()) ? userId : "OFFICER-A";

        // Step 1 & 2: Authentication and Authorization
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found with ID: " + documentId));
        caseAccessService.requireCaseAccess(document.getCaseId(), effectiveUserId);

        int versionToFetch = (requestedVersion != null && requestedVersion > 0)
                ? requestedVersion : document.getCurrentVersion();

        DocumentVersion version = documentVersionRepository
                .findByDocumentIdAndVersionNumber(documentId, versionToFetch)
                .orElseThrow(() -> new DocumentNotFoundException(
                        String.format("Version %d not found for document %s", versionToFetch, documentId)));

        log.info("Processing download request: doc='{}', version={}, user='{}'",
                documentId, versionToFetch, effectiveUserId);

        // Step 3: Fetch file from Storage (MinIO / Local)
        byte[] fileBytes;
        try {
            fileBytes = storageService.retrieve(version.getObjectKey());
        } catch (Exception e) {
            auditService.logEvent(effectiveUserId, documentId, document.getCaseId(),
                    "DOWNLOAD_FAILED", "FAILURE", ipAddress, "Object retrieval failed from storage: " + e.getMessage());
            throw new RuntimeException("File could not be retrieved from storage: " + e.getMessage(), e);
        }

        // Backward compatibility: decrypt only if legacy AES encrypted version
        byte[] decryptedBytes;
        if (version.getWrappedDek() != null && !version.getWrappedDek().equals("DIRECT_STORAGE")
                && version.getEncryptionNonce() != null && !version.getEncryptionNonce().equals("N/A")) {
            try {
                byte[] wrappedDekBytes = Base64.getDecoder().decode(version.getWrappedDek());
                SecretKey dek = keyManagementService.unwrapDek(wrappedDekBytes);
                decryptedBytes = encryptionService.decrypt(fileBytes, dek, version.getEncryptionNonce());
            } catch (Exception e) {
                auditService.logEvent(effectiveUserId, documentId, document.getCaseId(),
                        "INTEGRITY_FAILED", "FAILURE", ipAddress,
                        "CRITICAL SECURITY ALERT: AES-256-GCM tag mismatch or tampered ciphertext detected during decryption!");
                throw new IntegrityException("Decryption failed: Ciphertext or IV was modified/tampered. AES-256-GCM tag mismatch.", e);
            }
        } else {
            decryptedBytes = fileBytes;
        }

        // Step 4: Integrity Verification (SHA-256)
        String calculatedSha256 = hashService.calculateSha256(decryptedBytes);
        boolean hashMatches = calculatedSha256.equalsIgnoreCase(version.getOriginalSha256());

        if (!hashMatches) {
            auditService.logEvent(
                    effectiveUserId,
                    documentId,
                    document.getCaseId(),
                    "INTEGRITY_FAILED",
                    "FAILURE",
                    ipAddress,
                    String.format("CRITICAL ALERT: Integrity check failed! Stored SHA-256 '%s' != Calculated SHA-256 '%s'",
                            version.getOriginalSha256(), calculatedSha256)
            );
            throw new IntegrityException(String.format(
                    "Integrity check failed: Computed SHA-256 (%s) does not match stored hash (%s). File may have been altered.",
                    calculatedSha256, version.getOriginalSha256()
            ));
        }

        // Step 7: Phase 22 - Digital Signature Verification (RSA-PSS)
        boolean signatureValid = digitalSignatureService.verify(decryptedBytes, version.getSignature());
        if (!signatureValid) {
            auditService.logEvent(
                    effectiveUserId,
                    documentId,
                    document.getCaseId(),
                    "SIGNATURE_INVALID",
                    "FAILURE",
                    ipAddress,
                    "Digital signature verification failed for document " + documentId
            );
        } else {
            auditService.logEvent(
                    effectiveUserId,
                    documentId,
                    document.getCaseId(),
                    "SIGNATURE_VERIFIED",
                    "SUCCESS",
                    ipAddress,
                    "Digital signature verified successfully with public key."
            );
        }

        // Step 8: Audit download & decryption success
        auditService.logEvent(
                effectiveUserId,
                documentId,
                document.getCaseId(),
                "DOCUMENT_DOWNLOADED",
                "SUCCESS",
                ipAddress,
                String.format("Downloaded & Decrypted version %d (Integrity=VERIFIED, Signature=%s)",
                        versionToFetch, signatureValid ? "VALID" : "INVALID")
        );

        String downloadFilename = (version.getFilename() != null && !version.getFilename().trim().isEmpty())
                ? version.getFilename() : document.getOriginalFilename();
        String downloadMimeType = (version.getMimeType() != null && !version.getMimeType().trim().isEmpty())
                ? version.getMimeType() : document.getMimeType();

        return new DecryptedDocument(
                downloadFilename,
                downloadMimeType,
                decryptedBytes,
                calculatedSha256,
                true,
                signatureValid,
                versionToFetch
        );
    }
}
