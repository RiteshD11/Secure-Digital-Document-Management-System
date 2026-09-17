package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// DocumentContract provides functions for managing secure documents and chain of custody
type DocumentContract struct {
	contractapi.Contract
}

// CustodyEvent represents an entry in the immutable Chain of Custody
type CustodyEvent struct {
	TxID        string `json:"tx_id"`
	EventType   string `json:"event_type"` // REGISTER, ACCESS, TRANSFER, DESTRUCTION_REQUEST
	Actor       string `json:"actor"`
	Details     string `json:"details"`
	Timestamp   string `json:"timestamp"`
	BlockNumber uint64 `json:"block_number,omitempty"`
}

// DocumentRecord represents the on-chain cryptographic anchor for a document
type DocumentRecord struct {
	DocumentID       string         `json:"document_id"`
	SHA3Hash         string         `json:"sha3_256"`
	BLAKE3Hash       string         `json:"blake3"`
	DigitalSignature string         `json:"digital_signature"`
	SignerID         string         `json:"signer_id"`
	Timestamp        string         `json:"timestamp"`
	CaseID           string         `json:"case_id"`
	Classification   string         `json:"classification"`
	CurrentCustodian string         `json:"current_custodian"`
	Status           string         `json:"status"` // ACTIVE, TRANSFERRED, DESTRUCTION_REQUESTED, ARCHIVED
	History          []CustodyEvent `json:"history"`
}

// IntegrityVerificationResult represents the result of an integrity check against the ledger
type IntegrityVerificationResult struct {
	DocumentID   string `json:"document_id"`
	IsValid      bool   `json:"is_valid"`
	OnChainSHA3  string `json:"on_chain_sha3_256"`
	OnChainBLAKE string `json:"on_chain_blake3"`
	SignerID     string `json:"signer_id"`
	Custodian    string `json:"current_custodian"`
	Message      string `json:"message"`
}

// InitLedger initializes the chaincode
func (c *DocumentContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("AegisVault Document Chaincode initialized successfully")
	return nil
}

