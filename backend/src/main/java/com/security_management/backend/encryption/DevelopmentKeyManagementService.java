package com.security_management.backend.encryption;

import com.security_management.backend.exception.EncryptionException;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Service
public class DevelopmentKeyManagementService implements KeyManagementService {

    private static final Logger log = LoggerFactory.getLogger(DevelopmentKeyManagementService.class);
    private static final String WRAP_ALGORITHM = "AESWrap";

    private final DekService dekService;

    @Value("${dms.security.kekMasterSecret:SecureDmsMasterKeyEncryptionKey2026!}")
    private String kekMasterSecret;

    private SecretKey kek;

    @Autowired
    public DevelopmentKeyManagementService(DekService dekService) {
        this.dekService = dekService;
    }

    @PostConstruct
    public void initKek() {
        try {
            // Derive a consistent 256-bit KEK from the configured master secret
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = sha256.digest(kekMasterSecret.getBytes(StandardCharsets.UTF_8));
            this.kek = new SecretKeySpec(keyBytes, "AES");
            log.info("KeyManagementService initialized with 256-bit KEK (Master Key Encryption Key).");
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize Key Encryption Key (KEK)", e);
        }
    }

    @Override
    public SecretKey generateDek() {
        return dekService.generateDek();
    }

    @Override
    public byte[] wrapDek(SecretKey dek) {
        try {
            Cipher cipher = Cipher.getInstance(WRAP_ALGORITHM);
            cipher.init(Cipher.WRAP_MODE, kek);
            return cipher.wrap(dek);
        } catch (Exception e) {
            log.error("Failed to wrap DEK with KEK", e);
            throw new EncryptionException("Failed to wrap Data Encryption Key (DEK): " + e.getMessage(), e);
        }
    }

    @Override
    public SecretKey unwrapDek(byte[] wrappedDekBytes) {
        try {
            Cipher cipher = Cipher.getInstance(WRAP_ALGORITHM);
            cipher.init(Cipher.UNWRAP_MODE, kek);
            return (SecretKey) cipher.unwrap(wrappedDekBytes, "AES", Cipher.SECRET_KEY);
        } catch (Exception e) {
            log.error("Failed to unwrap DEK with KEK", e);
            throw new EncryptionException("Failed to unwrap Data Encryption Key (DEK): " + e.getMessage(), e);
        }
    }
}
