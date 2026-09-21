package com.security_management.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class user {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer userId;

    @NotNull
    private String username;
    @NotNull
    private String password;

    @NotNull
    private String firstName;
    @NotNull
    private String lastName;
    @NotNull
    private String position;

    @NotNull
    private String aadharNumber;

    @NotNull
    private String phoneNumber;

    // @NotNull
    @Lob // large object
    @Column(name = "profile_image", columnDefinition = "LONGBLOB")
    private byte[] profileImage;

}
