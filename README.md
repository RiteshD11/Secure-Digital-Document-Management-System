# Secure Digital Document Management System

A highly secure, forensic-grade **Digital Document Management System** designed for **legal, investigative, and sensitive organizational documents**. The platform ensures document authenticity, integrity, traceability, and controlled access through cryptographic verification, digital signatures, audit trails, and secure storage mechanisms.

---

## 📌 Features

* Centralized secure document repository
* Role-Based Access Control (RBAC)
* Attribute-Based Access Control (ABAC)
* AES encryption for document protection
* SHA-256 integrity verification
* RSA-PSS digital signatures
* Immutable audit trails
* Chain of custody tracking
* Secure document preview
* AI-powered OCR extraction
* Semantic document search
* Antivirus scanning using ClamAV
* Version management with strict file-type enforcement

---

# 1. System Overview & Architecture

The system follows a **hybrid storage architecture** by separating document binaries from metadata and security proofs.

## Storage Components

### MinIO S3 Object Storage

Stores:

* Original document files
* Versioned files
* Large binary objects
* Encrypted document content

### MySQL (`securitymanagementdb`)

Stores:

* Document metadata
* S3 object references
* SHA-256 hashes
* Digital signatures
* Version information
* Audit records
* User access logs
* Chain of custody information

---

## Architecture Diagram

```text
+----------------------+
|      Web UI          |
+----------+-----------+
           |
           v
+----------------------+
| Spring Boot Backend  |
| Security Layer       |
+----------+-----------+
           |
    +------+------+
    |             |
    v             v
+--------+    +-------------+
| MySQL  |    | MinIO S3    |
| Metadata|   | Documents   |
+--------+    +-------------+
```

---

# 2. Key Security Pillars

## 2.1 Seven-Step Cryptographic Pipeline

```text
1. File Upload
      ↓
2. Apache Tika Validation
      ↓
3. ClamAV Antivirus Scan
      ↓
4. SHA-256 Hash Generation
      ↓
5. RSA-PSS Digital Signature
      ↓
6. MinIO Secure Storage
      ↓
7. Audit Logging & Chain of Custody
```

---

## 2.2 File Type Verification

The system uses:

* Apache Tika
* Magic Byte Analysis
* MIME Validation
* Strict Version Type Lock

Example:

```text
v1 → report.txt
v2 → report.txt ✅

v1 → report.txt
v2 → report.pdf ❌ Rejected
```

This prevents:

* File type spoofing
* Malware embedding
* Unauthorized format changes

---

## 2.3 Antivirus Protection

Files are scanned during upload using:

* ClamAV
* EICAR Test Signature

```text
Upload
   ↓
Scan
   ↓
Clean → Store
Infected → Reject
```

---

## 2.4 Integrity & Non-Repudiation

### SHA-256 Integrity Fingerprint

Ensures:

* No modification
* Tamper detection

Example:

```text
SHA256:
A94A8FE5CCB19BA61C4C0873D391E987982FBBD3
```

---

### RSA-PSS Digital Signatures

Provides:

* Authenticity
* Non-repudiation
* Legal proof

```text
Document
     ↓
Private Key
     ↓
Digital Signature
```

---

# 3. Architecture & Workflow Diagrams

## Upload Workflow

```text
User
  |
  v
Upload File
  |
  v
Authentication
  |
  v
RBAC / ABAC Validation
  |
  v
Apache Tika Validation
  |
  v
ClamAV Scan
  |
  v
SHA-256 Hash
  |
  v
RSA-PSS Signature
  |
  v
Store File → MinIO
  |
  v
Store Metadata → MySQL
  |
  v
Audit Log Creation
```

---

## Download & Verification Workflow

```text
User
  |
  v
Authentication
  |
  v
Permission Check
  |
  v
Retrieve Metadata
  |
  v
Download from MinIO
  |
  v
Recalculate SHA-256
  |
  v
Verify Signature
  |
  v
Integrity Valid?
     |
   Yes
     |
     v
Provide Document
```

