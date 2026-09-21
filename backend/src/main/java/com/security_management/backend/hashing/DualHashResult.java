package com.security_management.backend.hashing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DualHashResult {
    private String sha3_256;
    private String blake3;
    private String sha256;

    public String getCombinedHash() {
        return (sha3_256 != null ? sha3_256 : "") + ":" + (blake3 != null ? blake3 : "");
    }
}
