package com.security_management.backend.service;

import com.security_management.backend.dto.CaseAccessGrantRequest;
import com.security_management.backend.dto.CaseAccessRequestDto;
import com.security_management.backend.dto.CreateCaseRequest;
import com.security_management.backend.entity.Status;
import com.security_management.backend.entity.accessList.AccessStatus;
import com.security_management.backend.entity.accessList.CaseAccessRequest;
import com.security_management.backend.entity.accessList.case_access;
import com.security_management.backend.entity.cases;
import com.security_management.backend.repository.CaseAccessRepository;
import com.security_management.backend.repository.CaseAccessRequestRepository;
import com.security_management.backend.repository.CaseRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class CaseAccessService {

    private final CaseRepository caseRepository;
    private final CaseAccessRepository caseAccessRepository;
    private final CaseAccessRequestRepository caseAccessRequestRepository;

    public CaseAccessService(CaseRepository caseRepository,
                             CaseAccessRepository caseAccessRepository,
                             CaseAccessRequestRepository caseAccessRequestRepository) {
        this.caseRepository = caseRepository;
        this.caseAccessRepository = caseAccessRepository;
        this.caseAccessRequestRepository = caseAccessRequestRepository;
    }

    @Transactional
    public cases createCase(CreateCaseRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("CreateCaseRequest is required.");
        }

        String caseNumber = normalizeRequired(request.getCaseNumber(), "caseNumber");
        String title = normalizeRequired(request.getTitle(), "title");
        String createdBy = normalizeOptional(request.getCreatedBy(), "SYSTEM");

        if (caseRepository.existsByCase_number(caseNumber)) {
            throw new IllegalStateException("Case with case number " + caseNumber + " already exists.");
        }

        cases newCase = new cases();
        newCase.setCase_number(caseNumber);
        newCase.setTitle(title);
        newCase.setDescription(request.getDescription());
        newCase.setStatus(Status.OPEN);
        newCase.setCreated_by(createdBy);
        newCase.setCreatedAt(LocalDateTime.now());
        newCase.setLastUpdate(LocalDateTime.now());

        cases savedCase = caseRepository.save(newCase);
        grantCaseAccess(savedCase.getCase_number(), createdBy, createdBy);
        return savedCase;
    }

    @Transactional(readOnly = true)
    public List<cases> getAllCases() {
        return caseRepository.findAll();
    }

    @Transactional(readOnly = true)
    public cases getCase(String caseNumber) {
        return caseRepository.findByCase_number(caseNumber)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseNumber));
    }

    @Transactional
    public case_access grantCaseAccess(String caseNumber, String userId, String grantedBy) {
        String normalizedCaseNumber = normalizeRequired(caseNumber, "caseNumber");
        String normalizedUserId = normalizeRequired(userId, "userId");
        String normalizedGrantedBy = normalizeOptional(grantedBy, "SYSTEM");

        cases targetCase = caseRepository.findByCase_number(normalizedCaseNumber)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + normalizedCaseNumber));

        Optional<case_access> existingAccess = caseAccessRepository.findByCase_idAndUser_id(normalizedCaseNumber, normalizedUserId);
        if (existingAccess.isPresent()) {
            case_access access = existingAccess.get();
            access.setGrantedBy(normalizedGrantedBy);
            access.setGrantedAt(LocalDateTime.now());
            access.setStatus(AccessStatus.ACTIVE);
            access.setExpiredAt(null);
            return caseAccessRepository.save(access);
        }

        case_access access = new case_access();
        access.setCase_id(normalizedCaseNumber);
        access.setUser_id(normalizedUserId);
        access.setGrantedBy(normalizedGrantedBy);
        access.setGrantedAt(LocalDateTime.now());
        access.setExpiredAt(null);
        access.setStatus(AccessStatus.ACTIVE);
        return caseAccessRepository.save(access);
    }

    @Transactional(readOnly = true)
    public List<case_access> getCaseUsers(String caseNumber) {
        String normalized = normalizeRequired(caseNumber, "caseNumber");
        getCase(normalized);
        return caseAccessRepository.findByCase_id(normalized);
    }

    @Transactional
    public CaseAccessRequest requestCaseAccess(String caseNumber, CaseAccessRequestDto request) {
        String normalizedCaseNumber = normalizeRequired(caseNumber, "caseNumber");
        getCase(normalizedCaseNumber);

        if (request == null) {
            throw new IllegalArgumentException("Request body is required.");
        }

        String requestedUserId = normalizeRequired(request.getRequestedUserId(), "requestedUserId");
        String requestedBy = normalizeOptional(request.getRequestedBy(), "SYSTEM");

        CaseAccessRequest accessRequest = new CaseAccessRequest();
        accessRequest.setCaseId(normalizedCaseNumber);
        accessRequest.setRequestedUserId(requestedUserId);
        accessRequest.setRequestedBy(requestedBy);
        accessRequest.setReason(request.getReason());
        accessRequest.setStatus("PENDING");
        accessRequest.setCreatedAt(LocalDateTime.now());
        return caseAccessRequestRepository.save(accessRequest);
    }

    @Transactional(readOnly = true)
    public List<CaseAccessRequest> getCaseAccessRequests(String caseNumber) {
        String normalized = normalizeRequired(caseNumber, "caseNumber");
        getCase(normalized);
        return caseAccessRequestRepository.findByCaseIdOrderByCreatedAtDesc(normalized);
    }

    @Transactional
    public CaseAccessRequest reviewCaseAccessRequest(Long requestId, boolean approved, String reviewedBy) {
        if (requestId == null) {
            throw new IllegalArgumentException("requestId is required.");
        }

        CaseAccessRequest request = caseAccessRequestRepository.findById(requestId)
                .orElseThrow(() -> new EntityNotFoundException("Access request not found: " + requestId));

        String normalizedReviewBy = normalizeOptional(reviewedBy, "SYSTEM");
        request.setReviewedBy(normalizedReviewBy);
        request.setReviewedAt(LocalDateTime.now());

        if (approved) {
            grantCaseAccess(request.getCaseId(), request.getRequestedUserId(), normalizedReviewBy);
            request.setStatus("APPROVED");
        } else {
            request.setStatus("REJECTED");
        }

        return caseAccessRequestRepository.save(request);
    }

    private String normalizeRequired(String value, String fieldName) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(fieldName + " is required.");
        }
        return value.trim();
    }

    private String normalizeOptional(String value, String fallback) {
        return (value == null || value.trim().isEmpty()) ? fallback : value.trim();
    }
}
