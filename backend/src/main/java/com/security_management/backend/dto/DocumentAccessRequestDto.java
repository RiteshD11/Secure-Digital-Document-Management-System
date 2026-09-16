package com.security_management.backend.dto;

import com.security_management.backend.entity.accessList.DocumentPermission;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentAccessRequestDto {

    @NotNull(message = "permission is required")
    private DocumentPermission permission;

    private String reason;
}
