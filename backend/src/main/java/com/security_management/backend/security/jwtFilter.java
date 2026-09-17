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

         token = tokenHeader.substring(7);

         if (token == null || token.trim().isEmpty()) {
             filterChain.doFilter(request, response);
             return;
         }

         try {
             username = authUtl.extractUserName(token);
         } catch (io.jsonwebtoken.ExpiredJwtException ex) {
             response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
             response.setContentType("application/json");
             response.getWriter().write("{\"error\":\"UNAUTHORIZED\",\"message\":\"Your login session has expired. Please sign in again.\"}");
             return;
         } catch (Exception ex) {
             response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
             response.setContentType("application/json");
             response.getWriter().write("{\"error\":\"UNAUTHORIZED\",\"message\":\"Invalid authorization token.\"}");
             return;
         }

         if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
             try {
                 UserDetails userDetails = context.getBean(userDetailSevice.class).loadUserByUsername(username);
                 if (authUtl.validate(token, userDetails)) {
                     UsernamePasswordAuthenticationToken authToken =
                             new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                     authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                     SecurityContextHolder.getContext().setAuthentication(authToken);
                 }
             } catch (Exception ignored) {
                 // User from token not found in database; let request proceed unauthenticated
             }
         }

         filterChain.doFilter(request, response);


    }
}
