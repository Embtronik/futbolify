package com.authservice.client;

import com.authservice.dto.notification.NotificationRequest;
import com.authservice.dto.notification.NotificationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationClient {
    
    private final RestTemplate restTemplate;
    
    @Value("${app.notification-service.url}")
    private String notificationServiceUrl;
    
    public NotificationResponse sendNotification(NotificationRequest request) {
        try {
            String url = notificationServiceUrl + "/api/v1/notifications/send";
            
            log.info("Sending notification to: {} via channels: {}", request.getRecipient(), request.getChannels());
            
            ResponseEntity<NotificationResponse> response = restTemplate.postForEntity(
                url,
                request,
                NotificationResponse.class
            );
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("Notification sent successfully to: {}", request.getRecipient());
                return response.getBody();
            } else {
                log.error("Failed to send email notification. Status: {}", response.getStatusCode());
                return NotificationResponse.builder()
                    .success(false)
                    .message("Failed to send email notification")
                    .build();
            }
        } catch (Exception e) {
            log.error("Error sending notification to {}: {}", request.getRecipient(), e.getMessage(), e);
            return NotificationResponse.builder()
                .success(false)
                .message("Error sending notification: " + e.getMessage())
                .build();
        }
    }
}
