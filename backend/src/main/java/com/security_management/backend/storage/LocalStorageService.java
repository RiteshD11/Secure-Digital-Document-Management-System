package com.security_management.backend.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Service("localStorageService")
public class LocalStorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalStorageService.class);

    @Value("${dms.storage.local.directory:./storage/encrypted}")
    private String baseDirectory;

    @Override
    public void store(String objectKey, byte[] data, String contentType) {
        store(objectKey, new ByteArrayInputStream(data), data.length, contentType);
    }

    @Override
    public void store(String objectKey, InputStream inputStream, long size, String contentType) {
        try {
            Path targetPath = resolvePath(objectKey);
            Files.createDirectories(targetPath.getParent());
            Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            log.info("Encrypted object saved to local storage: {}", targetPath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store encrypted file locally: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] retrieve(String objectKey) {
        try {
            Path targetPath = resolvePath(objectKey);
            if (!Files.exists(targetPath)) {
                throw new RuntimeException("Encrypted object not found at path: " + targetPath);
            }
            return Files.readAllBytes(targetPath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to retrieve encrypted file from local storage: " + e.getMessage(), e);
        }
    }

    @Override
    public void delete(String objectKey) {
        try {
            Path targetPath = resolvePath(objectKey);
            if (Files.exists(targetPath)) {
                Files.delete(targetPath);
                log.info("Deleted object from local storage: {}", targetPath);
            }
        } catch (IOException e) {
            log.warn("Failed to delete local storage object: {}", e.getMessage());
        }
    }

    @Override
    public boolean exists(String objectKey) {
        return Files.exists(resolvePath(objectKey));
    }

    @Override
    public String getStorageType() {
        return "LOCAL";
    }

    private Path resolvePath(String objectKey) {
        // Strip any leading slashes
        String cleanKey = objectKey.startsWith("/") ? objectKey.substring(1) : objectKey;
        return Paths.get(baseDirectory).resolve(cleanKey).normalize();
    }
}
