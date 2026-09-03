package com.security_management.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("admin")
public class adminRequests {

    @GetMapping("home")
    public String home(){
        return "Into in the Admin home page";
    }
}
