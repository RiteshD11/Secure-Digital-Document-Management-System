package com.security_management.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class emailService {

    private static final Logger log = LoggerFactory.getLogger(emailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Value("${mailFrom:${spring.mail.username}}")
    private String senderAddress;

    public void sendMail(String email, String subject, String s) {
        SimpleMailMessage mailMessage=new SimpleMailMessage();
        mailMessage.setTo(email);
        mailMessage.setSubject(subject);
        mailMessage.setText(s);
        mailMessage.setFrom(senderAddress);
        try {
            mailSender.send(mailMessage);
        } catch (RuntimeException ex) {
            log.error("OTP email delivery failed. SMTP host={}, port={}, username={}, from={}, recipient={}: {}",
                    "${spring.mail.host}", "${spring.mail.port}", senderAddress, senderAddress, email,
                    ex.getMessage(), ex);
            throw ex;
        }
    }
}
