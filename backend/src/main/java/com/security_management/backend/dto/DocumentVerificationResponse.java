package com.security_management.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentVerificationResponse {
    private String documentId;
    private Integer versionNumber;
    private String filename;
    private String caseId;
    private String malwareScanStatus;     // CLEAN / INFECTED / ERROR
    private boolean sha256Verified;       // true / false
    private String storedSha256;
    private String calculatedSha256;
    private boolean signatureValid;       // true / false
    private String signatureAlgorithm;
    private String signedBy;
    private String encryptionAlgorithm;   // AES-256-GCM
    private boolean dekProtected;         // true (wrapped by KEK)
    private String storageLocation;       // MINIO / LOCAL
    private String objectKey;
    private boolean integrityVerified;    // true / false
    private String overallStatus;         // VERIFIED / TAMPERED / FAILED
    private String message;
    private LocalDateTime verifiedAt;
}
