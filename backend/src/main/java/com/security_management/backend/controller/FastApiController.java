package com.security_management.backend.controller;

import com.security_management.backend.dto.fastapi.FastApiHealthResponse;
import com.security_management.backend.dto.fastapi.FastApiSearchRequest;
import com.security_management.backend.dto.fastapi.FastApiSearchResponse;
import com.security_management.backend.service.FastApiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Controller exposing REST proxy endpoints for the external FastAPI AI/ML service.
 */
@RestController
@RequestMapping("/api/fastapi")
@CrossOrigin(origins = "*")
public class FastApiController {

    private static final Logger log = LoggerFactory.getLogger(FastApiController.class);

    private final FastApiService fastApiService;

    public FastApiController(FastApiService fastApiService) {
        this.fastApiService = fastApiService;
    }

    /**
     * Proxies document indexing request to FastAPI POST /api/v1/index-document
     */
    @PostMapping(value = "/index-document", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> indexDocument(
            @RequestParam("document_id") String documentId,
            @RequestParam("case_id") String caseId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "document_type", required = false) String documentType,
            @RequestParam(value = "version", required = false) String version
    ) {
        log.info("Received request to index document. Document ID: {}, Case ID: {}, Document Type: {}, Version: {}",
                documentId, caseId, documentType, version);
        Map<String, Object> response = fastApiService.indexDocument(documentId, caseId, file, documentType, version);
        return ResponseEntity.ok(response);
    }

    /**
     * Proxies semantic search request to FastAPI POST /api/v1/search
     */
    @PostMapping(value = "/search", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<FastApiSearchResponse> search(@RequestBody FastApiSearchRequest request) {
        log.info("Received search query: '{}', top_k: {}", request.getQuery(), request.getTopK());
        FastApiSearchResponse response = fastApiService.search(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Proxies facial biometric registration to FastAPI POST /api/v1/face/register
     */
    @PostMapping(value = "/face/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> registerFace(
            @RequestParam("user_id") String userId,
            @RequestParam("image") MultipartFile image
    ) {
        log.info("Received face registration request for user ID: {}", userId);
        Map<String, Object> response = fastApiService.registerFace(userId, image);
        return ResponseEntity.ok(response);
    }

    /**
     * Proxies facial biometric verification to FastAPI POST /api/v1/face/verify
     */
    @PostMapping(value = "/face/verify", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> verifyFace(
            @RequestParam("user_id") String userId,
            @RequestParam("image") MultipartFile image
    ) {
        log.info("Received face verification request for user ID: {}", userId);
        Map<String, Object> response = fastApiService.verifyFace(userId, image);
        return ResponseEntity.ok(response);
    }

    /**
     * Proxies health check to FastAPI GET /health
     */
    @GetMapping("/health")
    public ResponseEntity<FastApiHealthResponse> checkHealth() {
        log.debug("Checking FastAPI service health status");
        FastApiHealthResponse health = fastApiService.checkHealth();
        return ResponseEntity.ok(health);
    }
}
