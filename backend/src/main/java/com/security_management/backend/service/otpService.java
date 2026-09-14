package com.security_management.backend.service;

import com.security_management.backend.model.incompleteprofile;
import com.security_management.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class otpService {

    Map<String,String> otps=new HashMap<>();

    @Autowired
    private registerService registerService;

    @Autowired
    public emailService emailservice;

    @Autowired
    private authUtl jwtSerive;

    @Autowired
    private incomplteprofileRepo incomplteprofileRepo;

    public  String sendOtpForLogin(String mail){
        if(!registerService.findUser(mail)){

            throw new RuntimeException("Email not found ");
        }
        String otp=String.valueOf((int)(Math.random()*900000)+100000);
        otps.put(mail,otp);
        emailservice.sendMail(
                mail,
                "Secure Document Management  ",
                "This email is related with the security concern\n" +
                        "Do not share with anyone\n"+
                        "\n Your Otp is : "
                        +otp);
        return "otp Sent";
    }

    public  Map<String,String> verifyOtpForLogin(String mail,String otp){

        Map<String,String> response=new HashMap<>();
        if(otps.containsKey(mail) && otps.get(mail).equals(otp)){
            otps.remove(mail);
            response.put("status","success");
            response.put("message","OTP verified successfully. Proceed to face authentication.");
            return response;
        }

        response.put("status","error");
        response.put("message","Invalid Otp");

        return response;
    }
    public String sendOtp(String mail){

        if(registerService.findUser(mail)){

            throw new RuntimeException("Email is already taken");
        }
        String otp=String.valueOf((int)(Math.random()*900000)+100000);
        otps.put(mail,otp);
        emailservice.sendMail(
                mail,
                "Secure Document Management  ",
                "This email is related with the security concern\n" +
                        "Do not share with anyone\n"+
                        "\n Your Otp is : "
                        +otp);
        return "otp Sent";
    }


    public Map<String,String> verifyOtp(String mail,String otp){
        Map<String,String> response=new HashMap<>();
        if(!otps.containsKey(mail) || !otps.get(mail).equals(otp)){
            response.put("status","error");
            response.put("message","Invalid Otp");

            return response;
        }
        otps.remove(mail);
        response.put("status","success");
        response.put("message","verification Successfull");

        incomplteprofileRepo.save(new incompleteprofile(mail));
        return response;

    }

}
