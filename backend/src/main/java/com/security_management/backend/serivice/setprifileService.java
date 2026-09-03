package com.security_management.backend.serivice;

import com.security_management.backend.model.user;
import com.security_management.backend.repository.incomplteprofileRepo;
import com.security_management.backend.repository.userRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class setprifileService {

    @Autowired
    private incomplteprofileRepo incomplteprofile;

    @Autowired
    private userRepository userRepository;
    private BCryptPasswordEncoder encoder=new BCryptPasswordEncoder(12);

    public user setprofile(user us){

        if(incomplteprofile.findByMail(us.getUsername())!=null){
            us.setPassword(encoder.encode(us.getPassword()));

            userRepository.save(us);
            incomplteprofile.deleteByMail(us.getUsername());
        }
        return userRepository.findByUsername(us.getUsername());
    }
}
