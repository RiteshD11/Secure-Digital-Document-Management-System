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
public class BlockchainTxResult {
    private String txId;
    private Long blockNumber;
    private String blockHash;
    private LocalDateTime timestamp;
    private String status;
    private String message;
}
