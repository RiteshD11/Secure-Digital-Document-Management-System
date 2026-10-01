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

    public void registerUser(String mail) {
        if (mail == null || mail.isBlank()) {
            throw new IllegalArgumentException("Email is required for registration.");
        }

        String normalizedMail = mail.trim();
        if (!normalizedMail.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            throw new IllegalArgumentException("Please provide a valid email address.");
        }

        if (userRepository != null && userRepository.findByUsername(normalizedMail) != null) {
            throw new RuntimeException("Email is already taken");
        }

        otpService.sendOtp(normalizedMail);

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
        if (email == null || email.isBlank()) {
            return false;
        }

        return (userRepository != null && userRepository.findByUsername(email.trim()) != null);
    }

}
