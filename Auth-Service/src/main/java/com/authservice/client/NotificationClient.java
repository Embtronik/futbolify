package com.authservice.client;

import com.authservice.dto.notification.NotificationRequest;
import com.authservice.dto.notification.NotificationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.util.StringUtils;
import com.authservice.service.JwtService;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationClient {
    
    private final RestTemplate restTemplate;
    private final JwtService jwtService;
    
    @Value("${app.notification-service.url}")
    private String notificationServiceUrl;
    @Value("${app.notification-service.service-token.subject:auth-service}")
    private String serviceTokenSubject;
    @Value("${app.notification-service.service-token.ttl:300000}") // 5 minutos
    private long serviceTokenTtl;
    @Value("${app.notification-service.service-token.aud:notification-service}")
    private String serviceTokenAudience;
    
    public NotificationResponse sendNotification(NotificationRequest request) {
        return sendNotification(request, null);
    }

    public NotificationResponse sendNotification(NotificationRequest request, String bearerJwt) {
        try {
            String url = notificationServiceUrl + "/api/v1/notifications/send";
            
            log.info("Sending notification to: {} via channels: {}", request.getRecipient(), request.getChannels());
            
            // Build headers
            HttpHeaders headers = new HttpHeaders();
            // 1) If an explicit JWT was provided, use it
            if (StringUtils.hasText(bearerJwt)) {
                String value = bearerJwt.startsWith("Bearer ") ? bearerJwt : "Bearer " + bearerJwt;
                headers.set(HttpHeaders.AUTHORIZATION, value);
            } else {
                // 2) Otherwise, try to propagate incoming Authorization header if present (user-driven flows)
                ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attrs != null && attrs.getRequest() != null) {
                    String authHeader = attrs.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
                    if (authHeader != null && !authHeader.isBlank()) {
                        headers.set(HttpHeaders.AUTHORIZATION, authHeader);
                    }
                }
                // 3) If still no Authorization, mint a short-lived service JWT on the fly
                if (!headers.containsKey(HttpHeaders.AUTHORIZATION)) {
                    String token = jwtService.generateServiceToken(
                            serviceTokenSubject,
                            serviceTokenTtl,
                            Map.of("aud", serviceTokenAudience, "typ", "SERVICE")
                    );
                    headers.setBearerAuth(token);
                }
            }

            HttpEntity<NotificationRequest> entity = new HttpEntity<>(request, headers);

            ResponseEntity<NotificationResponse> response = restTemplate.postForEntity(url, entity, NotificationResponse.class);
            
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
