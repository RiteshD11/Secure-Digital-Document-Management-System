package com.security_management.backend.entity.accessList;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
public class case_access {

    @Id
    @GeneratedValue(strategy =GenerationType.IDENTITY)
    private Integer srNo;

    private String case_id;

    private String user_id;

    private String grantedBy;

    private LocalDateTime grantedAt = LocalDateTime.now();

    private LocalDateTime expiredAt = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    private AccessStatus status;
}
/*
case_access
──────────────────────────────────────────────
id
case_id
user_id
permission
granted_by
granted_at
expires_at
status
 */
