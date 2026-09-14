package com.security_management.backend.service;

import com.security_management.backend.model.user;
import com.security_management.backend.repository.incomplteprofileRepo;
import com.security_management.backend.repository.userRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class setprifileService {

    @Autowired
    private incomplteprofileRepo incomplteprofile;

    @Autowired
    private userRepository userRepository;
    
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

    public user setprofile(user us) {
        if (us == null || us.getUsername() == null || us.getUsername().trim().isEmpty()) {
            throw new RuntimeException("Username/Email cannot be empty");
        }

        String username = us.getUsername().trim();
        us.setUsername(username);

        // Check if user already exists
        user existingUser = userRepository.findByUsername(username);
        if (existingUser != null) {
            existingUser.setFirstName(us.getFirstName());
            existingUser.setLastName(us.getLastName());
            existingUser.setPosition(us.getPosition());
            existingUser.setAadharNumber(us.getAadharNumber());
            existingUser.setPhoneNumber(us.getPhoneNumber());
            if (us.getPassword() != null && !us.getPassword().isEmpty()) {
                existingUser.setPassword(encoder.encode(us.getPassword()));
            }
            if (us.getProfileImage() != null) {
                existingUser.setProfileImage(us.getProfileImage());
            }
            user saved = userRepository.save(existingUser);
            try {
                incomplteprofile.deleteByMail(username);
            } catch (Exception ignored) {}
            return saved;
        }

        // Encode password for new user
        if (us.getPassword() != null && !us.getPassword().startsWith("$2a$")) {
            us.setPassword(encoder.encode(us.getPassword()));
        }

        user saved = userRepository.save(us);
        try {
            incomplteprofile.deleteByMail(username);
        } catch (Exception ignored) {}

        return saved;
    }
}
