package com.security_management.backend.audit;

import com.security_management.backend.entity.AuditLog;
import com.security_management.backend.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;

    @Autowired
    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public AuditLog logEvent(String userId, String documentId, String caseId,
                             String action, String result, String ipAddress, String details) {
        AuditLog auditLog = AuditLog.builder()
                .userId(userId != null ? userId : "SYSTEM")
                .documentId(documentId)
                .caseId(caseId)
                .action(action)
                .result(result)
                .ipAddress(ipAddress != null ? ipAddress : "127.0.0.1")
                .details(details)
                .timestamp(LocalDateTime.now())
                .build();

        AuditLog saved = auditLogRepository.save(auditLog);
        log.info("AUDIT LOG [{}] Action={} Doc={} Case={} User={} Result={}",
                saved.getId(), action, documentId, caseId, userId, result);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAllAuditLogs() {
        return auditLogRepository.findAllByOrderByTimestampDesc();
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsForDocument(String documentId) {
        return auditLogRepository.findByDocumentIdOrderByTimestampDesc(documentId);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsForCase(String caseId) {
        return auditLogRepository.findByCaseIdOrderByTimestampDesc(caseId);
    }
}
