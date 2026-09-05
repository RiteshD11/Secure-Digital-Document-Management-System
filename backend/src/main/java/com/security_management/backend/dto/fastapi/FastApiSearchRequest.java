package com.security_management.backend.dto.fastapi;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FastApiSearchRequest {

    @NotBlank(message = "Search query is required")
    private String query;

    @JsonProperty("top_k")
    private Integer top_k;

    public FastApiSearchRequest(String query) {
        this.query = query;
    }

    public Integer getTopK() {
        return top_k;
    }

    public void setTopK(Integer topK) {
        this.top_k = topK;
    }
}

