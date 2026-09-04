package com.security_management.backend.dto.fastapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FastApiSearchResponse {

    @Builder.Default
    private List<FastApiSearchResultItem> results = new ArrayList<>();

    private String query;

    @JsonProperty("total_results")
    private Integer total_results;

    private String status;

    public Integer getTotalResults() {
        return total_results != null ? total_results : (results != null ? results.size() : 0);
    }

    public void setTotalResults(Integer totalResults) {
        this.total_results = totalResults;
    }
}

