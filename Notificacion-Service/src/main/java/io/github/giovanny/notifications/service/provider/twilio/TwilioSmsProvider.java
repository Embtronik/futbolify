package io.github.giovanny.notifications.service.provider.twilio;

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

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "notification.providers.sms", name = "type", havingValue = "twilio")
public class TwilioSmsProvider implements NotificationProvider {
    
    private final ProviderProperties providerProperties;
    
    @PostConstruct
    public void init() {
        ProviderProperties.TwilioConfig config = providerProperties.getSms().getTwilio();
        
        if (!StringUtils.hasText(config.getAccountSid()) || !StringUtils.hasText(config.getAuthToken())) {
            log.warn("Twilio SMS provider is not properly configured. SMS notifications will fail.");
            return;
        }
        
        Twilio.init(config.getAccountSid(), config.getAuthToken());
        log.info("Twilio SMS provider initialized successfully");
    }
    
    @Override
    public NotificationResponse send(NotificationRequest request) throws NotificationException {
        UUID notificationId = UUID.randomUUID();
        
        try {
            ProviderProperties.TwilioConfig config = providerProperties.getSms().getTwilio();
            
            if (!StringUtils.hasText(config.getFromNumber())) {
                throw new NotificationException("Twilio FROM number is not configured");
            }
            
            // Validar y formatear número de teléfono en formato E.164
            String toNumber = formatE164PhoneNumber(request.getRecipient());
            
            Message message = Message.creator(
                    new PhoneNumber(toNumber),
                    new PhoneNumber(config.getFromNumber()),
                    request.getBody()
            ).create();
            
            log.info("SMS sent successfully via Twilio. SID: {}, To: {}", 
                    message.getSid(), maskPhoneNumber(request.getRecipient()));
            
            NotificationResponse.ChannelResult result = NotificationResponse.ChannelResult.builder()
                    .notificationId(notificationId)
                    .channel(Channel.SMS)
                    .provider(ProviderType.TWILIO_SMS)
                    .status(io.github.giovanny.notifications.domain.enums.NotificationStatus.SENT)
                    .success(true)
                    .message("SMS sent successfully")
                    .build();
            
            return NotificationResponse.builder()
                    .success(true)
                    .message("SMS sent successfully")
                    .channelResults(java.util.List.of(result))
                    .timestamp(java.time.LocalDateTime.now())
                    .build();
            
        } catch (Exception e) {
            log.error("Failed to send SMS via Twilio to {}: {}", 
                    maskPhoneNumber(request.getRecipient()), e.getMessage());
            throw new NotificationException("Failed to send SMS notification via Twilio", e);
        }
    }
    
    @Override
    public boolean supports(Channel channel) {
        return Channel.SMS == channel;
    }
    
    @Override
    public String getProviderName() {
        return ProviderType.TWILIO_SMS.name();
    }
    
    private String maskPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.length() < 4) {
            return "****";
        }
        return phoneNumber.substring(0, phoneNumber.length() - 4) + "****";
    }
    
    /**
     * Formatea un número de teléfono al formato E.164.
     * Formato: +[código país][número]
     * Ejemplo: +573001234567
     */
    private String formatE164PhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            throw new NotificationException("Phone number is required for SMS");
        }
        
        // Limpiar espacios, guiones, paréntesis
        String cleaned = phoneNumber.replaceAll("[\\s\\-\\(\\)]", "");
        
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
