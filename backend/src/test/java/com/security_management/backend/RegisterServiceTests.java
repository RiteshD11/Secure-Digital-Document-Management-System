package com.security_management.backend;

import com.security_management.backend.service.otpService;
import com.security_management.backend.service.registerService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertThrows;

class RegisterServiceTests {

    @Test
    void registerUser_shouldRejectBlankEmail() {
        registerService service = new registerService();
        ReflectionTestUtils.setField(service, "otpService", new otpService() {
            @Override
            public String sendOtp(String mail) {
                return "otp Sent";
            }
        });

        assertThrows(IllegalArgumentException.class, () -> service.registerUser("   "));
    }
}
