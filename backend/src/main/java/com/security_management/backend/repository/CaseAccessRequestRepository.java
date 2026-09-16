package com.security_management.backend.repository;

import com.security_management.backend.entity.accessList.CaseAccessRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CaseAccessRequestRepository extends JpaRepository<CaseAccessRequest, Long> {

    List<CaseAccessRequest> findByCaseIdOrderByCreatedAtDesc(String caseId);
}
