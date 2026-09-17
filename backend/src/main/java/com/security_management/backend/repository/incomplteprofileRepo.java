package com.security_management.backend.repository;

import com.security_management.backend.model.incompleteprofile;
import com.security_management.backend.model.user;
import org.springframework.data.jpa.repository.JpaRepository;

public interface incomplteprofileRepo extends JpaRepository<incompleteprofile,Integer> {

    incompleteprofile findByMail(String mail);

    void deleteByMail(String mail);
}
