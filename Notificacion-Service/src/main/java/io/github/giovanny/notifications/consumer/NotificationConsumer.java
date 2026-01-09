package io.github.giovanny.notifications.consumer;

import io.github.giovanny.notifications.domain.model.NotificationRequest;
import io.github.giovanny.notifications.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * RabbitMQ consumer for processing notification messages
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationConsumer {
    
    private final NotificationService notificationService;
    
    /**
     * Consumes messages from the notifications queue and processes them
     * 
     * @param request Notification request from the queue
     */
    @RabbitListener(queues = "${rabbitmq.queue.name}")
    public void consumeNotification(NotificationRequest request) {
        log.info("Received notification from RabbitMQ: channels={}, recipient={}", 
            request.getChannels(), maskRecipient(request.getRecipient()));
        
        try {
            notificationService.processNotification(request);
            log.info("Notification processed successfully from RabbitMQ");
        } catch (Exception e) {
            log.error("Error processing notification from RabbitMQ: {}", e.getMessage(), e);
            // La excepción causará que RabbitMQ maneje el retry según la configuración
            throw e;
        }
    }
    
    private String maskRecipient(String recipient) {
        if (recipient == null || recipient.length() <= 4) {
            return "****";
        }
        int visibleChars = 2;
        int startMask = visibleChars;
        int endMask = recipient.length() - visibleChars;
        return recipient.substring(0, startMask) + "****" + recipient.substring(endMask);
    }
}
