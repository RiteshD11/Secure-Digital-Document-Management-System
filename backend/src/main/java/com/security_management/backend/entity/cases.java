package com.security_management.backend.entity;


import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.checkerframework.common.aliasing.qual.Unique;
import org.simpleframework.xml.Default;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
public class cases {


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer caseId;

    @NotNull @Unique
    private String case_number;

    @NotNull
    private String title;

    private String description;

    @Enumerated(EnumType.STRING)
    private Status status;

//     Here we are adding the user_id who created it
    private String created_by;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime lastUpdate = LocalDateTime.now();


}

/*


                         USERS
                           │
             ┌─────────────┴──────────────┐
             │                            │
             ▼                            ▼
             
        USER_ROLES                    CASES
             │                            │
             │                     ┌──────┴──────┐
             │                     │             │
             ▼                     ▼             ▼
           ROLES              CASE_ACCESS    DOCUMENTS
                                               │
                                               │
                                        ┌──────┴────────┐
                                        ▼               ▼
                                DOCUMENT_ACCESS   DOCUMENT_VERSIONS
                                        │
                                        │
                                        ▼
                                  AUDIT_EVENTS

cases
────────────────────────────────────────
case_id
case_number
title
description
case_type
status
created_by
created_at
updated_at



 */