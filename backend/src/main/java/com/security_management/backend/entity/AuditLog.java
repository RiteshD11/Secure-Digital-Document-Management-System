package com.security_management.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs",
       indexes = {
           @Index(name = "idx_audit_doc", columnList = "document_id"),
           @Index(name = "idx_audit_case", columnList = "case_id"),
           @Index(name = "idx_audit_time", columnList = "timestamp")
       })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", length = 64, nullable = false)
    private String userId;

    @Column(name = "document_id", length = 64)
    private String documentId;

    @Column(name = "case_id", length = 64)
    private String caseId;

    @Column(name = "action", length = 64, nullable = false)
    private String action;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "result", length = 32, nullable = false)
    private String result;

    @Column(name = "details", length = 4096)
    private String details;

    @PrePersist
    public void prePersist() {
        if (this.timestamp == null) {
            this.timestamp = LocalDateTime.now();
        }
    }
}
