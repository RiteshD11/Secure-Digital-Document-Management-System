package com.security_management.backend;

import com.security_management.backend.blockchain.BlockchainCustodyEvent;
import com.security_management.backend.blockchain.BlockchainRecordDto;
import com.security_management.backend.blockchain.BlockchainService;
import com.security_management.backend.blockchain.BlockchainTxResult;
import com.security_management.backend.blockchain.BlockchainVerificationResult;
import com.security_management.backend.dto.DocumentVerificationResponse;
import com.security_management.backend.dto.UploadDocumentResponse;
import com.security_management.backend.encryption.DekService;
import com.security_management.backend.encryption.EncryptionService;
import com.security_management.backend.encryption.KeyManagementService;
import com.security_management.backend.entity.Status;
import com.security_management.backend.entity.cases;
import com.security_management.backend.exception.IntegrityException;
import com.security_management.backend.hashing.DualHashResult;
import com.security_management.backend.hashing.HashService;
import com.security_management.backend.repository.CaseRepository;
import com.security_management.backend.service.CaseAccessService;
import com.security_management.backend.service.DocumentDownloadService;
import com.security_management.backend.service.DocumentUploadService;
import com.security_management.backend.service.DocumentVerificationService;
import com.security_management.backend.signature.DigitalSignatureService;
import com.security_management.backend.storage.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
public class AegisVaultSecurityAndBlockchainTests {

    @Autowired
    private HashService hashService;

    @Autowired
    private DigitalSignatureService digitalSignatureService;

    @Autowired
    private EncryptionService encryptionService;

    @Autowired
    private DekService dekService;

    @Autowired
    private KeyManagementService keyManagementService;

    @Autowired
    private BlockchainService blockchainService;

    @Autowired
    private DocumentUploadService documentUploadService;

    @Autowired
    private DocumentDownloadService documentDownloadService;

    @Autowired
    private DocumentVerificationService documentVerificationService;

    @Autowired
    private StorageService storageService;

    @Autowired
    private CaseRepository caseRepository;

    @Autowired
    private CaseAccessService caseAccessService;

    @BeforeEach
    void setupTestCase() {
        caseRepository.findByCase_number("CASE-SEC-2026").orElseGet(() -> {
            cases c = new cases();
            c.setCase_number("CASE-SEC-2026");
            c.setTitle("AegisVault Security & Blockchain Validation Case");
            c.setStatus(Status.OPEN);
            c.setCreated_by("OFFICER-TEST");
            c.setCreatedAt(LocalDateTime.now());
            c.setLastUpdate(LocalDateTime.now());
            return caseRepository.save(c);
        });
        caseAccessService.grantCaseAccess("CASE-SEC-2026", "OFFICER-TEST", "OFFICER-TEST");
        caseAccessService.grantCaseAccess("CASE-SEC-2026", "OFFICER-44", "OFFICER-TEST");
        caseAccessService.grantCaseAccess("CASE-SEC-2026", "JUDGE-BENCH-1", "OFFICER-TEST");
    }

    @Test
    @DisplayName("Step 3.A: Dual Hashing (SHA3-256 + BLAKE3) correctly computes independent cryptographic digests")
    void testDualHashing() {
        byte[] payload = "AegisVault Forensic Evidence Content 2026".getBytes(StandardCharsets.UTF_8);

        DualHashResult hashes = hashService.calculateDualHash(payload);

        assertNotNull(hashes.getSha3_256(), "SHA3-256 hash must not be null");
        assertNotNull(hashes.getBlake3(), "BLAKE3 hash must not be null");
        assertNotNull(hashes.getSha256(), "SHA-256 hash must not be null");

        assertEquals(64, hashes.getSha3_256().length(), "SHA3-256 must be 64 hex characters (256 bits)");
        assertEquals(64, hashes.getBlake3().length(), "BLAKE3 must be 64 hex characters (256 bits)");
        assertEquals(64, hashes.getSha256().length(), "SHA-256 must be 64 hex characters (256 bits)");

        // Verification check
        assertTrue(hashService.verifyDualHash(payload, hashes.getSha3_256(), hashes.getBlake3()));

        // Tamper test
        byte[] tamperedPayload = "AegisVault Forensic Evidence Content 2027".getBytes(StandardCharsets.UTF_8);
        assertFalse(hashService.verifyDualHash(tamperedPayload, hashes.getSha3_256(), hashes.getBlake3()));
    }

    @Test
    @DisplayName("Step 3.B: RSASSA-PSS Digital Signature signs dual hash and verifies non-repudiation")
    void testDigitalSignatureDualHash() {
        byte[] data = "Investigation Report Exhibit A".getBytes(StandardCharsets.UTF_8);
        DualHashResult dualHash = hashService.calculateDualHash(data);

        String signature = digitalSignatureService.signDualHash(dualHash);
        assertNotNull(signature, "Signature must be generated");
        assertFalse(signature.isEmpty());

        // Verify valid dual hash signature
        boolean isValid = digitalSignatureService.verifyDualHashSignature(dualHash, signature);
        assertTrue(isValid, "Digital signature must verify against matching dual hash");

        // Verify corrupted dual hash fails
        DualHashResult alteredHash = DualHashResult.builder()
                .sha3_256(dualHash.getSha3_256().substring(1) + "0")
                .blake3(dualHash.getBlake3())
                .build();
        assertFalse(digitalSignatureService.verifyDualHashSignature(alteredHash, signature),
                "Digital signature verification must fail on altered hash");
    }

