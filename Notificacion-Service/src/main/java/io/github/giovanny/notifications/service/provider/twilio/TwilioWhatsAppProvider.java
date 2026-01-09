package io.github.giovanny.notifications.service.provider.twilio;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import io.github.giovanny.notifications.config.ProviderProperties;
import io.github.giovanny.notifications.domain.enums.Channel;
import io.github.giovanny.notifications.domain.enums.ProviderType;
import io.github.giovanny.notifications.domain.model.NotificationRequest;
import io.github.giovanny.notifications.domain.model.NotificationResponse;
import io.github.giovanny.notifications.exception.NotificationException;
import io.github.giovanny.notifications.service.provider.NotificationProvider;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "notification.providers.whatsapp", name = "type", havingValue = "twilio")
public class TwilioWhatsAppProvider implements NotificationProvider {
    
    private final ProviderProperties providerProperties;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @PostConstruct
    public void init() {
        ProviderProperties.TwilioConfig config = providerProperties.getWhatsapp().getTwilio();
        
        if (!StringUtils.hasText(config.getAccountSid()) || !StringUtils.hasText(config.getAuthToken())) {
            log.warn("Twilio WhatsApp provider is not properly configured. WhatsApp notifications will fail.");
            return;
        }
        
        Twilio.init(config.getAccountSid(), config.getAuthToken());
        log.info("Twilio WhatsApp provider initialized successfully");
    }
    
    @Override
    public NotificationResponse send(NotificationRequest request) throws NotificationException {
        UUID notificationId = UUID.randomUUID();
        
        try {
            ProviderProperties.TwilioConfig config = providerProperties.getWhatsapp().getTwilio();
            
            if (!StringUtils.hasText(config.getFromNumber())) {
                throw new NotificationException("Twilio WhatsApp FROM number is not configured");
            }
            
            // Usar recipientPhone para WhatsApp (número de teléfono)
            String phoneToUse = StringUtils.hasText(request.getRecipientPhone()) 
                ? request.getRecipientPhone() 
                : request.getRecipient();
            
            // Formatear número en formato E.164 y agregar prefijo whatsapp:
            String phoneNumber = formatE164PhoneNumber(phoneToUse);
            String toNumber = "whatsapp:" + phoneNumber;
            
            Message message;
            
            // Verificar si se está usando Content Template (ContentSID en metadata)
            String contentSid = extractContentSid(request);
            
            if (contentSid != null) {
                // Usar Content Template (plantilla aprobada por WhatsApp)
                log.info("Sending WhatsApp message using Content Template: {}", contentSid);
                
                String contentVariables = extractContentVariables(request);
                String bodyFallback = StringUtils.hasText(request.getBody()) 
                    ? request.getBody() 
                    : "Notification from " + config.getFromNumber();
                
                // Método Twilio con ContentTemplate (5 parámetros)
                // Signature: creator(PhoneNumber to, PhoneNumber from, String contentSid, String contentVariables, String body)
                // Pero el error dice que el primer parámetro debe ser String (PathAccountSid o MessagingServiceSid)
                // Vamos a usar el método con MessagingServiceSid = null
                message = Message.creator(
                        new PhoneNumber(toNumber),  // TO
                        new PhoneNumber(config.getFromNumber()), // FROM
                        bodyFallback                // Body (mensaje de texto plano como fallback)
                )
                .setContentSid(contentSid)
                .setContentVariables(contentVariables)
                .create();
                
            } else {
                // Usar mensaje de texto plano (método tradicional)
                log.info("Sending WhatsApp message using plain text");
                
                message = Message.creator(
                        new PhoneNumber(toNumber),
                        new PhoneNumber(config.getFromNumber()),
                        request.getBody()
                ).create();
            }
            
            log.info("WhatsApp message sent successfully via Twilio. SID: {}, To: {}, Status: {}", 
                    message.getSid(), maskPhoneNumber(phoneToUse), message.getStatus());
            
            NotificationResponse.ChannelResult result = NotificationResponse.ChannelResult.builder()
                    .notificationId(notificationId)
                    .channel(Channel.WHATSAPP)
                    .provider(ProviderType.TWILIO_WHATSAPP)
                    .status(io.github.giovanny.notifications.domain.enums.NotificationStatus.SENT)
                    .success(true)
                    .message("WhatsApp message sent successfully. SID: " + message.getSid())
                    .build();
            
            return NotificationResponse.builder()
                    .success(true)
                    .message("WhatsApp message sent successfully")
                    .channelResults(java.util.List.of(result))
                    .timestamp(java.time.LocalDateTime.now())
                    .build();
            
        } catch (Exception e) {
            String phoneToLog = StringUtils.hasText(request.getRecipientPhone()) 
                ? request.getRecipientPhone() 
                : request.getRecipient();
            log.error("Failed to send WhatsApp message via Twilio to {}: {}", 
                    maskPhoneNumber(phoneToLog), e.getMessage(), e);
            throw new NotificationException("Failed to send WhatsApp notification via Twilio: " + e.getMessage(), e);
        }
    }
    
