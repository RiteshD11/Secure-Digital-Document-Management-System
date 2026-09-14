package com.security_management.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Document {

    @Id
    @Column(name = "id", length = 64, nullable = false, unique = true)
    private String id;

    @Column(name = "case_id", length = 64, nullable = false)
    private String caseId;

    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Column(name = "mime_type", length = 128, nullable = false)
    private String mimeType;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "document_type", length = 64, nullable = false)
    private String documentType;

    @Column(name = "classification", length = 64, nullable = false)
    private String classification;

    @Column(name = "uploaded_by", length = 64, nullable = false)
    private String uploadedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "current_version", nullable = false)
    private Integer currentVersion;

    @Column(name = "status", length = 32, nullable = false)
    private String status;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.currentVersion == null) {
            this.currentVersion = 1;
        }
        if (this.status == null) {
            this.status = "ACTIVE";
        }
    }
}
