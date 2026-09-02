package com.security_management.backend.controller;


import com.security_management.backend.dto.loginRequestDto;
import com.security_management.backend.dto.loginResponseDto;
import com.security_management.backend.model.user;

import com.security_management.backend.serivice.*;
import com.security_management.backend.serivice.loginService;
import com.security_management.backend.serivice.registerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class authRequests {

    @Autowired
    private loginService loginService;

    @Autowired
    private registerService registerService;

    @Autowired
    private authUtl jwtSerive;

    @Autowired
    public emailService emailservice;
    Map<String,String> otps=new HashMap<>();



    public String sendOtp(String mail){

//        String email=req.get("email");
            String email=mail;
        if(registerService.findUser(email)){

            throw new RuntimeException("Email is already taken");
        }
        String otp=String.valueOf((int)(Math.random()*900000)+100000);
        otps.put(email,otp);
        emailservice.sendMail(
                email,
                "Security Management  ",
                "To register for the system use this otp\n.\n Your Otp is : "
                        +otp);
//        verifyOtp(email)
        return "otp Sent";
    }



    @PostMapping("/verify-otp")

    public Map<String,String> verifyOtp(@RequestBody Map<String,String> req){

        String email=req.get("email");
        String otp=req.get("otp");

//        String email=mail;
        Map<String,String> response=new HashMap<>();
        if(otps.containsKey(email) && otps.get(email).equals(otp)){
            otps.remove(email);
            String token=jwtSerive.generateAccessToekn(registerService.getSingleUser(email));
            response.put("status","success");
            response.put("token",token);
            return response;
        }

        response.put("status","error");
        response.put("message","Invalid Otp");

        return response;

    }

    @PostMapping("/login")
    public loginResponseDto login(@RequestBody loginRequestDto logindto){

        return loginService.loginUser(logindto);

    }


    @PostMapping("/register")
    public user registerUser(@RequestBody user user){

        String mail=user.getUsername();
            sendOtp(mail);
        return registerService.registerUser(user);

    }



}