---

# 4. Technology Stack

| Layer            | Technology                         |
| ---------------- | ---------------------------------- |
| Backend          | Java 21                            |
| Framework        | Spring Boot 4.1.1                  |
| Database         | MySQL 8.x                          |
| Object Storage   | MinIO S3                           |
| File Analysis    | Apache Tika                        |
| Antivirus        | ClamAV                             |
| Cryptography     | SHA-256, RSA-PSS                   |
| Containerization | Docker                             |
| Frontend         | HTML, CSS, JavaScript (Vanilla UI) |
| Build Tool       | Maven                              |

---

# 5. Database Schema

## documents

```sql
CREATE TABLE documents (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    document_uuid VARCHAR(100) UNIQUE,
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    current_version INT,
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## document_versions

```sql
CREATE TABLE document_versions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    document_id BIGINT,
    version_no INT,
    s3_object_key VARCHAR(255),
    sha256_hash VARCHAR(64),
    digital_signature TEXT,
    uploaded_by BIGINT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id)
        REFERENCES documents(id)
);
```

---

## audit_logs

```sql
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    action VARCHAR(100),
    document_id BIGINT,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

# 6. REST API Reference

## Authentication APIs

| Method | Endpoint            | Description   |
| ------ | ------------------- | ------------- |
| POST   | `/api/auth/login`   | User Login    |
| POST   | `/api/auth/logout`  | Logout        |
| POST   | `/api/auth/refresh` | Refresh Token |

---

## Document APIs

| Method | Endpoint                       |
| ------ | ------------------------------ |
| POST   | `/api/documents/upload`        |
| GET    | `/api/documents`               |
| GET    | `/api/documents/{id}`          |
| GET    | `/api/documents/download/{id}` |
| PUT    | `/api/documents/{id}/version`  |
| DELETE | `/api/documents/{id}`          |
| GET    | `/api/documents/search`        |
| GET    | `/api/documents/verify/{id}`   |

---

# 7. Installation & Quick Start

## Step 1: Create Database

```sql
CREATE DATABASE securitymanagementdb;
```

---

## Step 2: Configure Application

`application-secret.properties`

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/securitymanagementdb
spring.datasource.username=root
spring.datasource.password=password

minio.url=http://localhost:9000
minio.accessKey=minioadmin
minio.secretKey=minioadmin
```

---

## Step 3: Start MinIO

```bash
docker run -p 9000:9000 \
-p 9001:9001 \
-e "MINIO_ROOT_USER=minioadmin" \
-e "MINIO_ROOT_PASSWORD=minioadmin" \
minio/minio server /data --console-address ":9001"
```

---

## Step 4: Run Backend

```bash
./mvnw spring-boot:run
```

---

## Step 5: Open Frontend

```text
http://localhost:8080
```

Upload, verify, search, and securely manage documents.

---

# 8. Forensic Auditing & Tamper Testing

## MinIO Inspection

Open:

```text
http://localhost:9001
```

Inspect:

* Buckets
* Files
* Object versions

---

## MySQL Verification

```sql
SELECT * FROM documents;
SELECT * FROM document_versions;
SELECT * FROM audit_logs;
```

---

## Integrity Test

```text
1. Download document
2. Modify file
3. Re-upload
4. SHA-256 mismatch detected
5. Verification fails
```

---

# 9. Troubleshooting & FAQs

## Storage Failure

If MinIO is unavailable:

```text
Upload rejected
Metadata rollback executed
No orphan records created
```

---

## File Type Mismatch

```text
Original → .txt
New Version → .pdf

Result:
Upload Rejected
```

---

## Legal Authenticity

The system provides:

* SHA-256 Integrity Proof
* RSA-PSS Digital Signatures
* Audit Trails
* Chain of Custody Records

These collectively establish forensic and legal authenticity.

---

# Future Enhancements

* Blockchain audit verification
* Multi-factor authentication
* AI document classification
* e-Sign integration
* Distributed storage support

---

## License

This project is licensed under the MIT License.
