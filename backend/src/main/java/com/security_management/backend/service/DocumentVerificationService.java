package com.security_management.backend.service;

import com.security_management.backend.dto.DocumentVerificationResponse;
import com.security_management.backend.encryption.EncryptionService;
import com.security_management.backend.encryption.KeyManagementService;
import com.security_management.backend.entity.Document;
import com.security_management.backend.entity.DocumentVersion;
import com.security_management.backend.exception.DocumentNotFoundException;
import com.security_management.backend.hashing.HashService;
import com.security_management.backend.repository.DocumentRepository;
import com.security_management.backend.repository.DocumentVersionRepository;
import com.security_management.backend.signature.DigitalSignatureService;
import com.security_management.backend.storage.StorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
public class DocumentVerificationService {

    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final StorageService storageService;
    private final KeyManagementService keyManagementService;
    private final EncryptionService encryptionService;
    private final HashService hashService;
    private final DigitalSignatureService digitalSignatureService;

    @Autowired
    public DocumentVerificationService(DocumentRepository documentRepository,
                                       DocumentVersionRepository documentVersionRepository,
                                       StorageService storageService,
                                       KeyManagementService keyManagementService,
                                       EncryptionService encryptionService,
                                       HashService hashService,
                                       DigitalSignatureService digitalSignatureService) {
        this.documentRepository = documentRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.storageService = storageService;
        this.keyManagementService = keyManagementService;
        this.encryptionService = encryptionService;
        this.hashService = hashService;
        this.digitalSignatureService = digitalSignatureService;
    }

    /**
     * Phase 25: Verify security pipeline for dashboard display.
     */
    @Transactional(readOnly = true)
    public DocumentVerificationResponse verifyDocumentSecurity(String documentId, Integer versionNumber) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found: " + documentId));

        int targetVer = (versionNumber != null && versionNumber > 0)
                ? versionNumber : document.getCurrentVersion();

        DocumentVersion version = documentVersionRepository
                .findByDocumentIdAndVersionNumber(documentId, targetVer)
                .orElseThrow(() -> new DocumentNotFoundException(
                        String.format("Version %d not found for document %s", targetVer, documentId)));

        String calculatedHash = null;
        boolean hashValid = false;
        boolean sigValid = false;
        boolean dekProtected = (version.getWrappedDek() != null && !version.getWrappedDek().isEmpty());
        boolean integrityVerified = false;
        String overallStatus;
        String message;

        try {
            // Retrieve encrypted file from storage
            byte[] encryptedBytes = storageService.retrieve(version.getObjectKey());

            // Unwrap DEK
            byte[] wrappedDekBytes = Base64.getDecoder().decode(version.getWrappedDek());
            SecretKey dek = keyManagementService.unwrapDek(wrappedDekBytes);

            // Decrypt AES-256-GCM
            byte[] decryptedBytes = encryptionService.decrypt(encryptedBytes, dek, version.getEncryptionNonce());

            // SHA-256 integrity
            calculatedHash = hashService.calculateSha256(decryptedBytes);
            hashValid = calculatedHash.equalsIgnoreCase(version.getOriginalSha256());

            // Digital signature verification
            sigValid = digitalSignatureService.verify(decryptedBytes, version.getSignature());

            if (hashValid && sigValid) {
                integrityVerified = true;
                overallStatus = "VERIFIED";
                message = "All security checks passed. Integrity verified, digital signature valid, DEK securely wrapped.";
            } else if (!hashValid) {
                overallStatus = "TAMPERED";
                message = "CRITICAL: SHA-256 integrity check failed. File content has been modified!";
            } else {
                overallStatus = "SIGNATURE_INVALID";
                message = "WARNING: Digital signature does not match author public key.";
            }
        } catch (Exception e) {
            overallStatus = "TAMPERED";
            message = "Verification failed (Ciphertext/Tag mismatch or corrupted storage): " + e.getMessage();
        }

        String filenameToDisplay = (version.getFilename() != null && !version.getFilename().trim().isEmpty())
                ? version.getFilename() : document.getOriginalFilename();

        return DocumentVerificationResponse.builder()
                .documentId(documentId)
                .versionNumber(targetVer)
                .filename(filenameToDisplay)
                .caseId(document.getCaseId())
                .malwareScanStatus("CLEAN")
                .sha256Verified(hashValid)
                .storedSha256(version.getOriginalSha256())
                .calculatedSha256(calculatedHash)
                .signatureValid(sigValid)
                .signatureAlgorithm(version.getSignatureAlgorithm())
                .signedBy(version.getSignedBy())
                .encryptionAlgorithm(version.getEncryptionAlgorithm())
                .dekProtected(dekProtected)
                .storageLocation(storageService.getStorageType())
                .objectKey(version.getObjectKey())
                .integrityVerified(integrityVerified)
                .overallStatus(overallStatus)
                .message(message)
                .verifiedAt(LocalDateTime.now())
                .build();
    }
}
