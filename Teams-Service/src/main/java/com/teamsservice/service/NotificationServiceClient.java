package com.teamsservice.service;

import com.teamsservice.dto.NotificationSendRequest;
import com.teamsservice.dto.UserInfoDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

/**
 * Cliente para invocar el notification-service y enviar notificaciones multicanal.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceClient {

    private final RestTemplate restTemplate;
    private final AuthServiceClient authServiceClient;

    @Value("${app.notification-service.url:http://localhost:8081}")
    private String notificationServiceUrl;

    @Async
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

    /**
     * Busca el teléfono del usuario en auth-service y construye el request multicanal,
     * todo de forma asíncrona para no bloquear el hilo del caller.
     */
    @Async
    public void sendWithPhoneLookup(String email, String subject, String body, String serviceOrigin) {
        try {
            UserInfoDto userInfo = authServiceClient.getUserByEmail(email);

            String phone = null;
            if (userInfo != null
                    && userInfo.getCountryCode() != null
                    && userInfo.getPhoneNumber() != null) {
                phone = userInfo.getCountryCode() + userInfo.getPhoneNumber();
            }

            List<String> channels = new ArrayList<>();
            channels.add("EMAIL");
            if (phone != null && !phone.isBlank()) {
                channels.add("WHATSAPP");
                channels.add("SMS");
            }

            NotificationSendRequest request = NotificationSendRequest.builder()
                    .channels(channels)
                    .recipient(email)
                    .recipientPhone(phone)
                    .subject(subject)
                    .body(body)
                    .serviceOrigin(serviceOrigin)
                    .build();

            String url = notificationServiceUrl + "/api/v1/notifications/send";
            log.info("Sending notification (with phone lookup) to {} via {}", email, channels);
            restTemplate.postForObject(url, request, Void.class);
        } catch (Exception e) {
            log.error("Error sending notification to {}: {}", email, e.getMessage());
        }
    }
}
