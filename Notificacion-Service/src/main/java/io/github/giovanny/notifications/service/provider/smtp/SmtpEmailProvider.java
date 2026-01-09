package io.github.giovanny.notifications.service.provider.smtp;

import io.github.giovanny.notifications.config.ProviderProperties;
import io.github.giovanny.notifications.domain.enums.Channel;
import io.github.giovanny.notifications.domain.enums.NotificationStatus;
import io.github.giovanny.notifications.domain.enums.ProviderType;
import io.github.giovanny.notifications.domain.model.NotificationRequest;
import io.github.giovanny.notifications.domain.model.NotificationResponse;
import io.github.giovanny.notifications.exception.NotificationException;
import io.github.giovanny.notifications.service.provider.NotificationProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import jakarta.mail.internet.MimeMessage;

import java.time.LocalDateTime;
import java.util.Properties;
import java.util.UUID;

/**
 * Proveedor de Email mediante SMTP genérico.
 * Soporta Gmail, Outlook, servidores corporativos, etc.
 * 
 * Configuración requerida:
 * - notification.providers.email.type=smtp
 * - notification.providers.email.smtp.host
 * - notification.providers.email.smtp.port
 * - notification.providers.email.smtp.username
 * - notification.providers.email.smtp.password
 * - notification.providers.email.smtp.from
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(
    prefix = "notification.providers.email",
    name = "type",
    havingValue = "smtp"
)
public class SmtpEmailProvider implements NotificationProvider {
    
    private final ProviderProperties providerProperties;
    private JavaMailSender mailSender;
    
    @Override
    public NotificationResponse send(NotificationRequest request) throws NotificationException {
        UUID notificationId = UUID.randomUUID();
        ProviderProperties.SmtpConfig config = providerProperties.getEmail().getSmtp();
        
        try {
            // Validaciones
            if (!StringUtils.hasText(config.getHost())) {
                throw new NotificationException("SMTP host is not configured");
            }
            if (!StringUtils.hasText(config.getUsername())) {
                throw new NotificationException("SMTP username is not configured");
            }
            if (!StringUtils.hasText(config.getPassword())) {
                throw new NotificationException("SMTP password is not configured");
            }
            
            // Inicializar JavaMailSender si aún no existe
            if (mailSender == null) {
                mailSender = createMailSender(config);
            }
            
            // Preparar mensaje MIME para soportar HTML
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            
            helper.setFrom(config.getFrom());
            helper.setTo(request.getRecipient());
            helper.setSubject(request.getSubject() != null ? request.getSubject() : "Notification");
            helper.setText(request.getBody(), true); // true = HTML
            
            // Enviar
            log.info("Attempting SMTP send: Host={}, Port={}, User={}, SSL={}", 
                    config.getHost(), config.getPort(), 
                    maskEmail(config.getUsername()),
                    config.getPort() == 465);
            
            mailSender.send(mimeMessage);
            
            log.info("HTML Email sent successfully via SMTP. To: {}, Subject: {}", 
                    maskEmail(request.getRecipient()), helper.getMimeMessage().getSubject());
            
            NotificationResponse.ChannelResult result = NotificationResponse.ChannelResult.builder()
                    .notificationId(notificationId)
                    .channel(Channel.EMAIL)
                    .provider(ProviderType.SMTP_EMAIL)
                    .status(NotificationStatus.SENT)
                    .success(true)
                    .message("Email sent successfully via SMTP")
                    .build();
            
            return NotificationResponse.builder()
                    .success(true)
                    .message("Email sent successfully via SMTP")
                    .channelResults(java.util.List.of(result))
                    .timestamp(LocalDateTime.now())
                    .build();
            
        } catch (org.springframework.mail.MailAuthenticationException e) {
            log.error("╔════════════════════════════════════════════════════════════╗");
            log.error("║  SMTP AUTHENTICATION FAILED                                ║");
            log.error("╠════════════════════════════════════════════════════════════╣");
            log.error("║  Host: {}                                    ║", config.getHost());
            log.error("║  Port: {}                                              ║", config.getPort());
            log.error("║  User: {}                       ║", maskEmail(config.getUsername()));
            log.error("╠════════════════════════════════════════════════════════════╣");
            log.error("║  POSSIBLE SOLUTIONS:                                       ║");
            log.error("║  1. Generate Zoho App Password:                           ║");
            log.error("║     https://accounts.zoho.com/home#security/app-passwords ║");
            log.error("║  2. Enable 'Less Secure Apps' in Zoho Settings            ║");
            log.error("║  3. Verify username/password are correct                  ║");
            log.error("║  4. Check if 2FA is enabled (requires App Password)       ║");
            log.error("╚════════════════════════════════════════════════════════════╝");
            log.error("Error: {}", e.getMessage());
            
            NotificationResponse.ChannelResult result = NotificationResponse.ChannelResult.builder()
                    .notificationId(notificationId)
                    .channel(Channel.EMAIL)
                    .provider(ProviderType.SMTP_EMAIL)
                    .status(NotificationStatus.FAILED)
                    .success(false)
                    .message("SMTP Authentication failed")
                    .errorMessage("Authentication failed - Check credentials or create Zoho App Password")
                    .build();
            
            return NotificationResponse.builder()
                    .success(false)
                    .message("SMTP Authentication failed")
                    .channelResults(java.util.List.of(result))
                    .timestamp(LocalDateTime.now())
                    .build();
                    
        } catch (Exception e) {
            log.error("Failed to send email via SMTP to {}: {}", 
                    maskEmail(request.getRecipient()), e.getMessage());
            log.error("Error type: {}", e.getClass().getSimpleName());
            
            NotificationResponse.ChannelResult result = NotificationResponse.ChannelResult.builder()
                    .notificationId(notificationId)
                    .channel(Channel.EMAIL)
                    .provider(ProviderType.SMTP_EMAIL)
                    .status(NotificationStatus.FAILED)
                    .success(false)
                    .message("Error al enviar")
                    .errorMessage(e.getMessage() != null ? e.getMessage() : "Unknown SMTP error")
                    .build();
            
            return NotificationResponse.builder()
                    .success(false)
                    .message("Failed to send email notification via SMTP")
                    .channelResults(java.util.List.of(result))
                    .timestamp(LocalDateTime.now())
                    .build();
        }
    }
    
    /**
     * Crea y configura el JavaMailSender con la configuración SMTP.
     */
    private JavaMailSender createMailSender(ProviderProperties.SmtpConfig config) {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(config.getHost());
        mailSender.setPort(config.getPort());
        mailSender.setUsername(config.getUsername());
        mailSender.setPassword(config.getPassword());
        
        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        
        // Configuración específica según el puerto
        if (config.getPort() == 465) {
            // Puerto 465: SSL directo (SMTPS)
            props.put("mail.smtp.ssl.enable", "true");
            props.put("mail.smtp.ssl.trust", config.getHost());
            props.put("mail.smtp.socketFactory.port", "465");
            props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
        } else {
            // Puerto 587: STARTTLS
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
            props.put("mail.smtp.ssl.trust", config.getHost());
        }
        
        props.put("mail.debug", "false");
        
        // Timeouts
        props.put("mail.smtp.connectiontimeout", "5000");
        props.put("mail.smtp.timeout", "5000");
        props.put("mail.smtp.writetimeout", "5000");
        
        log.info("SMTP Email Provider initialized: host={}, port={}, user={}, ssl={}", 
                config.getHost(), config.getPort(), config.getUsername(), 
                config.getPort() == 465);
        
        return mailSender;
    }
    
    @Override
    public boolean supports(Channel channel) {
        return Channel.EMAIL == channel;
    }
    
    @Override
    public String getProviderName() {
        return ProviderType.SMTP_EMAIL.name();
    }
    
    /**
     * Enmascara email para logging (privacidad).
     */
    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "****";
        }
        String[] parts = email.split("@");
        String localPart = parts[0];
        String maskedLocal = localPart.length() > 2 
                ? localPart.substring(0, 2) + "****" 
                : "****";
        return maskedLocal + "@" + parts[1];
    }
}
