package com.security_management.backend.encryption;

import javax.crypto.SecretKey;

public interface KeyManagementService {
    SecretKey generateDek();
    byte[] wrapDek(SecretKey dek);
    SecretKey unwrapDek(byte[] wrappedDekBytes);
}
