package com.security_management.backend.controller;

import com.security_management.backend.dto.CaseAccessGrantRequest;
import com.security_management.backend.dto.CaseAccessRequestDto;
import com.security_management.backend.dto.CreateCaseRequest;
import com.security_management.backend.entity.accessList.CaseAccessRequest;
import com.security_management.backend.entity.accessList.case_access;
import com.security_management.backend.entity.cases;
import com.security_management.backend.service.CaseAccessService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class CaseAccessController {

    private final CaseAccessService caseAccessService;

    public CaseAccessController(CaseAccessService caseAccessService) {
        this.caseAccessService = caseAccessService;
    }

    @PostMapping("/cases")
    public ResponseEntity<cases> createCase(@RequestBody CreateCaseRequest request) {
        cases savedCase = caseAccessService.createCase(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedCase);
    }

    @GetMapping("/cases")
    public ResponseEntity<List<cases>> getAllCases() {
        return ResponseEntity.ok(caseAccessService.getAllCases());
    }

    @GetMapping("/cases/{caseNumber}")
    public ResponseEntity<cases> getCase(@PathVariable String caseNumber) {
        return ResponseEntity.ok(caseAccessService.getCase(caseNumber));
    }

    @PostMapping("/cases/{caseNumber}/access")
    public ResponseEntity<case_access> grantCaseAccess(@PathVariable String caseNumber,
                                                    @RequestBody CaseAccessGrantRequest request) {
        case_access access = caseAccessService.grantCaseAccess(caseNumber, String.valueOf(request.getUserId()), request.getGrantedBy());
        return ResponseEntity.status(HttpStatus.CREATED).body(access);
    }

    @GetMapping("/cases/{caseNumber}/access")
    public ResponseEntity<List<case_access>> getCaseUsers(@PathVariable String caseNumber) {
        return ResponseEntity.ok(caseAccessService.getCaseUsers(caseNumber));
    }

    @PostMapping("/cases/{caseNumber}/access/request")
    public ResponseEntity<CaseAccessRequest> requestCaseAccess(@PathVariable String caseNumber,
                                                             @RequestBody CaseAccessRequestDto request) {
        CaseAccessRequest accessRequest = caseAccessService.requestCaseAccess(caseNumber, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(accessRequest);
    }

    @GetMapping("/cases/{caseNumber}/access/requests")
    public ResponseEntity<List<CaseAccessRequest>> getCaseAccessRequests(@PathVariable String caseNumber) {
        return ResponseEntity.ok(caseAccessService.getCaseAccessRequests(caseNumber));
    }

    @PutMapping("/cases/access/requests/{requestId}")
    public ResponseEntity<CaseAccessRequest> reviewCaseAccessRequest(@PathVariable Long requestId,
                                                                     @RequestParam boolean approved,
                                                                     @RequestParam(required = false) String reviewedBy) {
        CaseAccessRequest updatedRequest = caseAccessService.reviewCaseAccessRequest(requestId, approved, reviewedBy);
        return ResponseEntity.ok(updatedRequest);
    }
}