// RegisterDocument anchors the first immutable record of a document onto the blockchain
func (c *DocumentContract) RegisterDocument(
	ctx contractapi.TransactionContextInterface,
	documentID string,
	sha3Hash string,
	blake3Hash string,
	digitalSignature string,
	signerID string,
	timestamp string,
	caseID string,
	classification string,
	currentCustodian string,
) (*DocumentRecord, error) {
	exists, err := c.DocumentExists(ctx, documentID)
	if err != nil {
		return nil, fmt.Errorf("failed to read world state: %v", err)
	}
	if exists {
		return nil, fmt.Errorf("document %s already registered on blockchain", documentID)
	}

	txID := ctx.GetStub().GetTxID()
	if timestamp == "" {
		timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	initialEvent := CustodyEvent{
		TxID:      txID,
		EventType: "DOCUMENT_REGISTERED",
		Actor:     signerID,
		Details:   fmt.Sprintf("Document anchored with SHA3-256 and BLAKE3 proofs for Case %s", caseID),
		Timestamp: timestamp,
	}

	doc := DocumentRecord{
		DocumentID:       documentID,
		SHA3Hash:         sha3Hash,
		BLAKE3Hash:       blake3Hash,
		DigitalSignature: digitalSignature,
		SignerID:         signerID,
		Timestamp:        timestamp,
		CaseID:           caseID,
		Classification:   classification,
		CurrentCustodian: currentCustodian,
		Status:           "ACTIVE",
		History:          []CustodyEvent{initialEvent},
	}

	docJSON, err := json.Marshal(doc)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(documentID, docJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to put document on ledger: %v", err)
	}

	return &doc, nil
}

// TransferCustody transfers possession/custody of the document to a new authorized entity
func (c *DocumentContract) TransferCustody(
	ctx contractapi.TransactionContextInterface,
	documentID string,
	newCustodian string,
	reason string,
	updatedBy string,
	timestamp string,
) error {
	doc, err := c.GetDocument(ctx, documentID)
	if err != nil {
		return err
	}

	txID := ctx.GetStub().GetTxID()
	if timestamp == "" {
		timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	event := CustodyEvent{
		TxID:      txID,
		EventType: "CUSTODY_TRANSFERRED",
		Actor:     updatedBy,
		Details:   fmt.Sprintf("Custody transferred from %s to %s. Reason: %s", doc.CurrentCustodian, newCustodian, reason),
		Timestamp: timestamp,
	}

	doc.CurrentCustodian = newCustodian
	doc.Status = "TRANSFERRED"
	doc.History = append(doc.History, event)

	docJSON, err := json.Marshal(doc)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(documentID, docJSON)
}

// RecordAccess records an immutable access event (view/download) on the blockchain
func (c *DocumentContract) RecordAccess(
	ctx contractapi.TransactionContextInterface,
	documentID string,
	accessorID string,
	actionType string,
	timestamp string,
) error {
	doc, err := c.GetDocument(ctx, documentID)
	if err != nil {
		return err
	}

	txID := ctx.GetStub().GetTxID()
	if timestamp == "" {
		timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	event := CustodyEvent{
		TxID:      txID,
		EventType: actionType, // e.g. "DOCUMENT_DOWNLOADED", "INTEGRITY_VERIFIED"
		Actor:     accessorID,
		Details:   fmt.Sprintf("Document accessed for %s", actionType),
		Timestamp: timestamp,
	}

	doc.History = append(doc.History, event)

	docJSON, err := json.Marshal(doc)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(documentID, docJSON)
}

// VerifyIntegrity evaluates candidate SHA3-256 and BLAKE3 hashes against the on-chain anchor
func (c *DocumentContract) VerifyIntegrity(
	ctx contractapi.TransactionContextInterface,
	documentID string,
	candidateSHA3 string,
	candidateBLAKE3 string,
) (*IntegrityVerificationResult, error) {
	doc, err := c.GetDocument(ctx, documentID)
	if err != nil {
		return nil, err
	}

	matchesSHA3 := doc.SHA3Hash == candidateSHA3
	matchesBLAKE := doc.BLAKE3Hash == candidateBLAKE3
	isValid := matchesSHA3 && matchesBLAKE

	msg := "Integrity verified: candidate cryptographic hashes match the on-chain ledger proof exactly."
	if !isValid {
		msg = "TAMPER DETECTED: candidate hash does NOT match on-chain ledger anchor!"
	}

	return &IntegrityVerificationResult{
		DocumentID:   documentID,
		IsValid:      isValid,
		OnChainSHA3:  doc.SHA3Hash,
		OnChainBLAKE: doc.BLAKE3Hash,
		SignerID:     doc.SignerID,
		Custodian:    doc.CurrentCustodian,
		Message:      msg,
	}, nil
}

// GetDocument retrieves the document record from the ledger
func (c *DocumentContract) GetDocument(ctx contractapi.TransactionContextInterface, documentID string) (*DocumentRecord, error) {
	docJSON, err := ctx.GetStub().GetState(documentID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if docJSON == nil {
		return nil, fmt.Errorf("document %s does not exist on blockchain", documentID)
	}

	var doc DocumentRecord
	err = json.Unmarshal(docJSON, &doc)
	if err != nil {
		return nil, err
	}

	return &doc, nil
}

// GetDocumentHistory returns the entire Chain of Custody history
func (c *DocumentContract) GetDocumentHistory(ctx contractapi.TransactionContextInterface, documentID string) ([]CustodyEvent, error) {
	doc, err := c.GetDocument(ctx, documentID)
	if err != nil {
		return nil, err
	}
	return doc.History, nil
}

// DocumentExists checks if a document exists on the blockchain
func (c *DocumentContract) DocumentExists(ctx contractapi.TransactionContextInterface, documentID string) (bool, error) {
	docJSON, err := ctx.GetStub().GetState(documentID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}
	return docJSON != nil, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&DocumentContract{})
	if err != nil {
		fmt.Printf("Error creating AegisVault chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting AegisVault chaincode: %v\n", err)
	}
}
