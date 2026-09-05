package com.security_management.backend.repository;


import com.security_management.backend.model.user;
import org.springframework.data.jpa.repository.JpaRepository;


public interface userRepository extends JpaRepository<user,Integer> {

    user findByUsername(String username);

}
