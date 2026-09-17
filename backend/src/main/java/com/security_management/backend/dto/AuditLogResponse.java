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
public class AuditLogResponse {
    private Long id;
    private String userId;
    private String documentId;
    private String caseId;
    private String action;
    private LocalDateTime timestamp;
    private String ipAddress;
    private String result;
    private String details;
}
