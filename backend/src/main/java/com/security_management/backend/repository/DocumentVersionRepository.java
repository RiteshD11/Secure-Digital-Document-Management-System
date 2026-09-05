package com.security_management.backend.repository;

import com.security_management.backend.entity.DocumentVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, Long> {
    List<DocumentVersion> findByDocumentIdOrderByVersionNumberDesc(String documentId);
    Optional<DocumentVersion> findByDocumentIdAndVersionNumber(String documentId, Integer versionNumber);
    Optional<DocumentVersion> findTopByDocumentIdOrderByVersionNumberDesc(String documentId);
}
