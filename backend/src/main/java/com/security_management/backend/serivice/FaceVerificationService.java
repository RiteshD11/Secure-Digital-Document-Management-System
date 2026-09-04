package com.security_management.backend.serivice;

import com.security_management.backend.dto.FaceVerificationResult;

public interface FaceVerificationService {

    /**
     * Verifies if the live captured photo matches the registered user's reference photo.
     *
     * @param referencePhoto Binary byte array of the user's registered profile photo.
     * @param livePhoto      Binary byte array of the live captured photo from device camera.
     * @return FaceVerificationResult indicating MATCH or NO_MATCH with confidence score.
     */
    FaceVerificationResult verifyFace(byte[] referencePhoto, byte[] livePhoto);
}
