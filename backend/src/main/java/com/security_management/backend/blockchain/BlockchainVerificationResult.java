package com.security_management.backend.blockchain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockchainVerificationResult {
    private String documentId;
    private boolean valid;
    private String onChainSha3;
    private String onChainBlake3;
    private String onChainSha256;
    private String digitalSignature;
    private String signerId;
    private String currentCustodian;
    private String caseId;
    private Long anchoredBlockNumber;
    private String anchoredTxId;
    private LocalDateTime anchoredAt;
    private String message;
    private List<BlockchainCustodyEvent> custodyHistory;
}
