package com.authservice.service;

import com.authservice.client.NotificationClient;
import com.authservice.dto.notification.NotificationRequest;
import com.authservice.dto.notification.NotificationResponse;
import com.authservice.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {
    
    private final NotificationClient notificationClient;
    
    @Value("${app.frontend.url}")
    private String frontendUrl;
    
    @Async
    public void sendVerificationEmail(User user, String token) {
        // Mantener compatibilidad: sin JWT explícito
        sendVerificationEmail(user, token, null);
    }

    @Async
    public void sendVerificationEmail(User user, String token, String bearerJwt) {
        String verificationUrl = frontendUrl + "/verify-email?token=" + token;
        
        Map<String, Object> variables = new HashMap<>();
        variables.put("userName", user.getFirstName());
        variables.put("verificationUrl", verificationUrl);
        variables.put("expirationHours", 24);
        
        NotificationRequest request = NotificationRequest.builder()
                .channels(List.of("EMAIL"))
                .recipient(user.getEmail())
                .subject("Verifica tu cuenta - Auth Service")
                .templateType("EMAIL_VERIFICATION")
                .variables(variables)
                .serviceOrigin("auth-service")
                .build();
        
        NotificationResponse response = notificationClient.sendNotification(request, bearerJwt);
        
        if (!response.isSuccess()) {
            log.error("Failed to send verification email to {}: {}", user.getEmail(), response.getMessage());
        }
    }
    
    @Async
    public void sendWelcomeEmail(User user) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("firstName", user.getFirstName());
        variables.put("lastName", user.getLastName());
        variables.put("fullName", user.getFirstName() + " " + user.getLastName());
        
        NotificationRequest request = NotificationRequest.builder()
                .channels(List.of("EMAIL"))
                .recipient(user.getEmail())
                .subject("¡Bienvenido a Auth Service!")
                .templateType("WELCOME_EMAIL")
                .variables(variables)
                .serviceOrigin("auth-service")
                .build();
        
        NotificationResponse response = notificationClient.sendNotification(request);
        
        if (!response.isSuccess()) {
            log.error("Failed to send welcome email to {}: {}", user.getEmail(), response.getMessage());
        }
    }
}
