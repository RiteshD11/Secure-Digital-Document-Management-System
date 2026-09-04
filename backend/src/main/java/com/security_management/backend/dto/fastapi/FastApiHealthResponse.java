package com.security_management.backend.dto.fastapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FastApiHealthResponse {

    private String status;
    private String version;
    private String service;
    private boolean reachable;
    private String message;
}
