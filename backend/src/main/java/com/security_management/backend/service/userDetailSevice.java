package com.security_management.backend.service;


import com.security_management.backend.model.user;
import com.security_management.backend.model.userPrincipal;
import com.security_management.backend.repository.userRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class userDetailSevice implements UserDetailsService {
    @Autowired
    public userRepository userRepo;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        user u = userRepo.findByUsername(username);
        if (u == null) {
            throw new UsernameNotFoundException("User not found with username: " + username);
        }
        return new userPrincipal(u);
    }

    public List<user> allusers(){
       return userRepo.findAll();
    }
}
