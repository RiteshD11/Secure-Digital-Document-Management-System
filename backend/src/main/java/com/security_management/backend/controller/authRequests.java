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

    @PostMapping("/set-profile")

    public user setProfile(@RequestBody user us){

        return setprifileService.setprofile(us);
    }



}
