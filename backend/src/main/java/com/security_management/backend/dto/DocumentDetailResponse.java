package com.security_management.backend.dto;

import com.security_management.backend.entity.Document;
import com.security_management.backend.entity.DocumentVersion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentDetailResponse {
    private Document document;
    private List<DocumentVersion> versions;
}
