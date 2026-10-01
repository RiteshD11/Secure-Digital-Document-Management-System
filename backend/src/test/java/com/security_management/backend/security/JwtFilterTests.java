package com.security_management.backend.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class JwtFilterTests {

    @Test
    void doFilterInternal_shouldSkipWhenAuthorizationHeaderMissing() {
        jwtFilter filter = new jwtFilter();
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = new MockFilterChain();

        assertDoesNotThrow(() -> filter.doFilterInternal(request, response, chain));
    }
}
