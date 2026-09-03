package com.security_management.backend.serivice;


import com.security_management.backend.dto.loginRequestDto;
import com.security_management.backend.dto.loginResponseDto;
import com.security_management.backend.model.user;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestBody;

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


        Authentication authentication=authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(logindto.getUsername(),logindto.getPassword())

                /*
                Here in this code we are giving the details to the Authentication Manager
                 */
        );


      if(authentication.isAuthenticated()){
          otpService.sendOtpForLogin(logindto.getUsername());
//          user use =registerService.getSingleUser(logindto.getUsername());

//            String token=authUtl.generateAccessToekn(use);



      }
          return new loginResponseDto();




    }

}
