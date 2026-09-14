package com.security_management.backend.controller;

import com.security_management.backend.model.user;
import com.security_management.backend.service.userDetailSevice;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("admin")
public class adminRequests {

    @Autowired
    public userDetailSevice userDetailService;

    @GetMapping("home")
    public String home(){
        return "Into in the Admin home page";
    }
    @GetMapping("allusers")
    public List<user> dash(){
        System.out.println("Into dahsboard");
        return userDetailService.allusers();
    }
}
