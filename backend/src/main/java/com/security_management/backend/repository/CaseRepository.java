package com.security_management.backend.repository;

import com.security_management.backend.entity.cases;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CaseRepository extends JpaRepository<cases, Integer> {

    @Query("SELECT c FROM cases c WHERE c.case_number = :caseNumber")
    Optional<cases> findByCase_number(@Param("caseNumber") String caseNumber);

    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END FROM cases c WHERE c.case_number = :caseNumber")
    boolean existsByCase_number(@Param("caseNumber") String caseNumber);
}
