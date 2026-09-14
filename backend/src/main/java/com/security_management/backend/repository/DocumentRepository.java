package com.security_management.backend.repository;

import com.security_management.backend.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, String> {
    List<Document> findByCaseIdOrderByCreatedAtDesc(String caseId);
    List<Document> findAllByOrderByCreatedAtDesc();
}
