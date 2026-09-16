package com.security_management.backend.service;


import com.security_management.backend.dto.loginRequestDto;
import com.security_management.backend.dto.loginResponseDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;

@Service
public class loginService {

    @Autowired
    private authUtl authUtl;

    @Autowired
    private registerService registerService;

    @Autowired
    private otpService otpService;

    @Autowired
    private AuthenticationManager authenticationManager;
    public loginResponseDto loginUser( loginRequestDto logindto){

            if (logindto == null || logindto.getUsername() == null || logindto.getUsername().trim().isEmpty()) {
                    throw new IllegalArgumentException("Username or email is required.");
            }

            String username = logindto.getUsername().trim();

        Authentication authentication=authenticationManager.authenticate(
                                new UsernamePasswordAuthenticationToken(username,logindto.getPassword())

                /*
                Here in this code we are giving the details to the Authentication Manager
                 */
        );


      if(authentication.isAuthenticated()){
          try {
              otpService.sendOtpForLogin(username);
          } catch (MailException ex) {
              String reason = ex.getMostSpecificCause() != null
                      ? ex.getMostSpecificCause().getMessage()
                      : ex.getMessage();
              throw new IllegalStateException(
                      "Credentials accepted, but the login OTP could not be sent: " + reason, ex);
          }
//          user use =registerService.getSingleUser(logindto.getUsername());

//            String token=authUtl.generateAccessToekn(use);



      }
          return new loginResponseDto();




    }

}
