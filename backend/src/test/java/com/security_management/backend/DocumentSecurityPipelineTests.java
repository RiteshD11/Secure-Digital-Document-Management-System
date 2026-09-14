package com.security_management.backend;

import com.security_management.backend.audit.AuditService;
import com.security_management.backend.dto.DocumentVerificationResponse;
import com.security_management.backend.dto.UploadDocumentResponse;
import com.security_management.backend.encryption.DekService;
import com.security_management.backend.encryption.EncryptionService;
import com.security_management.backend.entity.AuditLog;
import com.security_management.backend.entity.Document;
import com.security_management.backend.entity.DocumentVersion;
import com.security_management.backend.exception.EncryptionException;
import com.security_management.backend.exception.IntegrityException;
import com.security_management.backend.exception.InvalidFileException;
import com.security_management.backend.exception.MalwareDetectedException;
import com.security_management.backend.repository.DocumentRepository;
import com.security_management.backend.repository.DocumentVersionRepository;
import com.security_management.backend.service.DocumentDownloadService;
import com.security_management.backend.service.DocumentUploadService;
import com.security_management.backend.service.DocumentVerificationService;
import com.security_management.backend.storage.StorageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
public class DocumentSecurityPipelineTests {

    @Autowired
    private DocumentUploadService documentUploadService;

    @Autowired
    private DocumentDownloadService documentDownloadService;

    @Autowired
    private DocumentVerificationService documentVerificationService;

    @Autowired
    private EncryptionService encryptionService;

    @Autowired
    private DekService dekService;

    @Autowired
    private StorageService storageService;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentVersionRepository documentVersionRepository;

    @Autowired
    private AuditService auditService;

    // Standard minimal valid PDF binary
    private static final byte[] VALID_PDF_BYTES = ("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
            "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
            "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n" +
            "xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n" +
            "trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n180\n%%EOF").getBytes(StandardCharsets.UTF_8);