    /**
     * Extrae el ContentSID de los metadatos o variables de la petición.
     * Twilio requiere este ID para usar plantillas aprobadas.
     */
    private String extractContentSid(NotificationRequest request) {
        if (request.getMetadata() != null && request.getMetadata().containsKey("contentSid")) {
            return request.getMetadata().get("contentSid").toString();
        }
        if (request.getVariables() != null && request.getVariables().containsKey("contentSid")) {
            return request.getVariables().get("contentSid").toString();
        }
        return null;
    }
    
    /**
     * Extrae y serializa las variables de contenido para la plantilla.
     * Formato esperado por Twilio: JSON string {"1":"valor1","2":"valor2"}
     */
    private String extractContentVariables(NotificationRequest request) {
        if (request.getVariables() == null || request.getVariables().isEmpty()) {
            return "{}";
        }
        
        // Filtrar contentSid de las variables (no debe incluirse en contentVariables)
        Map<String, Object> contentVars = request.getVariables().entrySet().stream()
                .filter(entry -> !"contentSid".equals(entry.getKey()))
                .collect(java.util.stream.Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue
                ));
        
        try {
            return objectMapper.writeValueAsString(contentVars);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize content variables, using empty object: {}", e.getMessage());
            return "{}";
        }
    }
    
    @Override
    public boolean supports(Channel channel) {
        return Channel.WHATSAPP == channel;
    }
    
    @Override
    public String getProviderName() {
        return ProviderType.TWILIO_WHATSAPP.name();
    }
    
    private String maskPhoneNumber(String phoneNumber) {
        String cleanNumber = phoneNumber.replace("whatsapp:", "");
        if (cleanNumber.length() < 4) {
            return "****";
        }
        return cleanNumber.substring(0, cleanNumber.length() - 4) + "****";
    }
    
    /**
     * Formatea un número de teléfono al formato E.164.
     * Formato: +[código país][número]
     * Ejemplo: +573001234567
     */
    private String formatE164PhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            throw new NotificationException("Phone number is required for WhatsApp");
        }
        
        // Remover prefijo whatsapp: si existe
        String cleaned = phoneNumber.replace("whatsapp:", "");
        
        // Limpiar espacios, guiones, paréntesis
        cleaned = cleaned.replaceAll("[\\s\\-\\(\\)]", "");
        
        // Si ya tiene +, validar que sea válido
        if (cleaned.startsWith("+")) {
            if (cleaned.length() < 10) {
                throw new NotificationException("Invalid phone number format. Expected E.164 format: +[country code][number]");
            }
            return cleaned;
        }
        
        // Si no tiene +, agregarlo (asumiendo que ya incluye código de país)
        if (cleaned.length() < 10) {
            throw new NotificationException("Invalid phone number. Must include country code (e.g., +573001234567)");
        }
        
        return "+" + cleaned;
    }
}
