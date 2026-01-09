package io.github.giovanny.notifications.service;

import io.github.giovanny.notifications.domain.entity.NotificationLog;
import io.github.giovanny.notifications.domain.enums.NotificationStatus;
import io.github.giovanny.notifications.domain.model.NotificationRequest;
import io.github.giovanny.notifications.domain.model.NotificationResponse;
import io.github.giovanny.notifications.repository.NotificationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationPersistenceService {
    
    private final NotificationLogRepository notificationLogRepository;
    
    @Transactional
    public NotificationLog createPending(NotificationRequest request) {
        // Para multicanal, usar el primer canal para el log individual
        io.github.giovanny.notifications.domain.enums.Channel channel = 
            request.getChannels() != null && !request.getChannels().isEmpty() 
                ? request.getChannels().get(0) 
                : null;
        
        NotificationLog notificationLog = NotificationLog.builder()
                .channel(channel)
                .recipient(request.getRecipient())
                .subject(request.getSubject())
                .body(request.getBody())
                .status(NotificationStatus.PENDING)
                .metadata(request.getMetadata())
                .build();
        
        NotificationLog saved = notificationLogRepository.save(notificationLog);
        log.info("Created notification log with PENDING status. ID: {}, Channel: {}, Recipient: {}", 
                saved.getId(), saved.getChannel(), maskRecipient(saved.getRecipient()));
        
        return saved;
    }
    
    @Transactional
    public void markAsSent(UUID notificationId, io.github.giovanny.notifications.domain.enums.ProviderType provider) {
        notificationLogRepository.findById(notificationId).ifPresent(notificationLog -> {
            notificationLog.setStatus(NotificationStatus.SENT);
            notificationLog.setProvider(provider);
            notificationLog.setSentAt(LocalDateTime.now());
            notificationLogRepository.save(notificationLog);
            
            log.info("Marked notification as SENT. ID: {}, Provider: {}", 
                    notificationId, provider);
        });
    }
    
    @Transactional
    public void markAsFailed(UUID notificationId, String errorMessage) {
        notificationLogRepository.findById(notificationId).ifPresent(notificationLog -> {
            notificationLog.setStatus(NotificationStatus.FAILED);
            notificationLog.setErrorMessage(errorMessage);
            notificationLogRepository.save(notificationLog);
            
            log.error("Marked notification as FAILED. ID: {}, Error: {}", 
                    notificationId, errorMessage);
        });
    }
    
    @Transactional
    public void markAsRetrying(UUID notificationId) {
        notificationLogRepository.findById(notificationId).ifPresent(notificationLog -> {
            notificationLog.setStatus(NotificationStatus.RETRYING);
            notificationLogRepository.save(notificationLog);
            
            log.warn("Marked notification as RETRYING. ID: {}", notificationId);
        });
    }
    
    private String maskRecipient(String recipient) {
        if (recipient == null) {
            return "****";
        }
        if (recipient.contains("@")) {
            // Email
            String[] parts = recipient.split("@");
            String localPart = parts[0];
            String maskedLocal = localPart.length() > 2 
                    ? localPart.substring(0, 2) + "****" 
                    : "****";
            return maskedLocal + "@" + parts[1];
        } else {
            // Phone number
            String cleanNumber = recipient.replace("whatsapp:", "").replace("+", "");
            if (cleanNumber.length() < 4) {
                return "****";
            }
            return cleanNumber.substring(0, cleanNumber.length() - 4) + "****";
        }
    }
}
