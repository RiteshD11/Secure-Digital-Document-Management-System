package com.security_management.backend.dto;

import com.security_management.backend.entity.accessList.AccessStatus;
import com.security_management.backend.entity.accessList.DocumentPermission;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentAccessResponse {

    private String documentId;
    private Integer userId;
    private DocumentPermission permission;
    private String grantedBy;
    private LocalDateTime grantedAt;
    private LocalDateTime expiresAt;
    private AccessStatus status;
}