    @Test
    @DisplayName("Phase 24 - Test 1: Valid PDF Upload, Encryption, Storage, and Decryption Success")
    void test1_ValidPdfUpload_Success() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "FIR_1001.pdf",
                "application/pdf",
                VALID_PDF_BYTES
        );

        UploadDocumentResponse response = documentUploadService.uploadDocument(
                file, "CASE-101", "FIR", "CONFIDENTIAL", "USER-42", "127.0.0.1"
        );

        assertNotNull(response);
        assertNotNull(response.getDocumentId());
        assertEquals(1, response.getVersion());
        assertEquals("UPLOADED", response.getStatus());
        assertNotNull(response.getSha256());
        assertEquals(64, response.getSha256().length());
        assertTrue(response.getObjectKey().contains("cases/CASE-101/documents/"));

        // Verify reverse download/decryption flow (Phase 20)
        DocumentDownloadService.DecryptedDocument decryptedDoc = documentDownloadService.downloadAndDecrypt(
                response.getDocumentId(), 1, "OFFICER-A", "127.0.0.1"
        );

        assertNotNull(decryptedDoc);
        assertArrayEquals(VALID_PDF_BYTES, decryptedDoc.getContent());
        assertTrue(decryptedDoc.isIntegrityVerified());
        assertTrue(decryptedDoc.isSignatureValid());
        assertEquals(response.getSha256(), decryptedDoc.getSha256());

        // Verify dashboard verification response (Phase 25)
        DocumentVerificationResponse verifyRes = documentVerificationService.verifyDocumentSecurity(response.getDocumentId(), 1);
        assertEquals("VERIFIED", verifyRes.getOverallStatus());
        assertTrue(verifyRes.isSha256Verified());
        assertTrue(verifyRes.isSignatureValid());
        assertTrue(verifyRes.isDekProtected());
    }

    @Test
    @DisplayName("Phase 24 - Test 2: Invalid Extension (malicious.exe) Rejected")
    void test2_InvalidExtension_Rejected() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "malicious.exe",
                "application/octet-stream",
                "MZexecutableDummyBytesHere".getBytes(StandardCharsets.UTF_8)
        );

        assertThrows(InvalidFileException.class, () -> {
            documentUploadService.uploadDocument(
                    file, "CASE-999", "EVIDENCE", "RESTRICTED", "ATTACKER-1", "10.0.0.1"
            );
        });
    }

    @Test
    @DisplayName("Phase 24 - Test 3: Malware Detection (EICAR Sample) Detected and Rejected")
    void test3_Malware_DetectedAndRejected() {
        String eicarContent = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "infected_report.txt",
                "text/plain",
                eicarContent.getBytes(StandardCharsets.US_ASCII)
        );

        assertThrows(MalwareDetectedException.class, () -> {
            documentUploadService.uploadDocument(
                    file, "CASE-666", "REPORT", "CONFIDENTIAL", "SUSPECT-9", "192.168.1.50"
            );
        });

        // Verify audit log captured MALWARE_DETECTED
        List<AuditLog> auditLogs = auditService.getAllAuditLogs();
        boolean foundMalwareAudit = auditLogs.stream()
                .anyMatch(log -> "MALWARE_DETECTED".equals(log.getAction()) && "REJECTED".equals(log.getResult()));
        assertTrue(foundMalwareAudit, "Audit log must record the malware rejection event");
    }

    @Test
    @DisplayName("Phase 24 - Test 4: Tampering with Encrypted Ciphertext Triggers Integrity Failure")
    void test4_Tampering_IntegrityFailure() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "evidence_vault.pdf",
                "application/pdf",
                VALID_PDF_BYTES
        );

        UploadDocumentResponse response = documentUploadService.uploadDocument(
                file, "CASE-202", "EVIDENCE", "CONFIDENTIAL", "USER-42", "127.0.0.1"
        );

        // Intentionally tamper with the stored ciphertext bytes in storage
        byte[] originalEncrypted = storageService.retrieve(response.getObjectKey());
        byte[] tamperedEncrypted = originalEncrypted.clone();
        int flipIndex = tamperedEncrypted.length / 2;
        tamperedEncrypted[flipIndex] = (byte) (tamperedEncrypted[flipIndex] ^ 0xFF);
        storageService.store(response.getObjectKey(), tamperedEncrypted, "application/octet-stream");

        // Attempting to download or decrypt the tampered file must fail GCM/Integrity check
        assertThrows(IntegrityException.class, () -> {
            documentDownloadService.downloadAndDecrypt(
                    response.getDocumentId(), 1, "OFFICER-B", "127.0.0.1"
            );
        });

        // Verification service must also flag as TAMPERED
        DocumentVerificationResponse verifyRes = documentVerificationService.verifyDocumentSecurity(response.getDocumentId(), 1);
        assertEquals("TAMPERED", verifyRes.getOverallStatus());
        assertFalse(verifyRes.isIntegrityVerified());
    }

    @Test
    @DisplayName("Phase 24 - Test 5: Decryption with Wrong DEK Fails")
    void test5_WrongDek_DecryptionFailure() {
        SecretKey properDek = dekService.generateDek();
        SecretKey wrongDek = dekService.generateDek();

        byte[] plain = "SuperSecretLegalBrief".getBytes(StandardCharsets.UTF_8);
        EncryptionService.EncryptedResult result = encryptionService.encrypt(plain, properDek);

        // Attempt decryption with wrong DEK
        assertThrows(EncryptionException.class, () -> {
            encryptionService.decrypt(result.getCiphertextWithTag(), wrongDek, result.getIv());
        });
    }

    @Test
    @DisplayName("Phase 24 - Test 7: Versioning (v1 and v2 Coexist Immutably with Distinct Hashes)")
    void test7_Versioning_CoexistImmutably() {
        // Step 1: Upload Version 1
        MockMultipartFile fileV1 = new MockMultipartFile(
                "file",
                "case_file.txt",
                "text/plain",
                "First investigation notes: suspect seen at 10:00 PM.".getBytes(StandardCharsets.UTF_8)
        );

        UploadDocumentResponse resV1 = documentUploadService.uploadDocument(
                fileV1, "CASE-500", "INVESTIGATION_NOTES", "CONFIDENTIAL", "OFFICER-1", "127.0.0.1"
        );
        assertEquals(1, resV1.getVersion());

        // Step 2: Upload Version 2 (modified document)
        MockMultipartFile fileV2 = new MockMultipartFile(
                "file",
                "case_file.txt",
                "text/plain",
                "Amended notes: suspect vehicle verified via surveillance.".getBytes(StandardCharsets.UTF_8)
        );

        UploadDocumentResponse resV2 = documentUploadService.uploadNewVersion(
                resV1.getDocumentId(), fileV2, "OFFICER-2", "127.0.0.1"
        );
        assertEquals(2, resV2.getVersion());

        // Verify: v1 still exists, v2 exists, v1 hash != v2 hash
        assertNotEquals(resV1.getSha256(), resV2.getSha256());

        Document doc = documentRepository.findById(resV1.getDocumentId()).orElseThrow();
        assertEquals(2, doc.getCurrentVersion());

        List<DocumentVersion> versions = documentVersionRepository.findByDocumentIdOrderByVersionNumberDesc(resV1.getDocumentId());
        assertEquals(2, versions.size());

        // Both versions can be independently downloaded and decrypted!
        DocumentDownloadService.DecryptedDocument docV1 = documentDownloadService.downloadAndDecrypt(
                resV1.getDocumentId(), 1, "OFFICER-1", "127.0.0.1"
        );
        DocumentDownloadService.DecryptedDocument docV2 = documentDownloadService.downloadAndDecrypt(
                resV1.getDocumentId(), 2, "OFFICER-2", "127.0.0.1"
        );

        assertEquals("First investigation notes: suspect seen at 10:00 PM.", new String(docV1.getContent(), StandardCharsets.UTF_8));
        assertEquals("Amended notes: suspect vehicle verified via surveillance.", new String(docV2.getContent(), StandardCharsets.UTF_8));
    }
}
