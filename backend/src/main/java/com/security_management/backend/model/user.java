package com.security_management.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
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
    private String SecondName;
    @NotNull
    private String position;

    @Lob // large object
    private byte[] imageData;




}
