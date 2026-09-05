package com.security_management.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class FastApiConfig {

    private static final Logger log = LoggerFactory.getLogger(FastApiConfig.class);

    @Value("${fastapi.base.url:http://localhost:8000}")
    private String rawBaseUrl;

    @Value("${fastapi.connect.timeout-ms:5000}")
    private int connectTimeoutMs = 5000;

    @Value("${fastapi.read.timeout-ms:15000}")
    private int readTimeoutMs = 15000;

    public String getRawBaseUrl() {
        return rawBaseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.rawBaseUrl = baseUrl;
    }

    public int getConnectTimeoutMs() {
        return connectTimeoutMs;
    }

    public void setConnectTimeoutMs(int connectTimeoutMs) {
        this.connectTimeoutMs = connectTimeoutMs;
    }

    public int getReadTimeoutMs() {
        return readTimeoutMs;
    }

    public void setReadTimeoutMs(int readTimeoutMs) {
        this.readTimeoutMs = readTimeoutMs;
    }

    /**
     * Normalizes the configured FastAPI base URL.
     * Strips swagger/openapi paths like /docs, /redoc, /openapi.json, and trailing slashes.
     */
    public String getNormalizedBaseUrl() {
        if (rawBaseUrl == null || rawBaseUrl.trim().isEmpty()) {
            return "http://localhost:8000";
        }
        String normalized = rawBaseUrl.trim();
        // Remove trailing slash
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        // Remove swagger / docs suffixes if user provided the docs URL
        if (normalized.endsWith("/docs")) {
            normalized = normalized.substring(0, normalized.length() - 5);
        } else if (normalized.endsWith("/redoc")) {
            normalized = normalized.substring(0, normalized.length() - 6);
        } else if (normalized.endsWith("/openapi.json")) {
            normalized = normalized.substring(0, normalized.length() - 13);
        }
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    @Bean(name = "fastApiRestTemplate")
    public RestTemplate fastApiRestTemplate() {
        log.info("Configuring FastAPI RestTemplate with normalized base URL: {}, connectTimeout: {}ms, readTimeout: {}ms",
                getNormalizedBaseUrl(), connectTimeoutMs, readTimeoutMs);

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeoutMs);
        requestFactory.setReadTimeout(readTimeoutMs);

        return new RestTemplate(requestFactory);
    }

    @Bean
    public com.fasterxml.jackson.databind.ObjectMapper objectMapper() {
        return new com.fasterxml.jackson.databind.ObjectMapper();
    }
}
