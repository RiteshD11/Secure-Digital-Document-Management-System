package com.security_management.backend.serivice;


import com.security_management.backend.model.user;
import com.security_management.backend.model.userPrincipal;
import com.security_management.backend.repository.userRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class userDetailSevice implements UserDetailsService {
    @Autowired
    public userRepository userRepo;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {

      user u=userRepo.findByUsername(username);
      return new userPrincipal(u);

    }
}
