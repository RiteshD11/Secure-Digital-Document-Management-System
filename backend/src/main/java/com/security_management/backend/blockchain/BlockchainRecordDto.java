package com.security_management.backend.blockchain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockchainRecordDto {
    private String documentId;
    private String sha3_256;
    private String blake3;
    private String sha256;
    private String digitalSignature;
    private String signatureAlgorithm;
    private String signerId;
    private String caseId;
    private String classification;
    private String currentCustodian;
    private LocalDateTime timestamp;
}
