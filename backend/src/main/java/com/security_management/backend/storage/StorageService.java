package com.security_management.backend.storage;

import java.io.InputStream;

public interface StorageService {
    void store(String objectKey, byte[] data, String contentType);
    void store(String objectKey, InputStream inputStream, long size, String contentType);
    byte[] retrieve(String objectKey);
    void delete(String objectKey);
    boolean exists(String objectKey);
    String getStorageType();
}
