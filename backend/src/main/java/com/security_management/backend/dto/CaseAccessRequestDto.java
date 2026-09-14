package com.security_management.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CaseAccessRequestDto {

    private String requestedUserId;
    private String requestedBy;
    private String reason;
}
