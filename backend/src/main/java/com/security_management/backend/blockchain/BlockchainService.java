package com.security_management.backend.blockchain;

import java.util.List;

public interface BlockchainService {
    /**
     * Anchor a new document record with cryptographic proofs onto the blockchain.
     */
    BlockchainTxResult anchorDocument(BlockchainRecordDto record);

    /**
     * Verify candidate SHA3-256 and BLAKE3 hashes against the immutable on-chain record.
     */
    BlockchainVerificationResult verifyDocumentIntegrity(String documentId, String candidateSha3, String candidateBlake3);

    /**
     * Record a custody transfer event in the chain of custody.
     */
    BlockchainTxResult transferCustody(String documentId, String newCustodian, String reason, String updatedBy);

    /**
     * Record an access event (view/download/verify) onto the immutable ledger.
     */
    BlockchainTxResult recordAccess(String documentId, String accessorId, String actionType);

    /**
     * Retrieve the on-chain document record.
     */
    BlockchainRecordDto getDocumentRecord(String documentId);

    /**
     * Retrieve the entire chronological Chain of Custody for a document.
     */
    List<BlockchainCustodyEvent> getDocumentHistory(String documentId);
}
