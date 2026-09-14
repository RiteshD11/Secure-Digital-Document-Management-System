package com.security_management.backend.encryption;

import com.security_management.backend.exception.EncryptionException;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class EncryptionService {

    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH_BYTES = 12; // 96-bit IV recommended for GCM
    private static final int GCM_TAG_LENGTH_BITS = 128; // 128-bit authentication tag

    private final SecureRandom secureRandom = new SecureRandom();

    public static class EncryptedResult {
        private final byte[] ciphertextWithTag;
        private final byte[] iv;
        private final String algorithm;

        public EncryptedResult(byte[] ciphertextWithTag, byte[] iv, String algorithm) {
            this.ciphertextWithTag = ciphertextWithTag;
            this.iv = iv;
            this.algorithm = algorithm;
        }

        public byte[] getCiphertextWithTag() {
            return ciphertextWithTag;
        }

        public byte[] getIv() {
            return iv;
        }

        public String getIvBase64() {
            return Base64.getEncoder().encodeToString(iv);
        }

        public String getAlgorithm() {
            return algorithm;
        }
    }

    /**
     * Phase 11 Step 14: Encrypt plaintext bytes using AES-256-GCM with fresh unique IV.
     */
    public EncryptedResult encrypt(byte[] plaintext, SecretKey dek) {
        try {
            // Generate a fresh random 12-byte nonce/IV
            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
            cipher.init(Cipher.ENCRYPT_MODE, dek, spec);

            byte[] ciphertextWithTag = cipher.doFinal(plaintext);
            return new EncryptedResult(ciphertextWithTag, iv, "AES-256-GCM");
        } catch (Exception e) {
            throw new EncryptionException("AES-256-GCM encryption failed: " + e.getMessage(), e);
        }
    }

    /**
     * Phase 20 & 21: Decrypt AES-256-GCM ciphertext verifying authentication tag.
     */
    public byte[] decrypt(byte[] ciphertextWithTag, SecretKey dek, byte[] iv) {
        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
            cipher.init(Cipher.DECRYPT_MODE, dek, spec);

            return cipher.doFinal(ciphertextWithTag);
        } catch (Exception e) {
            throw new EncryptionException("AES-256-GCM decryption failed (tampered ciphertext or invalid key/IV): " + e.getMessage(), e);
        }
    }

    public byte[] decrypt(byte[] ciphertextWithTag, SecretKey dek, String ivBase64) {
        byte[] iv = Base64.getDecoder().decode(ivBase64);
        return decrypt(ciphertextWithTag, dek, iv);
    }
}
