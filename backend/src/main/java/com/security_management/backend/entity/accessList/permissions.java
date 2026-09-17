package com.security_management.backend.entity.accessList;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
public class permissions {


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer permissionId;

    private String permissionName;


}

/*
permissions
────────────────────
permission_id | name
1             | VIEW
2             | DOWNLOAD
3             | UPLOAD
4             | EDIT
5             | SHARE
6             | DELETE
7             | ADMIN
 */