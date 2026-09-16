package com.security_management.backend.repository;

import com.security_management.backend.entity.accessList.DocumentAccessRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentAccessRequestRepository extends JpaRepository<DocumentAccessRequest, Long> {

    List<DocumentAccessRequest> findByDocumentIdOrderByCreatedAtDesc(String documentId);

    boolean existsByDocumentIdAndRequestedUserIdAndStatus(String documentId, Integer requestedUserId, String status);
}
