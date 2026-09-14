package com.security_management.backend.entity.accessList;

import com.security_management.backend.entity.Document;
import com.security_management.backend.model.user;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "document_access")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DocumentAccess {

    @EmbeddedId
    private DocumentAccessId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("documentId")
    @JoinColumn(name = "document_id", referencedColumnName = "id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id", referencedColumnName = "userId", nullable = false)
    private user user;

    @Enumerated(EnumType.STRING)
    @Column(name = "permission", nullable = false, length = 32)
    private DocumentPermission permission;

    @Column(name = "granted_by", length = 64, nullable = false)
    private String grantedBy;

    @Column(name = "granted_at", nullable = false)
    private LocalDateTime grantedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private AccessStatus status;

    @PrePersist
    @PreUpdate
    public void applyDefaults() {
        if (this.grantedAt == null) {
            this.grantedAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = AccessStatus.ACTIVE;
        }
        if (this.permission == null) {
            this.permission = DocumentPermission.VIEW;
        }
    }
}
