package com.security_management.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateCaseRequest {

    private String caseNumber;
    private String title;
    private String description;
    private String createdBy;
}
