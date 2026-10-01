# Contributing to e-SanRaksha

Welcome to **e-SanRaksha** (Secure-DMS)! Thank you for your interest in contributing to this project.

e-SanRaksha is an enterprise-grade digital document and evidence management system engineered for legal, police, forensic, and judicial workflows. The platform provides secure document ingestion, case-based organization, cryptographic integrity verification (SHA-256 / SHA3-256 / BLAKE3), 2048-bit RSA-PSS digital signatures, AES-256-GCM encryption, granular case and document access control, immutable forensic audit trails, MinIO S3 object storage, blockchain custody anchoring, and AI-assisted search and biometric face verification via an external FastAPI microservice.

Because e-SanRaksha handles sensitive legal and evidentiary data, security, strict auditability, and data integrity are central to every line of code. These contribution guidelines will help you set up your local development environment, understand existing conventions, and submit clean, secure pull requests.

---

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
- [Before You Start](#before-you-start)
- [Repository Structure](#repository-structure)
- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [1. Storage Setup (MinIO via Docker)](#1-storage-setup-minio-via-docker)
  - [2. Database Setup (MySQL)](#2-database-setup-mysql)
  - [3. Backend Setup (Spring Boot)](#3-backend-setup-spring-boot)
  - [4. Frontend Setup (Next.js Dashboard & Static UI)](#4-frontend-setup-nextjs-dashboard--static-ui)
  - [5. AI / Biometric Microservice Setup (FastAPI)](#5-ai--biometric-microservice-setup-fastapi)
  - [6. Blockchain & Smart Contracts](#6-blockchain--smart-contracts)
- [Development Workflow](#development-workflow)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Code Guidelines](#code-guidelines)
  - [Backend (Java / Spring Boot)](#backend-java--spring-boot)
  - [Frontend (Next.js / React / TypeScript)](#frontend-nextjs--react--typescript)
  - [AI Service Integration (FastAPI Proxy)](#ai-service-integration-fastapi-proxy)
  - [Blockchain & Smart Contracts (Solidity / Chaincode)](#blockchain--smart-contracts-solidity--chaincode)
- [Security Guidelines](#security-guidelines)
- [Testing](#testing)
- [Pull Requests](#pull-requests)
- [Pull Request Checklist](#pull-request-checklist)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)
- [Questions and Discussions](#questions-and-discussions)
- [Review Process](#review-process)
- [Security-Sensitive Changes](#security-sensitive-changes)
- [Thank You](#thank-you)

---

## Ways to Contribute

Contributions are welcome across all components of the repository:

- **Bug Fixes**: Resolving issues in file streaming, hash verification, signature validation, UI state handling, or access approval flows.
- **Security Hardening**: Strengthening access authorization, input sanitization, file MIME inspection, key management, and cryptographic workflows.
- **Features**: Enhancing case management, version history comparison, audit log querying, or custody transfer flows.
- **AI & Search Integration**: Improving semantic document retrieval, OCR processing, query ranking, or biometric verification proxy handlers.
- **UI/UX Refinements**: Improving accessibility, responsive layouts, clear cryptographic verification states, and audit log visualization in the Next.js frontend.
- **Testing**: Expanding unit, slice, and integration tests across Spring Boot services and frontend components.
- **Documentation**: Keeping API documentation, architectural diagrams, setup guides, and troubleshooting steps accurate and up to date.
- **Code Review**: Reviewing community pull requests for correctness, performance, and security compliance.

---

## Before You Start

Before starting development on a change:

1. **Review Existing Documentation**: Read [`README.md`](README.md) and [`PROJECT_DOCUMENTATION.md`](PROJECT_DOCUMENTATION.md) to understand system architecture, data models, and cryptographic pipelines.
2. **Search Existing Issues & PRs**: Verify that no one else is already working on or discussing the same bug or feature.
3. **Open an Issue for Large Changes**: For significant architectural proposals, database schema changes, or security workflow redesigns, open an issue first to discuss your approach with maintainers before implementing code.
4. **Avoid Duplicating Existing Work**: Check the existing codebase to ensure reusable services, utilities, or components do not already exist.

---

## Repository Structure

The repository is organized into distinct functional layers:

```
e-SanRaksha/
├── .env.example             # Root template for environment variables
├── MinIO/                   # Docker Compose configuration for MinIO S3 object storage
│   └── docker-compose.yml   # MinIO server and automated bucket initialization (legal-dms)
├── backend/                 # Spring Boot 4.1.1 (Java 21) REST API application
│   ├── config/              # Public and private RSA signing keys (.der)
│   ├── src/main/java/       # Controllers, services, JPA repositories, security, crypto pipelines
│   ├── src/main/resources/  # application.yml, application.properties, application-secret.properties
│   ├── src/test/java/       # JUnit 5 backend test suites
│   ├── mvnw / mvnw.cmd      # Maven wrappers
│   └── pom.xml              # Maven dependencies & build configuration
├── Frontend/                # Next.js 16 + React 19 + Tailwind CSS 4 frontend
│   ├── app/                 # Next.js App Router (page.tsx, layout.tsx, globals.css)
│   ├── components/          # Reusable React components (e.g., SecureDocumentViewer.tsx)
│   ├── lib/                 # Utility helpers (cn, shadcn configs)
│   ├── index.html           # Legacy / standalone static dashboard fallback
│   ├── js/ & css/           # Static script (app.js) and stylesheet assets
│   └── package.json         # Frontend scripts and dependencies
├── blockchain/              # Blockchain contracts and chaincode
│   ├── contracts/           # DocumentCustody.sol (Ethereum / EVM Solidity contract)
│   └── chaincode/           # document_chaincode.go (Hyperledger Fabric Go chaincode)
├── ML/                      # Directory reserved for ML / AI model assets
├── README.md                # System overview, security pillars, and setup instructions
└── PROJECT_DOCUMENTATION.md # Detailed system specifications and architectural analysis
```

---

## Development Setup

Follow these steps to set up your local development environment. All commands use the actual build tools and configuration files present in this repository.

### Prerequisites

Ensure you have the following installed on your development machine:

- **Java Development Kit (JDK)**: Version 21 or higher
- **Node.js & npm / pnpm**: Node.js 18+ (Node 20+ recommended). The frontend includes `package-lock.json` (npm) and `pnpm-lock.yaml` (pnpm).
- **Docker & Docker Compose**: Required for running the local MinIO S3 object storage service.
- **MySQL Server 8.x**: Required for the persistent metadata database (or use the built-in development H2 fallback).
- **Git**: For version control.

---

### Environment Configuration

Copy the sample environment variables and configure your local settings:

1. In the repository root, inspect `.env.example`:
   ```bash
   cp .env.example .env
   ```

2. For the backend, credentials can be supplied via environment variables or configured in `backend/src/main/resources/application-secret.properties` (which is git-ignored):
   ```properties
   databaseurl=jdbc:mysql://localhost:3306/securitymanagementdb
   databaseusername=root
   databasepassword=your_mysql_password

   jwtSecretKey=your_strong_256_bit_jwt_secret_key_here

   mailUsername=your_smtp_username
   mailPassword=your_smtp_password
   mailFrom=your_verified_sender_address

   # MinIO Credentials (matching MinIO docker-compose)
   minioUsername=ritesh
   minioPassword=Ritesh@minio10

   # FastAPI AI service (if connecting to an external instance)
   fastapiApiKey=your_fastapi_key_if_applicable
   ```

> [!WARNING]
> Never commit real passwords, secret keys, or private credentials to Git. Ensure `application-secret.properties` and local `.env` files remain ignored.

---

### 1. Storage Setup (MinIO via Docker)

e-SanRaksha uses MinIO S3 object storage for binary files. A pre-configured Docker Compose file is located in the `MinIO/` directory:

```bash
cd MinIO
docker compose up -d
```

- **MinIO S3 API**: `http://localhost:9000`
- **MinIO Web Console**: `http://localhost:9001`
- **Root User**: `ritesh` (default in `MinIO/docker-compose.yml`)
- **Root Password**: `Ritesh@minio10`
- **Default Bucket**: `legal-dms` (created automatically by the `minio-init` service)

*Note: The backend also contains an automated local storage fallback (`./storage/encrypted/`) via `StorageConfig.java` if MinIO is unavailable during local development.*

---

### 2. Database Setup (MySQL)

Create the MySQL database matching your configuration:

```sql
CREATE DATABASE IF NOT EXISTS securitymanagementdb;
```

Hibernate is configured with `spring.jpa.hibernate.ddl-auto=update`, which will automatically generate and update tables (`documents`, `document_versions`, `audit_logs`, `cases`, `case_access_records`, etc.) on backend startup.

*Alternative*: If running without MySQL, the default `dev` profile in `backend/src/main/resources/application.yml` provides a zero-setup persistent H2 database (`./data/secure_dms`).

---

### 3. Backend Setup (Spring Boot)

Navigate to the `backend` directory and run using the included Maven wrapper:

**On Linux / macOS:**
```bash
cd backend
./mvnw clean compile
./mvnw spring-boot:run
```

**On Windows (PowerShell):**
```powershell
cd backend
.\mvnw.cmd clean compile
.\mvnw.cmd spring-boot:run
```

- The backend REST API will start on **`http://localhost:8082`**.
- It connects to MySQL (or H2 in dev mode) and initializes connections to MinIO and cryptographic key providers.

---

### 4. Frontend Setup (Next.js Dashboard & Static UI)

The repository provides two frontend options:

#### A. Next.js Dashboard (Primary)
The modern client dashboard is built with Next.js 16, React 19, and Tailwind CSS 4:

```bash
cd Frontend
npm install
npm run dev
```
*(Or using pnpm: `pnpm install && pnpm dev`)*

Open [http://localhost:3000](http://localhost:3000) in your browser.

Available npm scripts in `Frontend/package.json`:
- `npm run dev` - Starts the Next.js development server
- `npm run build` - Builds the application for production
- `npm run start` - Starts the built production server

#### B. Standalone Static Dashboard (Alternative)
The `Frontend` folder also contains a standalone `index.html` with vanilla JS (`Frontend/js/app.js`) and CSS (`Frontend/css/styles.css`). You can serve it using any local static HTTP server:

```bash
# Example using npx serve or python http.server
npx serve Frontend
# or open Frontend/index.html directly in a browser
```

---

### 5. AI / Biometric Microservice Setup (FastAPI)

The backend interacts with an AI/biometric service through `FastApiServiceImpl.java` using REST endpoints (for semantic search, document indexing, and face authentication).

- The backend configuration specifies `fastapi.base.url` (defaults to `http://localhost:8000` or an external IP in `application.properties`).
- The repository contains an `ML/` directory intended for model assets, but does not currently include a standalone Python FastAPI service runner in the codebase.
- If you are running an external FastAPI instance locally, set `FASTAPI_BASE_URL=http://localhost:8000` in your environment or `application-secret.properties`.
- If the AI microservice is offline, the backend gracefully handles connection timeouts and returns appropriate error responses without crashing document operations.

---

### 6. Blockchain & Smart Contracts

The repository includes smart contracts in the `blockchain/` folder:

- **EVM Contract**: `blockchain/contracts/DocumentCustody.sol` (Solidity `^0.8.19`) for document hash anchoring and custody transfers.
- **Hyperledger Fabric Chaincode**: `blockchain/chaincode/document_chaincode.go` (Go chaincode using `contractapi`).

The backend integrates with EVM testnets (e.g., Ethereum Sepolia) via Web3j (`blockchain.ethereum.rpc-url` in `application.properties`). Local blockchain node deployment is optional; mock or simulated ledger fallback modes are handled in the service layer when offline.

---

## Development Workflow

Follow this standard development flow for all contributions:

```
Issue / Discussion
       │
       ▼
Create Feature Branch (e.g., feature/add-preview-modal)
       │
       ▼
Local Implementation & Code Formatting
       │
       ▼
Local Verification & Automated Tests (./mvnw test)
       │
       ▼
Self-Review (Check for leaked secrets, dead code, debug logs)
       │
       ▼
Commit with Conventional Messages (git commit -m "feat: ...")
       │
       ▼
Push to Remote Fork / Branch
       │
       ▼
Open Pull Request with Detailed Context
       │
       ▼
Code Review & Maintainer Feedback
       │
       ▼
Merge
```

---

## Branch Naming

We recommend using clear, lowercase branch names with hyphens and standard prefixes:

- `feature/<name>` – New functionality or enhancement
- `fix/<name>` – Bug fix
- `security/<name>` – Security patch, cryptographic update, or vulnerability remediation
- `docs/<name>` – Documentation updates or corrections
- `refactor/<name>` – Code restructuring without functional changes
- `test/<name>` – Adding or improving tests

### Examples:
- `feature/case-retention-policy`
- `fix/type-consistency-validation`
- `security/session-timeout-hardening`
- `docs/clarify-minio-setup`
- `test/document-signature-verification`

---

## Commit Messages

We recommend following the [Conventional Commits](https://www.conventionalcommits.org/) specification (`<type>: <description>`):

### Recommended Types:
- `feat:` A new feature or capability
- `fix:` A bug fix
- `security:` A security fix or hardening improvement
- `docs:` Documentation-only changes
- `refactor:` Code changes that neither fix a bug nor add a feature
- `test:` Adding or correcting tests
- `chore:` Build scripts, dependency updates, or tool configurations

### Examples:
- `feat: add document version history comparison`
- `fix: enforce strict document download permission check`
- `security: improve RSA-PSS signature verification error handling`
- `docs: update setup instructions for MinIO Docker Compose`
- `test: add unit tests for FileValidationService MIME checks`
- `refactor: clean up CaseAccessController response mappings`

---

## Code Guidelines

### Backend (Java / Spring Boot)

- **Architecture**: Adhere to the established layered pattern:
  - `controller`: Input mapping, HTTP status codes, request validation (`@Valid`).
  - `service`: Core business rules, crypto pipelines, custody workflows.
  - `repository`: Spring Data JPA interfaces.
  - `entity`: JPA entities with appropriate constraints and indices.
- **Java Standards**: Target Java 21 LTS features. Utilize Lombok annotations (`@Getter`, `@Setter`, `@RequiredArgsConstructor`) consistently where already established.
- **Input Validation**: Validate all inputs at the API layer. Use Jakarta Validation (`@NotNull`, `@Size`, etc.) and sanitize filenames.
- **File & MIME Handling**: Always route file uploads through `FileValidationService` (Apache Tika magic byte checks). Never trust the client-provided `Content-Type` header alone.
- **Exception Handling**: Use centralized exception handling (`@ControllerAdvice` / `ResponseEntityExceptionHandler`). Avoid dumping raw stack traces or internal database errors to clients.
- **Audit Logging**: Any action that reads, downloads, uploads, modifies, or fails access to a document or case **must** log an audit record via `AuditService`.
- **Secrets & Keys**: Never hardcode credentials, private keys, or master encryption keys. Access them via `@Value` or Spring configuration properties.

### Frontend (Next.js / React / TypeScript)

- **Framework Conventions**: The frontend uses Next.js 16 (App Router) with React 19. Ensure compliance with Next.js App Router rules.
- **TypeScript**: Use strict TypeScript typing where possible. Avoid unnecessary `any` types.
- **Component Design**: Place reusable UI components in `Frontend/components/` and utility helpers in `Frontend/lib/`.
- **Styling**: Follow existing Tailwind CSS styling patterns. Avoid inline styles when Tailwind utilities are available.
- **Security States**: Security-related indicators (e.g., `VERIFIED`, `TAMPERED`, `PENDING_APPROVAL`, `REVOKED`) must be unambiguous and clearly visible to the user.
- **Token Handling**: Store JWT authentication tokens securely and attach them to API requests using the `Authorization: Bearer <token>` header.

### AI Service Integration (FastAPI Proxy)

- **Authorization Isolation**: AI and semantic search functionalities must never bypass case or document authorization checks.
- **Filtered Retrieval**: Document search results returned from the FastAPI microservice must be filtered against the requesting user's active permissions before being returned to the UI.
- **Failure Resilience**: The backend must handle external FastAPI timeouts and connection errors gracefully.
- **Data Privacy**: Do not send unencrypted sensitive document payloads to external endpoints unless explicitly configured for indexing.

### Blockchain & Smart Contracts (Solidity / Chaincode)

- **Solidity (`blockchain/contracts/`)**: Adhere to Solidity `^0.8.19` best practices. Keep functions deterministic, emit events for indexers, and ensure access restriction checks are explicit.
- **Chaincode (`blockchain/chaincode/`)**: Use standard Fabric Go contract API conventions. Ensure ledger keys are structured logically.
- **Off-Chain Principle**: Store only cryptographic fingerprints (hashes, signer IDs, timestamps, custody transfer metadata) on the blockchain. **Never store raw document binaries or sensitive personal identifiable information (PII) on-chain.**

---

## Security Guidelines

Because e-SanRaksha is designed for legal, forensic, and law-enforcement evidence management, security is paramount. Contributors must exercise extreme caution when modifying security-sensitive components:

### Critical Security Areas:
- User Authentication & OTP verification (`authRequests.java`, `authUtl.java`, `jwtFilter.java`)
- Case & Document Access Control (`CaseAccessController.java`, `AccessControlService.java`)
- Cryptographic Hashing (`HashService.java` - SHA-256, SHA3-256, BLAKE3)
- Digital Signatures (`DigitalSignatureService.java` - RSA-PSS 2048-bit)
- Document Encryption (`AES-256-GCM` with wrapped DEKs)
- File Upload Validation (`FileValidationService.java` - Apache Tika magic bytes)
- Antivirus & Malware Defense (`MalwareScanService.java` - ClamAV / EICAR test checks)
- Audit Logging (`AuditService.java` - immutable forensic records)
- Storage Access & Download Integrity (`MinioStorageService.java`, `LocalStorageService.java`)

### Mandatory Rules:
1. **DO NOT COMMIT SECRETS**: Never commit passwords, private keys (`.der`, `.pem`), JWT secrets, API tokens, database connection strings, or SMTP credentials.
2. **DO NOT USE REAL EVIDENCE**: Never use real legal, police, or investigation documents for local development or testing. Use synthetic test files or standard benign test strings (e.g., EICAR test string for malware testing).
3. **DO NOT BYPASS CHECKS**: Never disable authentication, signature validation, or file validation simply to make local development faster.
4. **DO NOT LOG SENSITIVE CONTENT**: Never print document binary content, raw plaintext passwords, or private keys to application logs.
5. **NEVER EXPOSE OBJECT STORAGE DIRECTLY**: Documents in MinIO must be accessed exclusively through the authenticated, integrity-checked backend download service.

### Reporting Security Vulnerabilities

If you discover a security vulnerability or exploit in e-SanRaksha:

- **DO NOT open a public GitHub issue.**
- Report the vulnerability privately to the project maintainers or repository administrators.
- Provide detailed steps to reproduce the issue, an assessment of potential impact, and suggested mitigation if available.

---

## Testing

Contributors should verify their changes locally before submitting a pull request.

### Backend Testing

The backend includes a JUnit 5 test suite covering cryptographic pipelines, access control, and API integrations:

```bash
cd backend

# Run the complete test suite
./mvnw test

# On Windows:
.\mvnw.cmd test

# Run a specific test class (e.g., DocumentSecurityPipelineTests)
./mvnw test -Dtest=DocumentSecurityPipelineTests
```

Key existing test suites in `backend/src/test/java/com/security_management/backend/`:
- `DocumentSecurityPipelineTests`: Validates file validation, hashing, digital signatures, and encryption.
- `AccessControlServiceTests`: Validates case and document permission enforcement.
- `AegisVaultSecurityAndBlockchainTests`: Validates security workflows and blockchain custody record handling.
- `FastApiServiceTests`: Validates URL normalization, timeout handling, and mock REST interactions with the FastAPI service.
- `RegisterServiceTests`: Validates user registration workflows.

### Manual Verification

For frontend or end-to-end changes, manually verify:
1. Document upload with valid and invalid MIME types (e.g., attempt renaming `.exe` to `.pdf`).
2. Document versioning: ensure uploading a different file type for version 2 is rejected (`VERSION_TYPE_MISMATCH`).
3. Download and cryptographic verification: ensure the verified status badge displays properly.
4. Audit log entry generation in `audit_logs` table.

*Note: Automated frontend testing (e.g., Jest/Playwright) is not currently configured in `Frontend/package.json`. Manual UI verification is expected for frontend contributions.*

---

## Pull Requests

When creating a pull request, ensure it includes clear, structured context for reviewers:

### PR Structure:

1. **Summary**: A concise explanation of the changes introduced.
2. **Motivation**: Why is this change necessary? Link to relevant issues (e.g., `Closes #12`).
3. **Testing Performed**: Detail the automated tests executed (`./mvnw test`) and manual verification steps taken.
4. **Security Impact**: Explicitly describe any impact on:
   - Authentication or token validation
   - Document or case permissions
   - Cryptographic hashing or digital signatures
   - Object storage paths or access URLs
   - Audit logging compliance
   - AI service proxy interactions

### Best Practices:
- Keep pull requests focused on a single concern. Avoid bundling unrelated fixes or reformatting.
- Ensure all debug logs (`System.out.println`, `console.log`) and temporary code are removed.
- Update relevant documentation if endpoints, environment variables, or workflows are altered.
- Respond promptly and constructively to review feedback.

---

## Pull Request Checklist

Before submitting your pull request, check off each item:

- [ ] I have read the [README.md](README.md) and these Contribution Guidelines.
- [ ] My changes are focused, minimal, and directly address the problem or feature.
- [ ] I have verified that no credentials, passwords, JWT secrets, private keys, or sensitive files are included in the commits.
- [ ] I have run backend unit tests (`./mvnw test`) and all tests pass.
- [ ] I have manually verified the affected UI or API endpoints where appropriate.
- [ ] I have considered the security implications of my changes (authorization, input validation, audit logging).
- [ ] I have updated corresponding documentation or environment variable examples if applicable.

---

## Reporting Bugs

Well-structured bug reports help maintainers diagnose and resolve issues efficiently.

### What to Include:
1. **Clear Title**: Brief summary of the bug.
2. **Environment Details**: OS, JDK version, Node.js version, browser, database type (MySQL or H2).
3. **Steps to Reproduce**: Exact sequential steps to trigger the bug.
4. **Expected Behavior**: What should happen.
5. **Actual Behavior**: What actually happened.
6. **Logs & Error Messages**: Sanitized server logs or browser console errors (ensure no passwords or tokens are visible).
7. **Screenshots**: If the issue involves UI rendering or verification badges.

### Example Bug Report:

```markdown
**Title**: Document download fails with 403 when user has active case-level VIEW permission

**Environment**:
- OS: Windows 11
- Backend: Java 21 / Spring Boot 4.1.1
- Frontend: Next.js 16.3.3
- Storage: MinIO (Docker)

**Steps to Reproduce**:
1. Login as user `OFFICER_442`.
2. Navigate to Case `CASE-2026-0091`.
3. Case access list shows `OFFICER_442` with status `APPROVED`.
4. Click "Download" on document `DOC-1004` (v1).

**Expected Behavior**:
The file should be retrieved from MinIO, integrity verified against MySQL SHA-256, and delivered with HTTP 200.

**Actual Behavior**:
The backend returns HTTP 403 Forbidden with message "Access Denied: No active document grant".

**Relevant Log**:
```
WARN c.s.b.c.CaseAccessController : Access denied for user OFFICER_442 on document DOC-1004
```
```

---

## Feature Requests

To request a new feature or improvement:

1. **Check Existing Requests**: Ensure the feature has not already been proposed.
2. **Describe the Problem**: Explain the user story or operational challenge this feature solves.
3. **Proposed Solution**: Outline how the feature should behave and how it integrates into the existing architecture.
4. **Affected Components**: Identify which layers are impacted (Backend, Frontend, MinIO, Blockchain, FastAPI, Database).
5. **Security & Privacy Considerations**: Note any access control, audit, or cryptographic impacts.

---

## Questions and Discussions

Before asking a question, please consult:

1. [`README.md`](README.md) – System overview, architectural diagrams, and setup instructions.
2. [`PROJECT_DOCUMENTATION.md`](PROJECT_DOCUMENTATION.md) – Detailed system specifications and component breakdown.
3. Existing GitHub Issues and Pull Requests.

If you still need help, open a discussion or question issue describing your setup and the specific challenge you are encountering.

---

## Review Process

Every pull request will be reviewed by repository maintainers. Reviews typically assess:

- **Correctness**: Does the implementation solve the problem without introducing regressions?
- **Security**: Are permissions properly enforced? Is input validated? Are audit logs created?
- **Code Quality & Style**: Does the code match existing Spring Boot and Next.js architectural patterns?
- **Test Coverage**: Are changes covered by appropriate unit or slice tests?
- **Documentation**: Are changes reflected in documentation where necessary?

*Note: As an open-source project and hackathon engineering initiative, maintainers review pull requests as time permits. Please be patient while awaiting feedback.*

---

## Security-Sensitive Changes

Any pull request that touches the following components is subject to rigorous, dedicated security review:

- Authentication, token issuance, and password/OTP verification
- Role-based or case/document access control evaluation
- Cryptographic hashing (SHA-256, SHA3-256, BLAKE3) or RSA-PSS digital signatures
- File ingestion, magic byte inspection, or malware scanning hooks
- S3 object storage retrieval and download delivery pipelines
- Audit log creation or immutability
- Smart contracts or blockchain custody transaction logic

Reviewers may request additional test coverage or architecture clarification before approving changes to these critical areas.

---

## Thank You

Thank you for dedicating your time, effort, and expertise to improving **e-SanRaksha**. Your contributions help ensure that digital evidence and legal documents remain authentic, secure, and verifiable!
