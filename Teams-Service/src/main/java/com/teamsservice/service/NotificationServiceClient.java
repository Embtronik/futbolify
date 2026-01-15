package com.teamsservice.service;

import com.teamsservice.dto.NotificationSendRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Cliente para invocar el notification-service y enviar notificaciones multicanal.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceClient {

    private final RestTemplate restTemplate;

    @Value("${app.notification-service.url:http://localhost:8081}")
    private String notificationServiceUrl;

    public void sendNotification(NotificationSendRequest request) {
        String url = notificationServiceUrl + "/api/v1/notifications/send";
        try {
            log.info("Sending notification to {} via {} using {}", request.getRecipient(), request.getChannels(), url);
            restTemplate.postForObject(url, request, Void.class);
        } catch (RestClientException e) {
            log.error("Error sending notification to {}: {}", request.getRecipient(), e.getMessage());
            log.error("Notification service URL configured: {}", notificationServiceUrl);
            log.error("Full exception:", e);
        }
    }
}
