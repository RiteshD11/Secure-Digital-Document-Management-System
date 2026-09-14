package com.security_management.backend.dto.fastapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FastApiSearchResultItem {

    @JsonProperty("document_id")
    private String documentId;

    @JsonProperty("case_id")
    private String caseId;

    private Double score;

    @JsonProperty("document_type")
    private String documentType;

    private String version;

    private String text;

    private Map<String, Object> metadata;
}
