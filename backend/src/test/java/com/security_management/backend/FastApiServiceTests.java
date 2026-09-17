package com.security_management.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.security_management.backend.config.FastApiConfig;
import com.security_management.backend.dto.fastapi.FastApiHealthResponse;
import com.security_management.backend.dto.fastapi.FastApiSearchRequest;
import com.security_management.backend.dto.fastapi.FastApiSearchResponse;
import com.security_management.backend.dto.fastapi.FastApiSearchResultItem;
import com.security_management.backend.service.FastApiServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class FastApiServiceTests {

    private RestTemplate restTemplate;
    private MockRestServiceServer mockServer;
    private FastApiConfig fastApiConfig;
    private FastApiServiceImpl fastApiService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        restTemplate = new RestTemplate();
        mockServer = MockRestServiceServer.createServer(restTemplate);
        fastApiConfig = new FastApiConfig();
        fastApiConfig.setBaseUrl("http://test-fastapi.local:8000/docs");
        fastApiConfig.setConnectTimeoutMs(5000);
        fastApiConfig.setReadTimeoutMs(30000);
        objectMapper = new ObjectMapper();

        fastApiService = new FastApiServiceImpl(restTemplate, fastApiConfig, objectMapper);
    }

    @Test
    @DisplayName("FastApiConfig normalizes URLs by stripping /docs, /redoc, /openapi.json, and trailing slashes")
    void testUrlNormalization() {
        FastApiConfig cfg = new FastApiConfig();

        cfg.setBaseUrl("http://10.10.11.42:8000/docs");
        assertEquals("http://10.10.11.42:8000", cfg.getNormalizedBaseUrl());

        cfg.setBaseUrl("http://10.10.11.42:8000/docs/");
        assertEquals("http://10.10.11.42:8000", cfg.getNormalizedBaseUrl());

        cfg.setBaseUrl("http://10.10.11.42:8000/redoc");
        assertEquals("http://10.10.11.42:8000", cfg.getNormalizedBaseUrl());

        cfg.setBaseUrl("http://10.10.11.42:8000/openapi.json");
        assertEquals("http://10.10.11.42:8000", cfg.getNormalizedBaseUrl());

        cfg.setBaseUrl("http://10.10.11.42:8000/");
        assertEquals("http://10.10.11.42:8000", cfg.getNormalizedBaseUrl());

        cfg.setBaseUrl("http://10.10.11.42:8000");
        assertEquals("http://10.10.11.42:8000", cfg.getNormalizedBaseUrl());
    }

    @Test
    @DisplayName("Health Check: GET /health returns UP when FastAPI service is reachable")
    void testCheckHealthSuccess() throws Exception {
        FastApiHealthResponse mockResponse = FastApiHealthResponse.builder()
                .status("UP")
                .service("fastapi-ai-service")
                .version("1.0.0")
                .reachable(true)
                .message("Service healthy")
                .build();

        mockServer.expect(requestTo("http://test-fastapi.local:8000/health"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(objectMapper.writeValueAsString(mockResponse), MediaType.APPLICATION_JSON));

        FastApiHealthResponse health = fastApiService.checkHealth();
        assertNotNull(health);
        assertEquals("UP", health.getStatus());
        assertEquals("fastapi-ai-service", health.getService());
        mockServer.verify();
    }

    @Test
    @DisplayName("Document Indexing: POST /api/v1/index-document with multipart form data")
    void testIndexDocumentSuccess() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "sample_fir.pdf",
                "application/pdf",
                "%PDF-1.4 test document content".getBytes(StandardCharsets.UTF_8)
        );

        Map<String, Object> responseBody = Map.of(
                "status", "success",
                "document_id", "DOC-CASE-2026-014",
                "case_id", "CASE-2026-014",
                "indexed_chunks", 12
        );

        mockServer.expect(requestTo("http://test-fastapi.local:8000/api/v1/index-document"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Content-Type", org.hamcrest.Matchers.startsWith("multipart/form-data")))
                .andRespond(withSuccess(objectMapper.writeValueAsString(responseBody), MediaType.APPLICATION_JSON));

        Map<String, Object> result = fastApiService.indexDocument(
                "DOC-CASE-2026-014",
                "CASE-2026-014",
                file,
                "FIR",
                "1.0"
        );

        assertNotNull(result);
        assertEquals("success", result.get("status"));
        assertEquals("DOC-CASE-2026-014", result.get("document_id"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Semantic Search: POST /api/v1/search sends JSON query and returns ranked results")
    void testSearchSuccess() throws Exception {
        FastApiSearchRequest request = new FastApiSearchRequest("financial fraud evidence", 5);

        FastApiSearchResultItem item1 = new FastApiSearchResultItem(
                "DOC-001",
                "CASE-001",
                0.94,
                "FIR",
                "1.0",
                "Summary content",
                Map.of()
        );

        FastApiSearchResponse mockResponse = new FastApiSearchResponse(
                List.of(item1),
                "financial fraud evidence",
                1,
                "success"
        );

        mockServer.expect(requestTo("http://test-fastapi.local:8000/api/v1/search"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andRespond(withSuccess(objectMapper.writeValueAsString(mockResponse), MediaType.APPLICATION_JSON));

        FastApiSearchResponse response = fastApiService.search(request);
        assertNotNull(response);
        assertEquals("financial fraud evidence", response.getQuery());
        assertEquals(1, response.getTotalResults());
        assertEquals("DOC-001", response.getResults().get(0).getDocumentId());
        mockServer.verify();
    }

    @Test
    @DisplayName("Face Verification: POST /api/v1/face/verify sends multipart image and user_id")
    void testVerifyFaceSuccess() throws Exception {
        MockMultipartFile image = new MockMultipartFile(
                "image",
                "live_capture.jpg",
                "image/jpeg",
                new byte[]{1, 2, 3, 4}
        );

        Map<String, Object> mockResponse = Map.of(
                "verified", true,
                "confidence", 0.98,
                "user_id", "officer_101"
        );

        mockServer.expect(requestTo("http://test-fastapi.local:8000/api/v1/face/verify"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Content-Type", org.hamcrest.Matchers.startsWith("multipart/form-data")))
                .andRespond(withSuccess(objectMapper.writeValueAsString(mockResponse), MediaType.APPLICATION_JSON));

        Map<String, Object> result = fastApiService.verifyFace("officer_101", image);
        assertNotNull(result);
        assertEquals(Boolean.TRUE, result.get("verified"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Error Handling: FastAPI 422 Unprocessable Entity preserves error detail")
    void testFastApiErrorDetailPreservation() {
        FastApiSearchRequest request = new FastApiSearchRequest("sample-query", 5);
        String errorJson = "{\"detail\":\"Query processing error on FastAPI backend\"}";

        mockServer.expect(requestTo("http://test-fastapi.local:8000/api/v1/search"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY).body(errorJson).contentType(MediaType.APPLICATION_JSON));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> fastApiService.search(request));
        assertTrue(ex.getMessage().contains("Query processing error on FastAPI backend") || ex.getMessage().contains("422"));
        mockServer.verify();
    }
}
