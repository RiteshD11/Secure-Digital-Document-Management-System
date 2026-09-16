package com.security_management.backend.repository;

import com.security_management.backend.entity.accessList.case_access;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CaseAccessRepository extends JpaRepository<case_access, Integer> {

    @Query("SELECT ca FROM case_access ca WHERE ca.case_id = :caseId")
    List<case_access> findByCase_id(@Param("caseId") String caseId);

    @Query("SELECT ca FROM case_access ca WHERE ca.user_id = :userId")
    List<case_access> findByUser_id(@Param("userId") String userId);

    @Query("SELECT ca FROM case_access ca WHERE ca.case_id = :caseId AND ca.user_id = :userId")
    Optional<case_access> findByCase_idAndUser_id(@Param("caseId") String caseId, @Param("userId") String userId);

    @Query("SELECT CASE WHEN COUNT(ca) > 0 THEN true ELSE false END FROM case_access ca WHERE ca.case_id = :caseId AND ca.user_id = :userId")
    boolean existsByCase_idAndUser_id(@Param("caseId") String caseId, @Param("userId") String userId);
}
