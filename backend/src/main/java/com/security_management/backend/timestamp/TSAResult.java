package com.security_management.backend.timestamp;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TSAResult {
    private String tokenBase64;
    private LocalDateTime timestamp;
}
