package com.security_management.backend.service;

import com.security_management.backend.dto.fastapi.FastApiHealthResponse;
import com.security_management.backend.dto.fastapi.FastApiSearchRequest;
import com.security_management.backend.dto.fastapi.FastApiSearchResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

public interface FastApiService {

    /**
     * 1. POST /api/v1/index-document
     * Submits a document to FastAPI for semantic indexing and vector storage.
     *
     * @param documentId   Required document identifier (e.g. DOC-CASE-2026-014)
     * @param caseId       Required case identifier (e.g. CASE-2026-014)
     * @param fileBytes    Binary document bytes
     * @param filename     Filename of the uploaded document
     * @param documentType Optional document category (e.g. FIR)
     * @param version      Optional document version (e.g. 1.0)
     * @return FastAPI response map
     */
    Map<String, Object> indexDocument(String documentId, String caseId, byte[] fileBytes, String filename, String documentType, String version);

    /**
     * Overload accepting Spring MultipartFile.
     */
    Map<String, Object> indexDocument(String documentId, String caseId, MultipartFile file, String documentType, String version);

    /**
     * 2. POST /api/v1/search
     * Performs semantic vector search on indexed case documents.
     *
     * @param query Search query string
     * @param topK  Optional maximum number of top results to retrieve
     * @return FastApiSearchResponse containing results list
     */
    FastApiSearchResponse search(String query, Integer topK);

    /**
     * Overload accepting FastApiSearchRequest DTO.
     */
    FastApiSearchResponse search(FastApiSearchRequest request);

    /**
     * 3. POST /api/v1/face/register
     * Registers a reference facial image for a user in the FastAPI biometric store.
     *
     * @param userId     Unique user / officer identifier
     * @param imageBytes Facial image binary data
     * @param filename   Image filename
     * @return FastAPI response map
     */
    Map<String, Object> registerFace(String userId, byte[] imageBytes, String filename);

    /**
     * Overload accepting Spring MultipartFile.
     */
    Map<String, Object> registerFace(String userId, MultipartFile imageFile);

    /**
     * 4. POST /api/v1/face/verify
     * Verifies a live captured facial image against the registered user in FastAPI.
     *
     * @param userId     Unique user / officer identifier
     * @param imageBytes Live captured facial image binary data
     * @param filename   Image filename
     * @return FastAPI response map
     */
    Map<String, Object> verifyFace(String userId, byte[] imageBytes, String filename);

    /**
     * Overload accepting Spring MultipartFile.
     */
    Map<String, Object> verifyFace(String userId, MultipartFile imageFile);

    /**
     * Overload accepting content type.
     */
    Map<String, Object> verifyFace(String userId, byte[] imageBytes, String filename, String contentType);

    /**
     * 5. GET /health
     * Performs a health check against the FastAPI microservice.
     *
     * @return FastApiHealthResponse
     */
    FastApiHealthResponse checkHealth();

    /**
     * Convenience method returning true if FastAPI is currently reachable and healthy.
     */
    boolean isHealthy();
}

