package com.security_management.backend.repository;

import com.security_management.backend.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findAllByOrderByTimestampDesc();
    List<AuditLog> findByDocumentIdOrderByTimestampDesc(String documentId);
    List<AuditLog> findByCaseIdOrderByTimestampDesc(String caseId);
}
