package io.github.giovanny.notifications.controller;

import io.github.giovanny.notifications.domain.model.NotificationRequest;
import io.github.giovanny.notifications.domain.model.NotificationResponse;
import io.github.giovanny.notifications.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Controlador REST para gestión de notificaciones.
 * Expone endpoints para que otros microservicios envíen notificaciones.
 * 
 * Requiere autenticación JWT validada por Auth Service.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {
    
    private final NotificationService notificationService;
    
    /**
     * Envía una notificación a través de uno o múltiples canales.
     * Soporta dos modos:
     * 1. Con template: especificar templateType y variables
     * 2. Directo: especificar subject y body directamente
     * 
     * Ejemplo multicanal:
     * {
     *   "channels": ["EMAIL", "SMS"],
     *   "recipient": "user@example.com",
     *   "templateType": "ORDER_CONFIRMATION",
     *   "variables": {"orderNumber": "12345"},
     *   "continueOnError": true
     * }
     * 
     * @param request Datos de la notificación
     * @param authentication Contexto de seguridad (inyectado automáticamente)
     * @return Respuesta con el resultado del envío por cada canal
     */
    @PostMapping("/send")
    public ResponseEntity<NotificationResponse> sendNotification(
            @Valid @RequestBody NotificationRequest request,
            Authentication authentication
    ) {
        String requester = authentication != null ? authentication.getName() : "unknown";
        
        log.info("Notification request received from service: {}, channels: {}, recipient: {}", 
                requester, request.getChannels(), maskRecipient(request.getRecipient()));
        
        try {
            // Validar que al menos tenga templateType o body
            if (request.getTemplateType() == null && request.getBody() == null) {
                return ResponseEntity.badRequest()
                        .body(NotificationResponse.builder()
                                .success(false)
                                .message("Either templateType or body must be provided")
                                .channelResults(java.util.List.of())
                                .timestamp(java.time.LocalDateTime.now())
                                .build());
            }
            
            // Agregar metadata de auditoría
            if (request.getMetadata() == null) {
                request.setMetadata(new HashMap<>());
            }
            request.getMetadata().put("requestedBy", requester);
            request.getMetadata().put("requestTimestamp", java.time.LocalDateTime.now().toString());
            
            NotificationResponse response = notificationService.processNotification(request);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error processing notification request: {}", e.getMessage(), e);
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(NotificationResponse.builder()
                            .success(false)
                            .message("Failed to send notification: " + e.getMessage())
                            .channelResults(java.util.List.of())
                            .timestamp(java.time.LocalDateTime.now())
                            .build());
        }
    }
    
    /**
     * Endpoint de health check específico del servicio de notificaciones.
     * 
     * @return Estado del servicio
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "notification-service");
        health.put("timestamp", java.time.LocalDateTime.now());
        
        return ResponseEntity.ok(health);
    }
    
    /**
     * Enmascara el destinatario para logging (privacidad).
     * 
     * @param recipient Email o teléfono
     * @return Versión enmascarada
     */
    private String maskRecipient(String recipient) {
        if (recipient == null) {
            return "****";
        }
        if (recipient.contains("@")) {
            String[] parts = recipient.split("@");
            String localPart = parts[0];
            String maskedLocal = localPart.length() > 2 
                    ? localPart.substring(0, 2) + "****" 
                    : "****";
            return maskedLocal + "@" + parts[1];
        } else {
            String cleanNumber = recipient.replace("whatsapp:", "").replace("+", "");
            if (cleanNumber.length() < 4) {
                return "****";
            }
            return cleanNumber.substring(0, cleanNumber.length() - 4) + "****";
        }
    }
}
