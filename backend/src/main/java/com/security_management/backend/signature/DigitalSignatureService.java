package com.security_management.backend.signature;

import com.security_management.backend.hashing.DualHashResult;
import jakarta.annotation.PostConstruct;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.*;
import java.security.spec.MGF1ParameterSpec;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.PSSParameterSpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

@Service
public class DigitalSignatureService {

    private static final Logger log = LoggerFactory.getLogger(DigitalSignatureService.class);
    private static final String SIGNATURE_ALGORITHM = "RSASSA-PSS";

    @Value("${dms.security.rsaKeySize:2048}")
    private int rsaKeySize;

    private KeyPair keyPair;

    @PostConstruct
    public void initKeys() {
        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        try {
            Path keyDir = Paths.get("config");
            Files.createDirectories(keyDir);
            Path privKeyPath = keyDir.resolve("signing-private-key.der");
            Path pubKeyPath = keyDir.resolve("signing-public-key.der");

            if (Files.exists(privKeyPath) && Files.exists(pubKeyPath)) {
                byte[] privBytes = Files.readAllBytes(privKeyPath);
                byte[] pubBytes = Files.readAllBytes(pubKeyPath);
                KeyFactory keyFactory = KeyFactory.getInstance("RSA");
                PrivateKey privKey = keyFactory.generatePrivate(new PKCS8EncodedKeySpec(privBytes));
                PublicKey pubKey = keyFactory.generatePublic(new X509EncodedKeySpec(pubBytes));
                this.keyPair = new KeyPair(pubKey, privKey);
                log.info("Loaded persistent RSA-PSS signing keys from config/ directory.");
            } else {
                KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
                keyGen.initialize(rsaKeySize, new SecureRandom());
                this.keyPair = keyGen.generateKeyPair();
                Files.write(privKeyPath, this.keyPair.getPrivate().getEncoded());
                Files.write(pubKeyPath, this.keyPair.getPublic().getEncoded());
                log.info("Generated and saved new persistent {}-bit RSA-PSS key pair to config/ directory.", rsaKeySize);
            }
        } catch (Exception e) {
            log.error("Failed to initialize or load RSA key pair: {}", e.getMessage());
            // In-memory fallback
            try {
                KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
                keyGen.initialize(rsaKeySize, new SecureRandom());
                this.keyPair = keyGen.generateKeyPair();
            } catch (Exception ex) {
                throw new RuntimeException("Failed to generate fallback RSA key pair", ex);
            }
        }
    }

    /**
     * Sign raw bytes using RSASSA-PSS.
     */
    public String sign(byte[] data) {
        try {
            Signature signature = Signature.getInstance(SIGNATURE_ALGORITHM);
            PSSParameterSpec pssSpec = new PSSParameterSpec(
                    "SHA-256",
                    "MGF1",
                    MGF1ParameterSpec.SHA256,
                    32,
                    1
            );
            signature.setParameter(pssSpec);
            signature.initSign(keyPair.getPrivate());
            signature.update(data);
            byte[] signatureBytes = signature.sign();
            return Base64.getEncoder().encodeToString(signatureBytes);
        } catch (Exception e) {
            log.error("Failed to generate digital signature", e);
            throw new RuntimeException("Digital signature generation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Step 3.B: Sign the dual cryptographic hash (SHA3-256:BLAKE3) using Officer Private Key.
     */
    public String signDualHash(DualHashResult dualHash) {
        String payload = dualHash.getCombinedHash();
        return sign(payload.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Verify RSASSA-PSS digital signature over raw bytes.
     */
    public boolean verify(byte[] data, String signatureBase64) {
        if (signatureBase64 == null || data == null) {
            return false;
        }
        try {
            byte[] signatureBytes = Base64.getDecoder().decode(signatureBase64);
            Signature signature = Signature.getInstance(SIGNATURE_ALGORITHM);
            PSSParameterSpec pssSpec = new PSSParameterSpec(
                    "SHA-256",
                    "MGF1",
                    MGF1ParameterSpec.SHA256,
                    32,
                    1
            );
            signature.setParameter(pssSpec);
            signature.initVerify(keyPair.getPublic());
            signature.update(data);
            return signature.verify(signatureBytes);
        } catch (Exception e) {
            log.warn("Digital signature verification failed or signature corrupted: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Verify signature over dual hash string.
     */
    public boolean verifyDualHashSignature(DualHashResult dualHash, String signatureBase64) {
        if (dualHash == null || signatureBase64 == null) {
            return false;
        }
        String payload = dualHash.getCombinedHash();
        return verify(payload.getBytes(StandardCharsets.UTF_8), signatureBase64);
    }

    public String getSignatureAlgorithm() {
        return "RSASSA-PSS (2048-bit RSA + SHA-256)";
    }

    public PublicKey getPublicKey() {
        return keyPair.getPublic();
    }

    public String getPublicKeyBase64() {
        return Base64.getEncoder().encodeToString(keyPair.getPublic().getEncoded());
    }
}
