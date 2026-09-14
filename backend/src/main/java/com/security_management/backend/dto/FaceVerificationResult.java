package com.security_management.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FaceVerificationResult {
    private boolean matched;
    private double similarityScore;
    private String status; // "MATCH" or "NO_MATCH"
    private String message;

    public static FaceVerificationResult match(double similarityScore, String message) {
        return new FaceVerificationResult(true, similarityScore, "MATCH", message);
    }

    public static FaceVerificationResult noMatch(double similarityScore, String message) {
        return new FaceVerificationResult(false, similarityScore, "NO_MATCH", message);
    }
}
