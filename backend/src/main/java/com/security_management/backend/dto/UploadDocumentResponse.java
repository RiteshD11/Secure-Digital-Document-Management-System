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
public class UploadDocumentResponse {
    private String documentId;
    private Integer version;
    private String status;
    private String sha256;
    private String objectKey;
    private String originalFilename;
    private Long fileSize;
    private String mimeType;
    private String caseId;
    private String documentType;
    private String classification;
    private String signatureAlgorithm;
    private String encryptionAlgorithm;
    private LocalDateTime createdAt;
}
