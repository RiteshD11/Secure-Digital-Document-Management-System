package com.security_management.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.security_management.backend.config.FastApiConfig;
import com.security_management.backend.dto.fastapi.FastApiHealthResponse;
import com.security_management.backend.dto.fastapi.FastApiSearchRequest;
import com.security_management.backend.dto.fastapi.FastApiSearchResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Service
public class FastApiServiceImpl implements FastApiService {

    private static final Logger log = LoggerFactory.getLogger(FastApiServiceImpl.class);

    private final RestTemplate restTemplate;
    private final FastApiConfig config;
    private final ObjectMapper objectMapper;

    @Autowired
    public FastApiServiceImpl(@Qualifier("fastApiRestTemplate") RestTemplate restTemplate,
                              FastApiConfig config,
                              @Autowired(required = false) ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.config = config;
        this.objectMapper = (objectMapper != null) ? objectMapper : new ObjectMapper();
    }

    /**
     * Helper to build full URL from normalized base.
     */
    private String buildUrl(String path) {
        String base = config.getNormalizedBaseUrl();
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        return base + path;
    }

    @Override
    public Map<String, Object> indexDocument(String documentId, String caseId, byte[] fileBytes, String filename, String documentType, String version) {
        if (documentId == null || documentId.trim().isEmpty()) {
            throw new IllegalArgumentException("document_id is required for indexing");
        }
        if (caseId == null || caseId.trim().isEmpty()) {
            throw new IllegalArgumentException("case_id is required for indexing");
        }
        if (fileBytes == null || fileBytes.length == 0) {
            throw new IllegalArgumentException("Document file content cannot be empty");
        }

        String url = buildUrl("/api/v1/index-document");
        log.info("Sending document indexing request to FastAPI: documentId={}, caseId={}, url={}", documentId, caseId, url);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("document_id", documentId.trim());
            body.add("case_id", caseId.trim());

            // Named resource for proper multipart transmission
            String resolvedFilename = (filename != null && !filename.trim().isEmpty()) ? filename : "document.pdf";
            ByteArrayResource fileResource = new ByteArrayResource(fileBytes) {
                @Override
                public String getFilename() {
                    return resolvedFilename;
                }
            };
            body.add("file", fileResource);

            // Add optional parameters only if provided
            if (documentType != null && !documentType.trim().isEmpty()) {
                body.add("document_type", documentType.trim());
            }
            if (version != null && !version.trim().isEmpty()) {
                body.add("version", version.trim());
            }

            HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            return response.getBody() != null ? response.getBody() : Collections.emptyMap();

        } catch (HttpStatusCodeException e) {
            String errorDetail = extractErrorDetail(e);
            log.error("FastAPI index-document returned HTTP {}: {}", e.getStatusCode(), errorDetail);
            throw new RuntimeException("FastAPI indexing error (" + e.getStatusCode() + "): " + errorDetail, e);
        } catch (ResourceAccessException e) {
            log.error("Failed to connect to FastAPI at {}: {}", url, e.getMessage());
            throw new RuntimeException("FastAPI service unreachable at " + config.getNormalizedBaseUrl() + ". Please check if service is running.", e);
        } catch (Exception e) {
            log.error("Unexpected error calling FastAPI index-document: {}", e.getMessage(), e);
            throw new RuntimeException("FastAPI index-document failed: " + e.getMessage(), e);
        }
    }

    @Override
    public Map<String, Object> indexDocument(String documentId, String caseId, MultipartFile file, String documentType, String version) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file cannot be empty");
        }
        try {
            return indexDocument(documentId, caseId, file.getBytes(), file.getOriginalFilename(), documentType, version);
        } catch (Exception e) {
            if (e instanceof RuntimeException re) throw re;
            throw new RuntimeException("Error reading document file: " + e.getMessage(), e);
        }
    }

    @Override
    public FastApiSearchResponse search(String query, Integer topK) {
        if (query == null || query.trim().isEmpty()) {
            throw new IllegalArgumentException("Search query cannot be empty");
        }

        String url = buildUrl("/api/v1/search");
        log.info("Sending semantic search request to FastAPI: query='{}', top_k={}, url={}", query, topK, url);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            FastApiSearchRequest request = new FastApiSearchRequest();
            request.setQuery(query.trim());
            if (topK != null && topK > 0) {
                request.setTop_k(topK);
            }

            HttpEntity<FastApiSearchRequest> entity = new HttpEntity<>(request, headers);
            ResponseEntity<FastApiSearchResponse> response = restTemplate.exchange(url, HttpMethod.POST, entity, FastApiSearchResponse.class);
            return response.getBody() != null ? response.getBody() : new FastApiSearchResponse();

        } catch (HttpStatusCodeException e) {
            String errorDetail = extractErrorDetail(e);
            log.error("FastAPI search returned HTTP {}: {}", e.getStatusCode(), errorDetail);
            throw new RuntimeException("FastAPI search error (" + e.getStatusCode() + "): " + errorDetail, e);
        } catch (ResourceAccessException e) {
            log.error("Failed to connect to FastAPI at {}: {}", url, e.getMessage());
            throw new RuntimeException("FastAPI service unreachable at " + config.getNormalizedBaseUrl(), e);
        } catch (Exception e) {
            log.error("Unexpected error calling FastAPI search: {}", e.getMessage(), e);
            throw new RuntimeException("FastAPI search failed: " + e.getMessage(), e);
        }
    }

    @Override
    public FastApiSearchResponse search(FastApiSearchRequest request) {
        if (request == null || request.getQuery() == null || request.getQuery().trim().isEmpty()) {
            throw new IllegalArgumentException("Search query cannot be empty");
        }
        return search(request.getQuery(), request.getTopK());
    }

    @Override
    public Map<String, Object> registerFace(String userId, byte[] imageBytes, String filename) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new IllegalArgumentException("user_id is required for face registration");
        }
        if (imageBytes == null || imageBytes.length == 0) {
            throw new IllegalArgumentException("Face image bytes cannot be empty");
        }

        String url = buildUrl("/api/v1/face/register");
        log.info("Sending face registration request to FastAPI: userId={}, url={}", userId, url);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("user_id", userId.trim());

            String resolvedFilename = (filename != null && !filename.trim().isEmpty()) ? filename : "face.jpg";
            ByteArrayResource imageResource = new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return resolvedFilename;
                }
            };
            body.add("image", imageResource);

            HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            return response.getBody() != null ? response.getBody() : Collections.emptyMap();

        } catch (HttpStatusCodeException e) {
            String errorDetail = extractErrorDetail(e);
            log.error("FastAPI face/register returned HTTP {}: {}", e.getStatusCode(), errorDetail);
            throw new RuntimeException("FastAPI face registration error (" + e.getStatusCode() + "): " + errorDetail, e);
        } catch (ResourceAccessException e) {
            log.error("Failed to connect to FastAPI at {}: {}", url, e.getMessage());
            throw new RuntimeException("FastAPI service unreachable at " + config.getNormalizedBaseUrl(), e);
        } catch (Exception e) {
            log.error("Unexpected error calling FastAPI face register: {}", e.getMessage(), e);
            throw new RuntimeException("FastAPI face registration failed: " + e.getMessage(), e);
        }
    }

    @Override
    public Map<String, Object> registerFace(String userId, MultipartFile imageFile) {
        if (imageFile == null || imageFile.isEmpty()) {
            throw new IllegalArgumentException("Image file cannot be empty");
        }
        try {
            return registerFace(userId, imageFile.getBytes(), imageFile.getOriginalFilename());
        } catch (Exception e) {
            if (e instanceof RuntimeException re) throw re;
            throw new RuntimeException("Error reading image file: " + e.getMessage(), e);
        }
    }

    @Override
    public Map<String, Object> verifyFace(String userId, byte[] imageBytes, String filename) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new IllegalArgumentException("user_id is required for face verification");
        }
        if (imageBytes == null || imageBytes.length == 0) {
            throw new IllegalArgumentException("Live captured image bytes cannot be empty");
        }

        String url = buildUrl("/api/v1/face/verify");
        log.info("Sending face verification request to FastAPI: userId={}, url={}", userId, url);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("user_id", userId.trim());

            String resolvedFilename = (filename != null && !filename.trim().isEmpty()) ? filename : "live-capture.jpg";
            ByteArrayResource imageResource = new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return resolvedFilename;
                }
            };
            body.add("image", imageResource);

            HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            return response.getBody() != null ? response.getBody() : Collections.emptyMap();

        } catch (HttpStatusCodeException e) {
            String errorDetail = extractErrorDetail(e);
            log.error("FastAPI face/verify returned HTTP {}: {}", e.getStatusCode(), errorDetail);
            throw new RuntimeException("FastAPI face verification error (" + e.getStatusCode() + "): " + errorDetail, e);
        } catch (ResourceAccessException e) {
            log.error("Failed to connect to FastAPI at {}: {}", url, e.getMessage());
            throw new RuntimeException("FastAPI service unreachable at " + config.getNormalizedBaseUrl(), e);
        } catch (Exception e) {
            log.error("Unexpected error calling FastAPI face verify: {}", e.getMessage(), e);
            throw new RuntimeException("FastAPI face verification failed: " + e.getMessage(), e);
        }
    }

    @Override
    public Map<String, Object> verifyFace(String userId, MultipartFile imageFile) {
        if (imageFile == null || imageFile.isEmpty()) {
            throw new IllegalArgumentException("Image file cannot be empty");
        }
        try {
            return verifyFace(userId, imageFile.getBytes(), imageFile.getOriginalFilename());
        } catch (Exception e) {
            if (e instanceof RuntimeException re) throw re;
            throw new RuntimeException("Error reading image file: " + e.getMessage(), e);
        }
    }

    @Override
    public Map<String, Object> verifyFace(String userId, byte[] imageBytes, String filename, String contentType) {
        return verifyFace(userId, imageBytes, filename);
    }

    @Override
    public FastApiHealthResponse checkHealth() {
        String url = buildUrl("/health");
        log.info("Checking FastAPI health at: {}", url);

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> body = response.getBody();
            String status = body != null && body.containsKey("status") ? String.valueOf(body.get("status")) : "healthy";
            String version = body != null && body.containsKey("version") ? String.valueOf(body.get("version")) : "1.0";
            String service = body != null && body.containsKey("service") ? String.valueOf(body.get("service")) : "FastAPI DMS AI Service";

            return FastApiHealthResponse.builder()
                    .status(status)
                    .version(version)
                    .service(service)
                    .reachable(response.getStatusCode().is2xxSuccessful())
                    .message("FastAPI service is online at " + config.getNormalizedBaseUrl())
                    .build();

        } catch (Exception e) {
            log.warn("FastAPI health check failed for {}: {}", url, e.getMessage());
            return FastApiHealthResponse.builder()
                    .status("UNAVAILABLE")
                    .version("unknown")
                    .service("FastAPI DMS AI Service")
                    .reachable(false)
                    .message("FastAPI service is unreachable at " + config.getNormalizedBaseUrl() + " (" + e.getMessage() + ")")
                    .build();
        }
    }

    @Override
    public boolean isHealthy() {
        try {
            FastApiHealthResponse health = checkHealth();
            return health != null && health.isReachable();
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Extracts readable error detail from FastAPI HTTP error response.
     */
    private String extractErrorDetail(HttpStatusCodeException e) {
        String body = e.getResponseBodyAsString();
        if (body != null && !body.trim().isEmpty()) {
            try {
                Map<String, Object> map = objectMapper.readValue(body, Map.class);
                if (map.containsKey("detail")) {
                    return String.valueOf(map.get("detail"));
                }
                if (map.containsKey("message")) {
                    return String.valueOf(map.get("message"));
                }
            } catch (Exception ignored) {}
            return body;
        }
        return e.getStatusText();
    }
}
