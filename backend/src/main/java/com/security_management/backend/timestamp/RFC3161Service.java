package com.security_management.backend.timestamp;

import org.bouncycastle.asn1.cmp.PKIFailureInfo;
import org.bouncycastle.asn1.nist.NISTObjectIdentifiers;
import org.bouncycastle.tsp.TimeStampRequest;
import org.bouncycastle.tsp.TimeStampRequestGenerator;
import org.bouncycastle.tsp.TimeStampResponse;
import org.bouncycastle.tsp.TimeStampToken;
import org.bouncycastle.util.encoders.Hex;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;

@Service
public class RFC3161Service {

    private static final Logger log = LoggerFactory.getLogger(RFC3161Service.class);

    // Using a free TSA. In production, this should be configurable in application.properties
    private static final String TSA_URL = "https://freetsa.org/tsr";

    public TSAResult getSecureTimestamp(String sha256Hex) {
        try {
            log.info("Requesting RFC-3161 timestamp for hash: {}", sha256Hex);
            byte[] documentHash = Hex.decode(sha256Hex);

            TimeStampRequestGenerator reqGen = new TimeStampRequestGenerator();
            reqGen.setCertReq(true);
            
            TimeStampRequest request = reqGen.generate(
                    NISTObjectIdentifiers.id_sha256,
                    documentHash
            );
            byte[] requestBytes = request.getEncoded();

            URL url = new URL(TSA_URL);
            HttpURLConnection con = (HttpURLConnection) url.openConnection();
            con.setDoOutput(true);
            con.setDoInput(true);
            con.setRequestMethod("POST");
            con.setRequestProperty("Content-type", "application/timestamp-query");
            con.setConnectTimeout(5000);
            con.setReadTimeout(5000);

            con.getOutputStream().write(requestBytes);
            con.getOutputStream().flush();

            if (con.getResponseCode() != HttpURLConnection.HTTP_OK) {
                log.error("TSA HTTP Error: {}", con.getResponseCode());
                throw new RuntimeException("TSA HTTP Error: " + con.getResponseCode());
            }

            try (InputStream in = con.getInputStream()) {
                TimeStampResponse response = new TimeStampResponse(in);
                response.validate(request);

                if (response.getStatus() != PKIFailureInfo.systemFailure) {
                    TimeStampToken token = response.getTimeStampToken();
                    
                    if (token == null) {
                        throw new RuntimeException("TSA Response is OK but Token is null.");
                    }

                    // Extract the time recorded by the TSA
                    Instant tsaInstant = token.getTimeStampInfo().getGenTime().toInstant();
                    LocalDateTime tsaTime = LocalDateTime.ofInstant(tsaInstant, ZoneId.systemDefault());
                    
                    String tokenBase64 = Base64.getEncoder().encodeToString(token.getEncoded());
                    
                    log.info("Successfully received RFC-3161 timestamp: {}", tsaTime);
                    
                    return TSAResult.builder()
                            .tokenBase64(tokenBase64)
                            .timestamp(tsaTime)
                            .build();
                } else {
                    String failInfo = response.getFailInfo() != null ? response.getFailInfo().getString() : "Unknown";
                    throw new RuntimeException("TSA failed to return a valid timestamp. Status: " + response.getStatusString() + ", FailInfo: " + failInfo);
                }
            }

        } catch (Exception e) {
            log.error("Failed to acquire RFC-3161 timestamp", e);
            throw new RuntimeException("Failed to acquire RFC-3161 timestamp: " + e.getMessage(), e);
        }
    }
}
