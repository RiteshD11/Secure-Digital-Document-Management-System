package com.security_management.backend.config;

import com.security_management.backend.storage.LocalStorageService;
import com.security_management.backend.storage.MinioStorageService;
import com.security_management.backend.storage.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.io.InputStream;

@Configuration
public class StorageConfig {

    private static final Logger log = LoggerFactory.getLogger(StorageConfig.class);

    @Value("${dms.storage.type:auto}")
    private String configuredType;

    @Bean
    @Primary
    public StorageService primaryStorageService(MinioStorageService minioStorageService,
                                                LocalStorageService localStorageService) {
        if ("minio".equalsIgnoreCase(configuredType) && minioStorageService.isConnected()) {
            log.info("Active Storage Backend: MINIO (Forced)");
            return minioStorageService;
        } else if ("local".equalsIgnoreCase(configuredType)) {
            log.info("Active Storage Backend: LOCAL (Forced)");
            return localStorageService;
        }

        // Auto mode: dynamic fallback
        return new StorageService() {
            private StorageService getDelegate() {
                if (minioStorageService.isConnected()) {
                    return minioStorageService;
                }
                return localStorageService;
            }

            @Override
            public void store(String objectKey, byte[] data, String contentType) {
                getDelegate().store(objectKey, data, contentType);
            }

            @Override
            public void store(String objectKey, InputStream inputStream, long size, String contentType) {
                getDelegate().store(objectKey, inputStream, size, contentType);
            }

            @Override
            public byte[] retrieve(String objectKey) {
                // If local exists, try local first if minio not connected, or vice-versa
                if (localStorageService.exists(objectKey)) {
                    return localStorageService.retrieve(objectKey);
                }
                if (minioStorageService.isConnected() && minioStorageService.exists(objectKey)) {
                    return minioStorageService.retrieve(objectKey);
                }
                return getDelegate().retrieve(objectKey);
            }

            @Override
            public void delete(String objectKey) {
                if (localStorageService.exists(objectKey)) {
                    localStorageService.delete(objectKey);
                }
                if (minioStorageService.isConnected() && minioStorageService.exists(objectKey)) {
                    minioStorageService.delete(objectKey);
                }
            }

            @Override
            public boolean exists(String objectKey) {
                return localStorageService.exists(objectKey) ||
                        (minioStorageService.isConnected() && minioStorageService.exists(objectKey));
            }

            @Override
            public String getStorageType() {
                return getDelegate().getStorageType();
            }
        };
    }
}
