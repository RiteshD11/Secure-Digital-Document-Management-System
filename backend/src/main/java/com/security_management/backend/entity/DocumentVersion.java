package com.security_management.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "document_versions",
       indexes = {
           @Index(name = "idx_doc_ver", columnList = "document_id, version_number", unique = true)
       })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", length = 64, nullable = false)
    private String documentId;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "object_key", length = 512, nullable = false)
    private String objectKey;

    @Column(name = "original_sha256", length = 64, nullable = false)
    private String originalSha256;

    @Column(name = "sha3_256", length = 64)
    private String sha3_256;

    @Column(name = "blake3", length = 64)
    private String blake3;

    @Column(name = "blockchain_tx_id", length = 128)
    private String blockchainTxId;

    @Column(name = "blockchain_block_number")
    private Long blockchainBlockNumber;

    @Column(name = "encryption_algorithm", length = 64)
    private String encryptionAlgorithm;

    @Column(name = "encryption_nonce", length = 128)
    private String encryptionNonce;

    @Column(name = "authentication_tag", length = 128)
    private String authenticationTag;

    @Column(name = "wrapped_dek", length = 1024)
    private String wrappedDek;

    @Column(name = "signature", length = 2048, nullable = false)
    private String signature;

    @Column(name = "signature_algorithm", length = 64, nullable = false)
    private String signatureAlgorithm;

    @Column(name = "signed_by", length = 128, nullable = false)
    private String signedBy;

    @Column(name = "signed_at", nullable = false)
    private LocalDateTime signedAt;

    @Column(name = "created_by", length = 64, nullable = false)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "status", length = 32, nullable = false)
    private String status;

    @Column(name = "filename")
    private String filename;

    @Column(name = "mime_type", length = 128)
    private String mimeType;

    @Column(name = "tsa_token", columnDefinition = "TEXT")
    private String tsaToken;

    @Column(name = "tsa_timestamp")
    private LocalDateTime tsaTimestamp;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.signedAt == null) {
            this.signedAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = "ACTIVE";
        }
    }
}
