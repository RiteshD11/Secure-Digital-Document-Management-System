# Secure-Digital-Document-Management-System
Our solution is a Secure Digital Document Management System for legal and investigation documents. It provides centralized storage, RBAC/ABAC access, SHA-256 integrity checks, digital signatures, encryption, audit trails, chain of custody, secure viewing, and AI-powered OCR and semantic search for fast and reliable document management.
1)System Overview & Architecture:
Explanation of the separation between MinIO S3 Object Storage (unstructured binary documents) and MySQL (securitymanagementdb) (structured metadata, S3 pointers, and cryptographic proofs).
2)Key Security Pillars:
The 7-Step Cryptographic Pipeline breakdown.
Apache Tika Magic Bytes & Strict Version Type Lock (e.g. $v_1 \text{ (.txt)} \rightarrow v_2 \text{ (.txt)}$).
In-stream ClamAV & EICAR antivirus scanning.
SHA-256 Integrity Fingerprints vs. RSA-PSS 2048-bit Digital Signatures & Non-repudiation.
3)Architecture & Workflow Diagrams:
Complete ASCII flowcharts of both the Upload Flow and the Download / Verification Flow.
4)Technology Stack:
Complete tech breakdown (Java 21, Spring Boot 4.1.1, MySQL 8.x, MinIO S3, Apache Tika, Docker, Vanilla Web UI).
5)Database Schema (MySQL):
SQL DDL definitions for documents, document_versions, and audit_logs tables.
6)API Endpoints Reference:
Complete table of Document Management REST APIs and Authentication endpoints.
7)Step-by-Step Installation & Quickstart:
MySQL database setup, application-secret.properties configuration.
Starting MinIO S3 container via Docker.
Running the Spring Boot backend (./mvnw spring-boot:run).
Opening and interacting with the Frontend dashboard.
8)Forensic Auditing & Tamper Testing Guide:
How to inspect readable files directly in MinIO Console (http://localhost:9001), check MySQL records, and test on-demand verification.
9)Troubleshooting & FAQs:
Storage fallback behavior, type mismatch handling, and legal authenticity proof.
