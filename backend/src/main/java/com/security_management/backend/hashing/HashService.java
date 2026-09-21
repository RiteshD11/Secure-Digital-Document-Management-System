package com.security_management.backend.hashing;

import jakarta.annotation.PostConstruct;
import org.bouncycastle.crypto.digests.Blake3Digest;
import org.bouncycastle.crypto.digests.SHA3Digest;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.Security;

@Service
public class HashService {

    private static final String SHA256_ALGORITHM = "SHA-256";

    @PostConstruct
    public void init() {
        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    /**
     * Compute SHA-256 (standard baseline).
     */
    public String calculateSha256(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance(SHA256_ALGORITHM);
            byte[] hashBytes = digest.digest(data);
            return bytesToHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    /**
     * Compute SHA3-256 (NIST Standard primary hash).
     */
    public String calculateSha3_256(byte[] data) {
        SHA3Digest sha3Digest = new SHA3Digest(256);
        sha3Digest.update(data, 0, data.length);
        byte[] out = new byte[32];
        sha3Digest.doFinal(out, 0);
        return bytesToHex(out);
    }

    /**
     * Compute BLAKE3 (Ultra-fast modern cryptographic hash).
     */
    public String calculateBlake3(byte[] data) {
        Blake3Digest blake3Digest = new Blake3Digest();
        blake3Digest.update(data, 0, data.length);
        byte[] out = new byte[32];
        blake3Digest.doFinal(out, 0);
        return bytesToHex(out);
    }

    /**
     * Compute Dual Cryptographic Hash (SHA3-256 + BLAKE3 + SHA-256) in single pass.
     */
    public DualHashResult calculateDualHash(byte[] data) {
        String sha3 = calculateSha3_256(data);
        String blake3 = calculateBlake3(data);
        String sha256 = calculateSha256(data);

        return DualHashResult.builder()
                .sha3_256(sha3)
                .blake3(blake3)
                .sha256(sha256)
                .build();
    }

    /**
     * Compute Dual Hash from InputStream using streaming chunks (memory-efficient).
     */
    public DualHashResult calculateDualHash(InputStream inputStream) throws IOException {
        SHA3Digest sha3Digest = new SHA3Digest(256);
        Blake3Digest blake3Digest = new Blake3Digest();
        MessageDigest sha256Digest;
        try {
            sha256Digest = MessageDigest.getInstance(SHA256_ALGORITHM);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }

        byte[] buffer = new byte[8192];
        int bytesRead;
        while ((bytesRead = inputStream.read(buffer)) != -1) {
            sha3Digest.update(buffer, 0, bytesRead);
            blake3Digest.update(buffer, 0, bytesRead);
            sha256Digest.update(buffer, 0, bytesRead);
        }

        byte[] sha3Out = new byte[32];
        sha3Digest.doFinal(sha3Out, 0);

        byte[] blake3Out = new byte[32];
        blake3Digest.doFinal(blake3Out, 0);

        byte[] sha256Out = sha256Digest.digest();

        return DualHashResult.builder()
                .sha3_256(bytesToHex(sha3Out))
                .blake3(bytesToHex(blake3Out))
                .sha256(bytesToHex(sha256Out))
                .build();
    }

    public boolean verifySha256(byte[] data, String expectedHash) {
        if (expectedHash == null) {
            return false;
        }
        String calculated = calculateSha256(data);
        return MessageDigest.isEqual(
                calculated.toLowerCase().getBytes(),
                expectedHash.toLowerCase().getBytes()
        );
    }

    public boolean verifyDualHash(byte[] data, String expectedSha3, String expectedBlake3) {
        if (expectedSha3 == null || expectedBlake3 == null) {
            return false;
        }
        String calculatedSha3 = calculateSha3_256(data);
        String calculatedBlake3 = calculateBlake3(data);
        return MessageDigest.isEqual(calculatedSha3.toLowerCase().getBytes(), expectedSha3.toLowerCase().getBytes()) &&
               MessageDigest.isEqual(calculatedBlake3.toLowerCase().getBytes(), expectedBlake3.toLowerCase().getBytes());
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
