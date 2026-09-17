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
public class BlockchainCustodyEvent {
    private String txId;
    private Long blockNumber;
    private String eventType;
    private String actor;
    private String details;
    private LocalDateTime timestamp;
}
