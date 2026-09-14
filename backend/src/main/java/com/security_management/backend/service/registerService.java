package com.security_management.backend.service;


import com.security_management.backend.model.user;
import com.security_management.backend.repository.userRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class registerService {


    @Autowired
    private emailService emailService;

    @Autowired
    private otpService otpService;
    @Autowired
    public userRepository userRepository;
    private BCryptPasswordEncoder encoder=new BCryptPasswordEncoder(12);

    public void registerUser(String  mail){

        otpService.sendOtp(mail);

/*
//         Here Code for the otp
        String sub="Registration Successfull..";
        String email=use.getUsername();
        String body="WEL-COME\nDear User,\nYou are suceessfully register to Security Management \n";



        emailService.sendMail(email,sub,body);
        use.setPassword(encoder.encode(use.getPassword()));

        userRepository.save(use);

 */
//       return null;
    }

    public user getSingleUser(String username){
        return userRepository.findByUsername(username);
    }
    public boolean findUser(String email){

        return (userRepository.findByUsername(email)!=null)?true:false;
    }

}
