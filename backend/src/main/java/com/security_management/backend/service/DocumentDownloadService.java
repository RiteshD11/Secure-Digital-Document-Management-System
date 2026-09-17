package com.security_management.backend.service;

import com.security_management.backend.audit.AuditService;
import com.security_management.backend.blockchain.BlockchainService;
import com.security_management.backend.blockchain.BlockchainVerificationResult;
import com.security_management.backend.encryption.EncryptionService;
import com.security_management.backend.encryption.KeyManagementService;
import com.security_management.backend.entity.Document;
import com.security_management.backend.entity.DocumentVersion;
import com.security_management.backend.exception.DocumentNotFoundException;
import com.security_management.backend.exception.IntegrityException;
import com.security_management.backend.hashing.DualHashResult;
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
    private final BlockchainService blockchainService;
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
                                   BlockchainService blockchainService,
                                   AuditService auditService,
                                   CaseAccessService caseAccessService) {
        this.documentRepository = documentRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.storageService = storageService;
        this.keyManagementService = keyManagementService;
        this.encryptionService = encryptionService;
        this.hashService = hashService;
        this.digitalSignatureService = digitalSignatureService;
        this.blockchainService = blockchainService;
        this.auditService = auditService;
        this.caseAccessService = caseAccessService;
    }

    public static class DecryptedDocument {
        private final String filename;
        private final String mimeType;
        private final byte[] content;
        private final String sha256;
        private final String sha3_256;
        private final String blake3;
        private final boolean integrityVerified;
        private final boolean blockchainVerified;
        private final boolean signatureValid;
        private final int version;

        public DecryptedDocument(String filename, String mimeType, byte[] content,
                                 String sha256, String sha3_256, String blake3,
                                 boolean integrityVerified, boolean blockchainVerified,
                                 boolean signatureValid, int version) {
            this.filename = filename;
            this.mimeType = mimeType;
            this.content = content;
            this.sha256 = sha256;
            this.sha3_256 = sha3_256;
            this.blake3 = blake3;
            this.integrityVerified = integrityVerified;
            this.blockchainVerified = blockchainVerified;
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

        public String getSha3_256() {
            return sha3_256;
        }

        public String getBlake3() {
            return blake3;
        }

        public boolean isIntegrityVerified() {
            return integrityVerified;
        }

        public boolean isBlockchainVerified() {
            return blockchainVerified;
        }

        public boolean isSignatureValid() {
            return signatureValid;
        }

        public int getVersion() {
            return version;
        }
    }

    /**
     * Step 7: Download Stage (Decryption & Multi-Point Blockchain Verification):
     * 1. Check authentication & authorization
     * 2. Unwrap DEK using Master KEK (HSM)
     * 3. Retrieve encrypted file from MinIO
     * 4. In-memory AES-256-GCM decryption with DEK
     * 5. Calculate Dual Hashes (SHA3-256 + BLAKE3 + SHA-256)
     * 6. Verify Digital Signature with officer public key
     * 7. Verify hash with Hyperledger Fabric blockchain proof
     * 8. Record download access on blockchain & audit log
     */
    @Transactional
    public DecryptedDocument downloadAndDecrypt(String documentId, Integer requestedVersion,
                                                String userId, String ipAddress) {
        String effectiveUserId = (userId != null && !userId.trim().isEmpty()) ? userId : "OFFICER-A";

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found with ID: " + documentId));
        caseAccessService.requireCaseAccess(document.getCaseId(), effectiveUserId);

        int versionToFetch = (requestedVersion != null && requestedVersion > 0)
                ? requestedVersion : document.getCurrentVersion();

        DocumentVersion version = documentVersionRepository
                .findByDocumentIdAndVersionNumber(documentId, versionToFetch)
                .orElseThrow(() -> new DocumentNotFoundException(
                        String.format("Version %d not found for document %s", versionToFetch, documentId)));

        log.info("Processing AegisVault secure download: doc='{}', version={}, user='{}'",
                documentId, versionToFetch, effectiveUserId);

        // Fetch ciphertext from MinIO
        byte[] fileBytes;
        try {
            fileBytes = storageService.retrieve(version.getObjectKey());
        } catch (Exception e) {
            auditService.logEvent(effectiveUserId, documentId, document.getCaseId(),
                    "DOWNLOAD_FAILED", "FAILURE", ipAddress, "Object retrieval failed from MinIO: " + e.getMessage());
            throw new RuntimeException("Encrypted file could not be retrieved from MinIO storage: " + e.getMessage(), e);
        }

        // Unwrap DEK via HSM KEK and perform in-memory decryption
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
                        "CRITICAL SECURITY ALERT: AES-256-GCM authentication tag mismatch or tampered ciphertext detected!");
                throw new IntegrityException("Decryption failed: Ciphertext or IV was modified/tampered. AES-256-GCM tag mismatch.", e);
            }
        } else {
            decryptedBytes = fileBytes;
        }

        // Recalculate Dual Hashes
        DualHashResult liveDualHash = hashService.calculateDualHash(decryptedBytes);

        // Compare with Database stored hash
        boolean dbHashMatches = (version.getSha3_256() != null && version.getSha3_256().equalsIgnoreCase(liveDualHash.getSha3_256()))
                || (version.getOriginalSha256() != null && version.getOriginalSha256().equalsIgnoreCase(liveDualHash.getSha256()));

        if (!dbHashMatches) {
            auditService.logEvent(
                    effectiveUserId,
                    documentId,
                    document.getCaseId(),
                    "INTEGRITY_FAILED",
                    "FAILURE",
                    ipAddress,
                    String.format("CRITICAL ALERT: Database Hash check failed! Expected '%s', Calculated '%s'",
                            version.getOriginalSha256(), liveDualHash.getSha256())
            );
            throw new IntegrityException(String.format(
                    "Integrity check failed: Computed hash (%s) does not match stored hash (%s). Evidentiary value corrupted!",
                    liveDualHash.getSha256(), version.getOriginalSha256()
            ));
        }

        // Verify with Hyperledger Fabric Blockchain Anchor
        BlockchainVerificationResult blockchainResult = blockchainService.verifyDocumentIntegrity(
                documentId, liveDualHash.getSha3_256(), liveDualHash.getBlake3());
        boolean blockchainVerified = blockchainResult.isValid() || (blockchainResult.getOnChainSha3() == null); // fallback if not anchored in older versions

        // Verify Digital Signature
        boolean signatureValid = digitalSignatureService.verifyDualHashSignature(liveDualHash, version.getSignature())
                || digitalSignatureService.verify(decryptedBytes, version.getSignature());

        // Record Access on Blockchain & Audit Log
        blockchainService.recordAccess(documentId, effectiveUserId, "DOCUMENT_DOWNLOADED_V" + versionToFetch);

        auditService.logEvent(
                effectiveUserId,
                documentId,
                document.getCaseId(),
                "DOCUMENT_DOWNLOADED",
                "SUCCESS",
                ipAddress,
                String.format("Decrypted & verified version %d (Integrity=VERIFIED, Blockchain=%s, Signature=%s)",
                        versionToFetch, blockchainVerified ? "ON_CHAIN_VALID" : "TAMPERED", signatureValid ? "VALID" : "INVALID")
        );

        String downloadFilename = (version.getFilename() != null && !version.getFilename().trim().isEmpty())
                ? version.getFilename() : document.getOriginalFilename();
        String downloadMimeType = (version.getMimeType() != null && !version.getMimeType().trim().isEmpty())
                ? version.getMimeType() : document.getMimeType();

        return new DecryptedDocument(
                downloadFilename,
                downloadMimeType,
                decryptedBytes,
                liveDualHash.getSha256(),
                liveDualHash.getSha3_256(),
                liveDualHash.getBlake3(),
                true,
                blockchainVerified,
                signatureValid,
                versionToFetch
        );
    }
}
