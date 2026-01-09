package io.github.giovanny.notifications.service.provider.sendgrid;

import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import io.github.giovanny.notifications.config.ProviderProperties;
import io.github.giovanny.notifications.domain.enums.Channel;
import io.github.giovanny.notifications.domain.enums.ProviderType;
import io.github.giovanny.notifications.domain.model.NotificationRequest;
import io.github.giovanny.notifications.domain.model.NotificationResponse;
import io.github.giovanny.notifications.exception.NotificationException;
import io.github.giovanny.notifications.service.provider.NotificationProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "notification.providers.email", name = "type", havingValue = "sendgrid")
public class SendGridEmailProvider implements NotificationProvider {
    
    private final ProviderProperties providerProperties;
    
    @Override
    public NotificationResponse send(NotificationRequest request) throws NotificationException {
        UUID notificationId = UUID.randomUUID();
        
        try {
            ProviderProperties.SendGridConfig config = providerProperties.getEmail().getSendgrid();
            
            if (!StringUtils.hasText(config.getApiKey())) {
                throw new NotificationException("SendGrid API key is not configured");
            }
            
            Email from = new Email(config.getFromEmail(), config.getFromName());
            Email to = new Email(request.getRecipient());
            String subject = request.getSubject() != null ? request.getSubject() : "Notification";
            Content content = new Content("text/plain", request.getBody());
            
            Mail mail = new Mail(from, subject, to, content);
            
            SendGrid sg = new SendGrid(config.getApiKey());
            Request sgRequest = new Request();
            sgRequest.setMethod(Method.POST);
            sgRequest.setEndpoint("mail/send");
            sgRequest.setBody(mail.build());
            
            Response response = sg.api(sgRequest);
            
            if (response.getStatusCode() >= 200 && response.getStatusCode() < 300) {
                log.info("Email sent successfully via SendGrid. To: {}, Subject: {}", 
                        maskEmail(request.getRecipient()), subject);
                
                NotificationResponse.ChannelResult result = NotificationResponse.ChannelResult.builder()
                        .notificationId(notificationId)
                        .channel(Channel.EMAIL)
                        .provider(ProviderType.SENDGRID_EMAIL)
                        .status(io.github.giovanny.notifications.domain.enums.NotificationStatus.SENT)
                        .success(true)
                        .message("Email sent successfully")
                        .build();
                
                return NotificationResponse.builder()
                        .success(true)
                        .message("Email sent successfully")
                        .channelResults(java.util.List.of(result))
                        .timestamp(java.time.LocalDateTime.now())
                        .build();
            } else {
                throw new NotificationException(
                        "SendGrid API returned status code: " + response.getStatusCode());
            }
            
        } catch (IOException e) {
            log.error("Failed to send email via SendGrid to {}: {}", 
                    maskEmail(request.getRecipient()), e.getMessage());
            throw new NotificationException("Failed to send email notification via SendGrid", e);
        }
    }
    
    @Override
    public boolean supports(Channel channel) {
        return Channel.EMAIL == channel;
    }
    
    @Override
    public String getProviderName() {
        return ProviderType.SENDGRID_EMAIL.name();
    }
    
    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "****@****";
        }
        String[] parts = email.split("@");
        String localPart = parts[0];
        String maskedLocal = localPart.length() > 2 
                ? localPart.substring(0, 2) + "****" 
                : "****";
        return maskedLocal + "@" + parts[1];
    }
}
