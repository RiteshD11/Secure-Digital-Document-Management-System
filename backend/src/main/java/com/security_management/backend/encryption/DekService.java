package com.security_management.backend.encryption;

import org.springframework.stereotype.Service;

import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;

@Service
public class DekService {

    private static final String KEY_ALGORITHM = "AES";
    private static final int KEY_SIZE_BITS = 256;

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Phase 10: Generates a new cryptographically secure random 256-bit DEK.
     * Every document version receives a unique DEK.
     */
    public SecretKey generateDek() {
        try {
            KeyGenerator keyGen = KeyGenerator.getInstance(KEY_ALGORITHM);
            keyGen.init(KEY_SIZE_BITS, secureRandom);
            return keyGen.generateKey();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("AES KeyGenerator not available", e);
        }
    }
}