    @Test
    @DisplayName("Step 3.C: Envelope Encryption (AES-256-GCM + KEK wrapping) prevents plain data leakage")
    void testEnvelopeEncryption() {
        byte[] plaintext = "CONFIDENTIAL POLICE INTERROGATION TRANSCRIPT".getBytes(StandardCharsets.UTF_8);

        // 1. Generate DEK
        SecretKey dek = keyManagementService.generateDek();
        assertNotNull(dek);

        // 2. Encrypt plaintext
        EncryptionService.EncryptedResult encrypted = encryptionService.encrypt(plaintext, dek);
        assertNotEquals(new String(plaintext, StandardCharsets.UTF_8),
                new String(encrypted.getCiphertextWithTag(), StandardCharsets.UTF_8));

        // 3. Wrap DEK with KEK
        byte[] wrappedDek = keyManagementService.wrapDek(dek);
        assertNotNull(wrappedDek);

        // 4. Unwrap DEK & Decrypt
        SecretKey unwrappedDek = keyManagementService.unwrapDek(wrappedDek);
        byte[] decrypted = encryptionService.decrypt(encrypted.getCiphertextWithTag(), unwrappedDek, encrypted.getIv());

        assertArrayEquals(plaintext, decrypted, "Decrypted bytes must match original plaintext exactly");
    }

    @Test
    @DisplayName("Step 4 & 6: Hyperledger Fabric Blockchain anchors proofs, checks integrity, and tracks Chain of Custody")
    void testBlockchainAnchoringAndCustody() {
        String docId = "doc_test_" + System.currentTimeMillis();
        String sha3 = "a3f5" + "0".repeat(60);
        String blake3 = "9c2d" + "0".repeat(60);
        String signature = "mockBase64Signature";

        BlockchainRecordDto record = BlockchainRecordDto.builder()
                .documentId(docId)
                .sha3_256(sha3)
                .blake3(blake3)
                .sha256("sha256" + "0".repeat(58))
                .digitalSignature(signature)
                .signerId("OFFICER-44")
                .caseId("CASE-SEC-2026")
                .classification("TOP_SECRET")
                .currentCustodian("OFFICER-44")
                .timestamp(LocalDateTime.now())
                .build();

        // 1. Anchor document
        BlockchainTxResult txResult = blockchainService.anchorDocument(record);
        assertNotNull(txResult.getTxId(), "Transaction ID must be returned");
        assertTrue(txResult.getBlockNumber() > 0, "Block number must be incremented");

        // 2. Verify on-chain integrity
        BlockchainVerificationResult verifyResult = blockchainService.verifyDocumentIntegrity(docId, sha3, blake3);
        assertTrue(verifyResult.isValid(), "On-chain integrity verification must succeed");
        assertEquals(sha3, verifyResult.getOnChainSha3());

        // 3. Transfer custody to Court
        BlockchainTxResult transferResult = blockchainService.transferCustody(
                docId, "JUDGE-BENCH-1", "Admitted as prosecution exhibit", "OFFICER-44");
        assertNotNull(transferResult.getTxId());

        // 4. Verify Chain of Custody audit history
        List<BlockchainCustodyEvent> history = blockchainService.getDocumentHistory(docId);
        assertTrue(history.size() >= 2, "History must contain both registration and custody transfer events");
        assertEquals("DOCUMENT_REGISTERED", history.get(0).getEventType());
        assertEquals("CUSTODY_TRANSFERRED", history.get(1).getEventType());
    }

    @Test
    @DisplayName("End-to-End: Full Upload -> Blockchain Anchor -> MinIO Store -> Decrypt Download -> Verify")
    void testEndToEndSecurePipeline() {
        byte[] rawContent = "Final Signed FIR Document Contents 2026".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile(
                "file", "FIR_Case_2026.pdf", "application/pdf", rawContent);

        // 1. Upload & Anchor
        UploadDocumentResponse uploadResponse = documentUploadService.uploadDocument(
                file, "CASE-SEC-2026", "FIR", "CONFIDENTIAL", "OFFICER-TEST", "127.0.0.1");

        assertNotNull(uploadResponse.getDocumentId());
        assertNotNull(uploadResponse.getBlockchainTxId(), "Blockchain TxID must be populated on upload");
        assertNotNull(uploadResponse.getSha3_256(), "SHA3-256 must be populated");
        assertNotNull(uploadResponse.getBlake3(), "BLAKE3 must be populated");
        assertEquals("AES-256-GCM", uploadResponse.getEncryptionAlgorithm());

        // 2. Multi-point Verification
        DocumentVerificationResponse verifyResponse = documentVerificationService.verifyDocumentSecurity(
                uploadResponse.getDocumentId(), 1);

        assertTrue(verifyResponse.isIntegrityVerified(), "Overall integrity must be verified");
        assertTrue(verifyResponse.isBlockchainVerified(), "Hyperledger Fabric proof must be verified");
        assertTrue(verifyResponse.isSignatureValid(), "RSA-PSS signature must be valid");
        assertEquals("VERIFIED", verifyResponse.getOverallStatus());

        // 3. Secure Download & Decryption
        DocumentDownloadService.DecryptedDocument decryptedDoc = documentDownloadService.downloadAndDecrypt(
                uploadResponse.getDocumentId(), 1, "OFFICER-TEST", "127.0.0.1");

        assertArrayEquals(rawContent, decryptedDoc.getContent(), "Decrypted content must match original bytes");
        assertTrue(decryptedDoc.isIntegrityVerified());
        assertTrue(decryptedDoc.isBlockchainVerified());
    }
}
