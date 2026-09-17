// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DocumentCustody
 * @dev Immutable ledger for document anchoring and chain of custody tracking.
 */
contract DocumentCustody {

    struct CustodyRecord {
        string documentId;
        string documentHash; // The SHA-256 hash of the pristine original file
        string currentCustodian; // e.g., "Investigating Officer (Badge 442)"
        uint256 timestamp;
        bool isAnchored;
    }

    struct CustodyTransferEvent {
        string fromCustodian;
        string toCustodian;
        string reason;
        uint256 timestamp;
    }

    // Mapping from Document ID to its current record
    mapping(string => CustodyRecord) private documentRecords;
    
    // Mapping from Document ID to a list of its custody transfer history
    mapping(string => CustodyTransferEvent[]) private custodyHistory;

    // Events that Block Explorers (like Etherscan) can pick up
    event DocumentAnchored(string indexed documentId, string documentHash, string custodian, uint256 timestamp);
    event CustodyTransferred(string indexed documentId, string fromCustodian, string toCustodian, string reason, uint256 timestamp);

    /**
     * @dev Anchors a new document hash to the blockchain.
     */
    function anchorDocument(string memory _documentId, string memory _documentHash, string memory _initialCustodian) public {
        require(!documentRecords[_documentId].isAnchored, "Document already anchored on the blockchain.");

        documentRecords[_documentId] = CustodyRecord({
            documentId: _documentId,
            documentHash: _documentHash,
            currentCustodian: _initialCustodian,
            timestamp: block.timestamp,
            isAnchored: true
        });

        emit DocumentAnchored(_documentId, _documentHash, _initialCustodian, block.timestamp);
    }

    /**
     * @dev Transfers custody of an anchored document.
     */
    function transferCustody(string memory _documentId, string memory _newCustodian, string memory _reason) public {
        require(documentRecords[_documentId].isAnchored, "Document not found on the blockchain.");

        string memory oldCustodian = documentRecords[_documentId].currentCustodian;
        documentRecords[_documentId].currentCustodian = _newCustodian;
        documentRecords[_documentId].timestamp = block.timestamp;

        custodyHistory[_documentId].push(CustodyTransferEvent({
            fromCustodian: oldCustodian,
            toCustodian: _newCustodian,
            reason: _reason,
            timestamp: block.timestamp
        }));

        emit CustodyTransferred(_documentId, oldCustodian, _newCustodian, _reason, block.timestamp);
    }

    /**
     * @dev Retrieves the current anchored record for a document.
     */
    function getDocumentRecord(string memory _documentId) public view returns (string memory, string memory, string memory, uint256, bool) {
        CustodyRecord memory record = documentRecords[_documentId];
        return (record.documentId, record.documentHash, record.currentCustodian, record.timestamp, record.isAnchored);
    }

    /**
     * @dev Retrieves the full custody transfer history for a document.
     */
    function getCustodyHistory(string memory _documentId) public view returns (CustodyTransferEvent[] memory) {
        return custodyHistory[_documentId];
    }
}
