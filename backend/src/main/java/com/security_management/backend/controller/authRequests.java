package com.security_management.backend.controller;


import com.security_management.backend.dto.loginRequestDto;
import com.security_management.backend.dto.loginResponseDto;
import com.security_management.backend.model.incompleteprofile;
import com.security_management.backend.model.user;

import com.security_management.backend.serivice.*;
import com.security_management.backend.serivice.loginService;
import com.security_management.backend.serivice.registerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class authRequests {

    @Autowired
    private loginService loginService;

    @Autowired
    private registerService registerService;

    @Autowired
    private otpService otpService;

    @Autowired
    private setprifileService setprifileService;

    @Autowired
    private FaceVerificationService faceVerificationService;

    @Autowired
    private com.security_management.backend.repository.userRepository userRepository;

    @Autowired
    private authUtl jwtService;

    @Autowired(required = false)
    private com.security_management.backend.service.FastApiService fastApiService;

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(authRequests.class);

    @PostMapping("/verifyLogin-otp")

    public Map<String,String> verifyLoginOtp(@RequestBody Map<String,String> req){

        String mail=req.get("email");
        String otp=req.get("otp");
        return otpService.verifyOtpForLogin(mail,otp);
    }


    @PostMapping("/verify-otp")

    public Map<String,String> verifyOtp(@RequestBody Map<String,String> req){

        String mail=req.get("email");
        String otp=req.get("otp");
        return otpService.verifyOtp(mail,otp);
    }

    @PostMapping("/login")
    public loginResponseDto login(@RequestBody loginRequestDto logindto){
        System.out.println("User : "+logindto.getUsername()+" , wants to login");

        return loginService.loginUser(logindto);

    }


    @PostMapping("/register")
    public String registerUser(@RequestBody incompleteprofile incompleteprofile){

         registerService.registerUser(incompleteprofile.getMail());
         return "User addded ";

    }

    @PostMapping(value = "/set-profile", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public user setProfileMultipart(
            @RequestParam("username") String username,
            @RequestParam("password") String password,
            @RequestParam("firstName") String firstName,
            @RequestParam("lastName") String lastName,
            @RequestParam(value = "position", required = false, defaultValue = "Investigating Officer") String position,
            @RequestParam(value = "aadharNumber", required = false, defaultValue = "") String aadharNumber,
            @RequestParam(value = "phoneNumber", required = false, defaultValue = "") String phoneNumber,
            @RequestParam(value = "photo", required = false) org.springframework.web.multipart.MultipartFile photo
    ) throws java.io.IOException {

        user us = new user();
        us.setUsername(username);
        us.setPassword(password);
        us.setFirstName(firstName);
        us.setLastName(lastName);
        us.setPosition(position);
        us.setAadharNumber(aadharNumber);
        us.setPhoneNumber(phoneNumber);

        if (photo != null && !photo.isEmpty()) {
            // Validation: Max file size 5MB
            if (photo.getSize() > 5 * 1024 * 1024) {
                throw new IllegalArgumentException("Profile photo exceeds maximum limit of 5MB");
            }
            // Validation: Image format
            String contentType = photo.getContentType();
            if (contentType == null || (!contentType.equalsIgnoreCase("image/jpeg") &&
                    !contentType.equalsIgnoreCase("image/png") &&
                    !contentType.equalsIgnoreCase("image/webp") &&
                    !contentType.equalsIgnoreCase("image/jpg"))) {
                throw new IllegalArgumentException("Invalid photo format. Only JPG, PNG, and WEBP are supported.");
            }
            us.setProfileImage(photo.getBytes());
        }

        user savedUser = setprifileService.setprofile(us);

        // Forward original profile photo and userId to FastAPI for AI biometric registration & storage
        if (photo != null && !photo.isEmpty() && fastApiService != null) {
            try {
                log.info("Forwarding original profile photo and userId '{}' to FastAPI biometric storage...", username);
                fastApiService.registerFace(username, photo);
                log.info("Successfully registered profile photo in FastAPI for userId: {}", username);
            } catch (Exception e) {
                log.warn("FastAPI face registration call failed during signup for user {}: {}. Profile is saved in database.", username, e.getMessage());
            }
        }

        return savedUser;
    }

    @PostMapping(value = "/set-profile", consumes = org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
    public user setProfile(@RequestBody user us){
        return setprifileService.setprofile(us);
    }

    @PostMapping(value = "/face-login", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public org.springframework.http.ResponseEntity<?> faceLogin(
            @RequestParam("email") String email,
            @RequestParam("livePhoto") org.springframework.web.multipart.MultipartFile livePhoto
    ) {
        if (email == null || email.trim().isEmpty()) {
            return org.springframework.http.ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "Email/Username is required for face sign-in."
            ));
        }

        String username = email.trim();
        user us = userRepository.findByUsername(username);
        if (us == null) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", "error",
                    "message", "Officer profile not found. Please verify your email or register first."
            ));
        }

        if (us.getProfileImage() == null || us.getProfileImage().length == 0) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", "error",
                    "message", "No registered reference photo found for this officer. Please log in with password."
            ));
        }

        if (livePhoto == null || livePhoto.isEmpty()) {
            return org.springframework.http.ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "Live captured photo is required."
            ));
        }

        // Validation: Max file size 5MB
        if (livePhoto.getSize() > 5 * 1024 * 1024) {
            return org.springframework.http.ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "Captured photo exceeds maximum permitted size of 5MB."
            ));
        }

        // Validation: Image format
        String contentType = livePhoto.getContentType();
        if (contentType == null || (!contentType.equalsIgnoreCase("image/jpeg") &&
                !contentType.equalsIgnoreCase("image/png") &&
                !contentType.equalsIgnoreCase("image/webp") &&
                !contentType.equalsIgnoreCase("image/jpg"))) {
            return org.springframework.http.ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "Invalid photo format. Only JPG, PNG, and WEBP are supported."
            ));
        }

        try {
            byte[] liveBytes = livePhoto.getBytes();
            com.security_management.backend.dto.FaceVerificationResult result =
                    faceVerificationService.verifyFace(us.getUsername(), us.getProfileImage(), liveBytes);

            if (result.isMatched()) {
                String token = jwtService.generateAccessToekn(us);
                Map<String, Object> response = new java.util.HashMap<>();
                response.put("status", "success");
                response.put("message", "Face verification successful.");
                response.put("token", token);
                response.put("username", us.getUsername());
                response.put("role", us.getPosition() != null ? us.getPosition() : "Investigating Officer");
                response.put("firstName", us.getFirstName());
                response.put("lastName", us.getLastName());
                response.put("confidence", result.getSimilarityScore());
                return org.springframework.http.ResponseEntity.ok(response);
            } else {
                return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body(Map.of(
                        "status", "error",
                        "message", result.getMessage() != null ? result.getMessage() : "Face verification failed. Please try again."
                ));
            }
        } catch (Exception e) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error",
                    "message", "Face verification pipeline error: " + e.getMessage()
            ));
        }
    }



}
