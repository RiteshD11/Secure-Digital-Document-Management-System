# Secure Digital Document Management System (Secure-DMS)

> **Enterprise-Grade Cryptographic Document Management System for Legal, Police, and Investigation Documents.**  
> Featuring Direct MinIO S3 Object Storage, MySQL Metadata Indexing, SHA-256 Integrity Verification, 2048-bit RSA-PSS Digital Signatures, Strict File Type Consistency, and an Immutable Forensic Audit Trail.

---

## 📌 Table of Contents

1. [System Overview](#-system-overview)
2. [Key Security Pillars](#-key-security-pillars)
3. [Architecture & Workflow](#-architecture--workflow)
4. [Technology Stack](#-technology-stack)
5. [Database Schema (MySQL)](#-database-schema-mysql)
6. [API Endpoints Reference](#-api-endpoints-reference)
7. [Installation & Setup Guide](#-installation--setup-guide)
8. [Running the Application](#-running-the-application)
9. [Verification & Forensic Auditing](#-verification--forensic-auditing)
10. [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🌟 System Overview

The **Secure Digital Document Management System (Secure-DMS)** is designed for law enforcement, judicial bodies, and enterprise organizations requiring strict evidence chain of custody, tamper-proofing, and verifiable non-repudiation.

### Core Architecture Highlights:
* **Storage Separation**: Unstructured binary files (PDFs, FIR texts, evidence images) are stored directly in **MinIO S3 Object Storage**, while structured metadata, cases, version trees, hash fingerprints, and cryptographic signatures are stored in **MySQL (`securitymanagementdb`)**.
* **Zero Alteration / Tamper Detection**: Every document committed to MinIO has its SHA-256 fingerprint and RSA-PSS signature stored in MySQL. If an unauthorized entity alters a file in MinIO, the system immediately flags the document as `TAMPERED` upon download or verification.
* **Strict Versioning & Type Lock**: Ensures version consistency across transitions ($v_1 \rightarrow v_2 \rightarrow v_3$). If $v_1$ is a `.txt` file, all subsequent versions must strictly be `.txt`, preventing file type confusion or format degradation.

---

## 🛡️ Key Security Pillars

```
+---------------------------------------------------------------------------------------------------+
|                                  THE 7-STEP SECURITY CHAIN                                        |
+---------------------------------------------------------------------------------------------------+
|  1. File Validation     | Size (<100MB), sanitized filename, Apache Tika magic-byte detection.     |
|  2. Antivirus Scan      | In-stream ClamAV virus scanning & EICAR test signature check.           |
|  3. SHA-256 Digest      | Original plaintext mathematical fingerprint calculation.                |
|  4. Digital Signature   | 2048-bit RSASSA-PSS digital signature generated via private key.        |
|  5. MinIO S3 Storage    | Direct object persistence with native MIME type in S3 bucket.           |
|  6. MySQL Indexing      | MinIO pointer (object_key), SHA-256, and signatures committed to MySQL.  |
|  7. Audit Logging       | Immutable forensic audit record committed with IP & timestamp.          |
+---------------------------------------------------------------------------------------------------+
```

1. **Deep File Inspection (Apache Tika)**:
   * Inspects magic bytes to prevent disguised executable scripts or malicious file extensions from being uploaded.
2. **Malware & Virus Defense**:
   * Scans file byte streams against ClamAV virus databases and blocks EICAR test strings before any file is persisted.
3. **Cryptographic Hash (SHA-256)**:
   * Computes a 64-character mathematical fingerprint of the original file content.
4. **Authenticity & Non-Repudiation (RSA-PSS 2048-bit)**:
   * Digitally signs the document with a certified private key, mathematically proving the official issuing authority.
5. **Direct S3 Object Storage**:
   * Files are stored natively in MinIO S3 buckets (`secure-dms-documents`) under structured paths:
     $$\text{cases/}\{\text{caseId}\}/\text{documents/}\{\text{documentId}\}/\text{versions/v}\{\text{version}\}/\{\text{filename}\}$$
6. **Immutable Forensic Audit Trail**:
   * Every upload, version creation, download, signature verification, and type rejection is logged with user ID, IP address, timestamp, and status.

---

## 🏛️ Architecture & Workflow

### 1. Upload Flow
```
User (Browser)
     │
     ▼ (Upload Form / + Version)
Spring Boot Backend (Port 8082)
     │
     ├── 1. Validate MIME (Apache Tika) & Version Type Match
     ├── 2. ClamAV Malware Scan
     ├── 3. Compute SHA-256 Plaintext Hash
     ├── 4. Generate 2048-bit RSA-PSS Signature
     │
     ├── 5. Stream Raw File ─────────────────────► MinIO S3 (Port 9000)
     │                                            (Stored as readable PDF/TXT/etc.)
     │
     ├── 6. Store Metadata & Object Pointer ─────► MySQL DB (Port 3306)
     │                                            (object_key, SHA-256, Signature)
     │
     └── 7. Commit Audit Log
```

### 2. Download & Verification Flow
```
User Requests Download / Verification
     │
     ▼
Spring Boot Backend
     │
     ├── 1. Read 'object_key' & 'original_sha256' from MySQL
     ├── 2. Fetch File from MinIO S3 Bucket
     ├── 3. Re-calculate SHA-256 Hash on Retrieved Content
     ├── 4. Compare: Live SHA-256 == MySQL Stored SHA-256 (Integrity Check)
     ├── 5. Verify RSA-PSS Signature with Public Key (Authenticity Check)
     │
     ├── [If Valid] ──► Deliver file to Browser with 'X-DMS-Signature-Valid: true'
     └── [If Tampered] ► Block file delivery & log CRITICAL_SECURITY_ALERT in Audit Log
```

---

## 💻 Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Backend Framework** | Spring Boot 4.1.1 (Java 21 / 26), Spring Data JPA, Spring Security, Spring Actuator |
| **Database** | MySQL 8.x (`securitymanagementdb`) with Hibernate ORM 7.x |
| **Object Storage** | MinIO S3 (Native Object Storage) / Local Storage Fallback |
| **Cryptography** | SHA-256 (Hashing), RSA-PSS (RSASSA-PSS 2048-bit Digital Signatures) |
| **Security & Scanning** | Apache Tika 2.9.2 (MIME Magic Bytes), ClamAV Antivirus Scanner |
| **Frontend** | Vanilla HTML5, Modern CSS (Glassmorphism & Cyberpunk Theme), Vanilla JavaScript (ES6+) |
| **Containerization** | Docker / Docker Compose |

---

## 🗄️ Database Schema (MySQL)

Database Name: **`securitymanagementdb`**

### 1. `documents` Table
*Stores top-level case document records:*
```sql
CREATE TABLE documents (
    id VARCHAR(64) PRIMARY KEY,              -- e.g. 'DOC-1001'
    case_id VARCHAR(64) NOT NULL,            -- e.g. 'CASE-123'
    original_filename VARCHAR(255) NOT NULL, -- e.g. 'FIR_CASE_2026_00127.txt'
    mime_type VARCHAR(128) NOT NULL,         -- e.g. 'text/plain', 'application/pdf'
    file_size BIGINT NOT NULL,               -- File size in bytes
    document_type VARCHAR(64) NOT NULL,      -- 'FIR', 'EVIDENCE', 'AFFIDAVIT', etc.
    classification VARCHAR(64) NOT NULL,     -- 'CONFIDENTIAL', 'TOP_SECRET', etc.
    uploaded_by VARCHAR(64) NOT NULL,        -- User / Officer ID
    current_version INT NOT NULL,            -- Latest version number (1, 2, ...)
    status VARCHAR(32) NOT NULL,             -- 'ACTIVE', 'ARCHIVED'
    created_at DATETIME(6) NOT NULL
);
```

### 2. `document_versions` Table
*Stores cryptographic security parameters and S3 pointers for each version:*
```sql
CREATE TABLE document_versions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL,
    version_number INT NOT NULL,
    object_key VARCHAR(512) NOT NULL,        -- Pointer to MinIO S3: 'cases/.../v1/file.pdf'
    filename VARCHAR(255),                   -- Version-specific filename
    mime_type VARCHAR(128),                  -- Native MIME format
    original_sha256 VARCHAR(64) NOT NULL,    -- 64-char SHA-256 plaintext fingerprint
    signature VARCHAR(2048) NOT NULL,        -- Base64 2048-bit RSA-PSS digital signature
    signature_algorithm VARCHAR(64) NOT NULL,-- 'RSA-PSS + SHA-256'
    signed_by VARCHAR(128) NOT NULL,         -- 'SECURE_DMS_SIGNER'
    signed_at DATETIME(6) NOT NULL,
    encryption_algorithm VARCHAR(64),        -- 'MINIO_DIRECT_STORAGE'
    status VARCHAR(32) NOT NULL,             -- 'ACTIVE' (latest) or 'SUPERSEDED'
    created_by VARCHAR(64) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT idx_doc_ver UNIQUE (document_id, version_number)
);
```

### 3. `audit_logs` Table
*Immutable audit trail for chain-of-custody compliance:*
```sql
CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME(6) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    document_id VARCHAR(64),
    case_id VARCHAR(64),
    action VARCHAR(64) NOT NULL,             -- 'DOCUMENT_UPLOADED', 'VERSION_CREATED', 'SIGNATURE_VERIFIED', etc.
    result VARCHAR(32) NOT NULL,             -- 'SUCCESS', 'REJECTED', 'FAILURE'
    ip_address VARCHAR(64),
    details VARCHAR(4096)
);
```

---

## 📡 API Endpoints Reference

### Document Management APIs

| Method | Endpoint | Description | Sample Parameters / Body |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/documents/upload` | Upload & commit new document (v1) | `multipart/form-data`: `file`, `caseId`, `documentType`, `classification`, `uploadedBy` |
| **POST** | `/api/documents/{id}/versions` | Commit new version ($v_2, v_3$) | `multipart/form-data`: `file`, `uploadedBy` *(Enforces file type consistency)* |
| **GET** | `/api/documents` | List all active documents | Query: `?caseId=CASE-123` *(optional)* |
| **GET** | `/api/documents/{id}/download` | Download & verify document | Query: `?version=1&userId=OFFICER-A` |
| **GET** | `/api/documents/{id}/verify` | On-demand cryptographic audit | Query: `?version=1` |
| **GET** | `/api/audit-logs` | Retrieve forensic audit logs | Query: `?documentId=DOC-1001` *(optional)* |

### Authentication & User APIs

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/auth/login` | Officer / User login |
| **POST** | `/auth/verifyLogin-otp` | Verify login OTP via email |
| **POST** | `/auth/register` | Register new user profile |

---

## 🚀 Installation & Setup Guide

### 1. Prerequisites
* **Java**: JDK 21 or higher
* **MySQL**: MySQL Server 8.x running locally on port `3306`
* **Docker**: For running MinIO S3 Object Storage
* **Maven**: Built-in Maven wrapper (`./mvnw`) included

---

### 2. Configure Database & Secrets

Create the MySQL database:
```sql
CREATE DATABASE IF NOT EXISTS securitymanagementdb;
```

Update your secret credentials in [`backend/src/main/resources/application-secret.properties`](file:///Users/ombichare/Desktop/SIH/backend/src/main/resources/application-secret.properties):
```properties
databaseurl=jdbc:mysql://localhost:3306/securitymanagementdb
databaseusername=root
databasepassword=your_mysql_password

jwtSecretKey=your_strong_jwt_secret_key_2026_here
mailUsername=your_email@gmail.com
mailPassword=your_email_app_password
```

---

### 3. Start MinIO S3 Object Storage

Start the MinIO Docker Compose setup:
```powershell
cd MinIO
docker compose up -d
```

* **MinIO Console URL**: [`http://localhost:9001`](http://localhost:9001)
* **Username**: `ritesh`
* **Password**: `Ritesh@minio10`
* **Bucket**: `legal-dms` (created automatically)

The Compose setup is defined in [`MinIO/docker-compose.yml`](MinIO/docker-compose.yml) and uses the persistent Docker volume `minio-data`.

---

## ⚡ Running the Application

### 1. Start Spring Boot Backend
Open a terminal in the project root:
```bash
cd backend
./mvnw spring-boot:run
```
* Backend API will start on **`http://localhost:8082`**
* Automatically initializes tables in MySQL (`securitymanagementdb`)
* Connects to MinIO and initializes the `legal-dms` bucket

### 2. Open Frontend Dashboard
Simply open [`frontend/index.html`](file:///Users/ombichare/Desktop/SIH/frontend/index.html) in your browser:
```bash
open frontend/index.html
```
*(Or serve using any local static server like `npx serve frontend` or VS Code Live Server).*

---

## 🔍 Verification & Forensic Auditing

### How to Verify That Files in MinIO are Readable & Intact:
1. **Upload a File**: Upload `sample.pdf` via the dashboard.
2. **Inspect in MinIO**: Open [`http://localhost:9001`](http://localhost:9001) $\rightarrow$ Navigate to `secure-dms-documents` bucket $\rightarrow$ You will see `cases/CASE-123/documents/DOC-1001/versions/v1/sample.pdf`. You can download or preview it directly inside MinIO!
3. **Inspect in MySQL**:
   ```sql
   SELECT document_id, version_number, object_key, original_sha256, signature_algorithm 
   FROM securitymanagementdb.document_versions;
   ```
4. **Click "Verify" in Dashboard**:
   * Backend fetches the file from MinIO, recalculates the SHA-256 hash, checks the RSA-PSS signature against the public key, and displays the **VERIFIED** badge.

---

## ❓ Troubleshooting & FAQs

#### Q1: What happens if MinIO is turned off?
* The backend contains an automatic storage fallback (`StorageConfig.java`). If MinIO is offline, documents are safely stored in the local encrypted directory (`./storage/encrypted/`) without crashing the application.

#### Q2: What happens if someone tries to upload a `.pdf` as version 2 of a `.txt` file?
* Both the Frontend UI and Backend [`FileValidationService.java`](file:///Users/ombichare/Desktop/SIH/backend/src/main/java/com/security_management/backend/validation/FileValidationService.java) reject the upload with `HTTP 400 Bad Request` and log a `VERSION_TYPE_MISMATCH` event in `audit_logs`.

#### Q3: How is a file proved to be authentic in court?
* The backend uses the certified RSA Public Key (`config/signing-public-key.der`) to mathematically verify the 2048-bit RSA-PSS signature and SHA-256 fingerprint stored in MySQL against the file bytes in MinIO.

---

## 📄 License
This project is developed for secure digital evidence and document management. All rights reserved.
