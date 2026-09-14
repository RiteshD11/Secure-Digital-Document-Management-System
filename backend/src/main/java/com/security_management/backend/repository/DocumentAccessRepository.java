package com.security_management.backend.repository;

import com.security_management.backend.entity.Document;
import com.security_management.backend.entity.accessList.AccessStatus;
import com.security_management.backend.entity.accessList.DocumentAccess;
import com.security_management.backend.entity.accessList.DocumentAccessId;
import com.security_management.backend.model.user;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentAccessRepository extends JpaRepository<DocumentAccess, DocumentAccessId> {

    Optional<DocumentAccess> findByDocumentAndUser(Document document, user user);

    List<DocumentAccess> findByDocument(Document document);

    List<DocumentAccess> findByUser(user user);

    List<DocumentAccess> findByStatus(AccessStatus status);

    List<DocumentAccess> findByDocumentAndStatus(Document document, AccessStatus status);
}
