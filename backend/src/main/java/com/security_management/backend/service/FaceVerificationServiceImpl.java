package com.security_management.backend.service;

import com.security_management.backend.dto.FaceVerificationResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.util.Map;

@Service
public class FaceVerificationServiceImpl implements FaceVerificationService {

    private static final Logger log = LoggerFactory.getLogger(FaceVerificationServiceImpl.class);

    private final FastApiService fastApiService;

    @Autowired
    public FaceVerificationServiceImpl(@Autowired(required = false) FastApiService fastApiService) {
        this.fastApiService = fastApiService;
    }

    @Override
    public FaceVerificationResult verifyFace(byte[] referencePhoto, byte[] livePhoto) {
        return verifyFace(null, referencePhoto, livePhoto);
    }

    @Override
    public FaceVerificationResult verifyFace(String userId, byte[] referencePhoto, byte[] livePhoto) {
        log.info("Initiating face verification pipeline for user: {}", userId != null ? userId : "unspecified");

        if (referencePhoto == null || referencePhoto.length == 0) {
            log.warn("Face verification failed: Reference photo is empty or missing.");
            return FaceVerificationResult.noMatch(0.0, "Reference profile photo not found.");
        }

        if (livePhoto == null || livePhoto.length == 0) {
            log.warn("Face verification failed: Live captured photo is empty.");
            return FaceVerificationResult.noMatch(0.0, "Live captured photo is empty.");
        }

        try {
            // Verify reference image decode
            BufferedImage refImg = ImageIO.read(new ByteArrayInputStream(referencePhoto));
            if (refImg == null) {
                log.warn("Could not decode reference photo bytes into a valid image.");
                return FaceVerificationResult.noMatch(0.0, "Invalid reference photo data.");
            }

            // Verify live image decode
            BufferedImage liveImg = ImageIO.read(new ByteArrayInputStream(livePhoto));
            if (liveImg == null) {
                log.warn("Could not decode live captured photo bytes into a valid image.");
                return FaceVerificationResult.noMatch(0.0, "Invalid live captured photo data.");
            }

            log.info("Decoded reference photo ({}x{}) and live photo ({}x{}).",
                    refImg.getWidth(), refImg.getHeight(), liveImg.getWidth(), liveImg.getHeight());

            // Check if FastAPI external service is available
            if (fastApiService != null && userId != null && !userId.isBlank()) {
                try {
                    log.info("Attempting biometric verification with FastAPI AI service for user: {}", userId);
                    Map<String, Object> fastApiResponse = null;
                    try {
                        fastApiResponse = fastApiService.verifyFace(userId, livePhoto, "live_capture.jpg", "image/jpeg");
                    } catch (Exception e) {
                        if (e.getMessage() != null && e.getMessage().contains("404")) {
                            log.info("Face not found on FastAPI for user {}. Attempting to re-register with reference photo...", userId);
                            fastApiService.registerFace(userId, referencePhoto, "reference.jpg");
                            log.info("Successfully re-registered face. Retrying verification...");
                            fastApiResponse = fastApiService.verifyFace(userId, livePhoto, "live_capture.jpg", "image/jpeg");
                        } else {
                            throw e;
                        }
                    }

                    if (fastApiResponse != null) {
                        log.info("FastAPI verification response: {}", fastApiResponse);
                        boolean isSuccess = Boolean.TRUE.equals(fastApiResponse.get("success"));
                        boolean isMatch = isSuccess && Boolean.TRUE.equals(fastApiResponse.get("match"));
                        
                        double confidence = isMatch ? 1.0 : 0.0;

                        if (isMatch) {
                            return FaceVerificationResult.match(confidence, "Biometric face verification successful via FastAPI service.");
                        } else {
                            String msg = fastApiResponse.containsKey("message") ? String.valueOf(fastApiResponse.get("message")) : "Biometric face verification failed via AI service.";
                            return FaceVerificationResult.noMatch(confidence, msg);
                        }
                    }
                } catch (Exception fastApiEx) {
                    log.error("External FastAPI face verification call failed: {}", fastApiEx.getMessage());
                    String errorMsg = "Face verification service is currently unavailable.";
                    
                    if (fastApiEx.getMessage() != null) {
                        if (fastApiEx.getMessage().contains("FastAPI face verification error")) {
                            // Extract the exact error message provided by FastAPI
                            int idx = fastApiEx.getMessage().indexOf("): ");
                            if (idx != -1) {
                                errorMsg = fastApiEx.getMessage().substring(idx + 3);
                            } else {
                                errorMsg = fastApiEx.getMessage();
                            }
                        } else if (fastApiEx.getMessage().contains("unreachable")) {
                            errorMsg = "FastAPI service is currently unreachable.";
                        }
                    }
                    return FaceVerificationResult.noMatch(0.0, errorMsg);
                }
            } else {
                log.warn("FastAPI service is not configured or userId is missing.");
                return FaceVerificationResult.noMatch(0.0, "Face verification service not configured or missing userId.");
            }

            return FaceVerificationResult.noMatch(0.0, "Unexpected error in face verification pipeline.");

        } catch (Exception e) {
            log.error("Exception occurred during face verification: {}", e.getMessage(), e);
            return FaceVerificationResult.noMatch(0.0, "Error processing facial biometric comparison: " + e.getMessage());
        }
    }
}

