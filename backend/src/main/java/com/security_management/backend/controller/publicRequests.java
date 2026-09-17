package com.security_management.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public")
public class publicRequests {

    @GetMapping("/home")
    public String home(){
        return "Into the Public Home Page";
    }
}
