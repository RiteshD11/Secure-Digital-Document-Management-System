package com.security_management.backend.security;


import com.security_management.backend.service.authUtl;
import com.security_management.backend.service.userDetailSevice;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class jwtFilter extends OncePerRequestFilter {

    @Autowired
    public authUtl authUtl;

    @Autowired
    public userDetailSevice userDetailSevice;

    @Autowired
    ApplicationContext context;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {


         String tokenHeader= request.getHeader("Authorization");
         String token=null;
         String username=null;

         if(tokenHeader==null || !tokenHeader.startsWith("Bearer ")){
             filterChain.doFilter(request,response);
             return;
         }

        token=tokenHeader.substring(7);

         if(token==null){
             throw new RuntimeException("No Token Present ");
         }
         username=authUtl.extractUserName(token);
        if(token!=null){
//            Optional<Token> tokenOpt = tokenRespository.findByToken(token);

            if (token.isEmpty() || authUtl.isTokenExpired(token)) {

                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return; // stop request
            }
        }
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

            UserDetails userDetails=context.getBean(userDetailSevice.class).loadUserByUsername(username);
            if (authUtl.validate(token,userDetails)){
                UsernamePasswordAuthenticationToken authToken=
                        new UsernamePasswordAuthenticationToken(userDetails,null,userDetails.getAuthorities());

                // now we are assigning the token to SecurityContextHolder

                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request,response);


    }
}
