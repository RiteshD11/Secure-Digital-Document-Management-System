package com.security_management.backend.dto;

import com.security_management.backend.entity.accessList.DocumentPermission;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentAccessGrantRequest {

    @NotNull(message = "userId is required")
    private Integer userId;

    @NotNull(message = "permission is required")
    private DocumentPermission permission;

    private LocalDateTime expiresAt;

    @NotNull(message = "grantedBy is required")
    private String grantedBy;
}
