package com.security_management.backend;

import com.security_management.backend.entity.Status;
import com.security_management.backend.entity.accessList.AccessStatus;
import com.security_management.backend.entity.accessList.case_access;
import com.security_management.backend.entity.cases;
import com.security_management.backend.repository.CaseAccessRepository;
import com.security_management.backend.repository.CaseAccessRequestRepository;
import com.security_management.backend.repository.CaseRepository;
import com.security_management.backend.service.CaseAccessService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccessControlServiceTests {

    @Mock
    private CaseRepository caseRepository;

    @Mock
    private CaseAccessRepository caseAccessRepository;

    @Mock
    private CaseAccessRequestRepository caseAccessRequestRepository;

    @InjectMocks
    private CaseAccessService caseAccessService;

    @Test
    void getAllCasesReturnsOnlyAuthorizedCasesForUser() {
        cases caseOne = new cases();
        caseOne.setCaseId(1);
        caseOne.setCase_number("CASE-101");
        caseOne.setTitle("Case One");
        caseOne.setStatus(Status.OPEN);
        caseOne.setCreatedAt(LocalDateTime.now());
        caseOne.setLastUpdate(LocalDateTime.now());

        cases caseTwo = new cases();
        caseTwo.setCaseId(2);
        caseTwo.setCase_number("CASE-202");
        caseTwo.setTitle("Case Two");
        caseTwo.setStatus(Status.OPEN);
        caseTwo.setCreatedAt(LocalDateTime.now());
        caseTwo.setLastUpdate(LocalDateTime.now());

        case_access authorizedAccess = new case_access();
        authorizedAccess.setCase_id("CASE-101");
        authorizedAccess.setUser_id("USER-42");
        authorizedAccess.setStatus(AccessStatus.ACTIVE);

        when(caseRepository.findByCase_number("CASE-101")).thenReturn(Optional.of(caseOne));
        when(caseAccessRepository.findByUser_id("USER-42")).thenReturn(List.of(authorizedAccess));

        List<cases> result = caseAccessService.getAllCases("USER-42");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCase_number()).isEqualTo("CASE-101");
    }
}
