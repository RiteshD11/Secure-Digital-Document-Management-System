package com.security_management.backend.storage;

import io.minio.*;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

@Service("minioStorageService")
public class MinioStorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(MinioStorageService.class);

    @Value("${dms.minio.endpoint:http://localhost:9000}")
    private String endpoint;

    @Value("${dms.minio.accessKey:minioadmin}")
    private String accessKey;

    @Value("${dms.minio.secretKey:minioadmin}")
    private String secretKey;

    @Value("${dms.minio.bucketName:secure-dms-documents}")
    private String bucketName;

    @Value("${dms.minio.enabled:true}")
    private boolean enabled;

    private MinioClient minioClient;
    private boolean connected = false;

    @PostConstruct
    public void init() {
        if (!enabled) {
            log.info("MinIO is disabled in configuration.");
            return;
        }
        try {
            this.minioClient = MinioClient.builder()
                    .endpoint(endpoint)
                    .credentials(accessKey, secretKey)
                    .build();

            // Check if bucket exists, create if not
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                log.info("Created MinIO bucket: {}", bucketName);
            }
            this.connected = true;
            log.info("Successfully connected to MinIO at {}", endpoint);
        } catch (Exception e) {
            log.warn("Could not connect to MinIO ({}: {}). Fallback to local storage will be available.", endpoint, e.getMessage());
            this.connected = false;
        }
    }

    public synchronized boolean isConnected() {
        if (!connected && enabled) {
            init();
        }
        return connected;
    }

    @Override
    public void store(String objectKey, byte[] data, String contentType) {
        store(objectKey, new ByteArrayInputStream(data), data.length, contentType);
    }

    @Override
    public void store(String objectKey, InputStream inputStream, long size, String contentType) {
        if (!connected) {
            throw new RuntimeException("MinIO client is not connected");
        }
        try {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectKey)
                            .stream(inputStream, size, -1)
                            .contentType(contentType != null ? contentType : "application/octet-stream")
                            .build()
            );
            log.info("Stored object in MinIO: {}/{}", bucketName, objectKey);
        } catch (Exception e) {
            throw new RuntimeException("Failed to store object in MinIO: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] retrieve(String objectKey) {
        if (!connected) {
            throw new RuntimeException("MinIO client is not connected");
        }
        try (InputStream stream = minioClient.getObject(
                GetObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectKey)
                        .build())) {
            return stream.readAllBytes();
        } catch (Exception e) {
            throw new RuntimeException("Failed to retrieve object from MinIO: " + e.getMessage(), e);
        }
    }

    @Override
    public void delete(String objectKey) {
        if (!connected) {
            return;
        }
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectKey)
                            .build()
            );
            log.info("Deleted object from MinIO: {}/{}", bucketName, objectKey);
        } catch (Exception e) {
            log.warn("Failed to delete object from MinIO: {}", e.getMessage());
        }
    }

    @Override
    public boolean exists(String objectKey) {
        if (!connected) {
            return false;
        }
        try {
            minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectKey)
                            .build()
            );
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public String getStorageType() {
        return "MINIO";
    }
}