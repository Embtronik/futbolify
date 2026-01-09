package io.github.giovanny.notifications.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@Configuration
@ConfigurationProperties(prefix = "notification.providers")
public class ProviderProperties {
    
    private EmailProvider email = new EmailProvider();
    private WhatsAppProvider whatsapp = new WhatsAppProvider();
    private SmsProvider sms = new SmsProvider();
    
    @Getter
    @Setter
    public static class EmailProvider {
        private String type = "sendgrid";
        private SendGridConfig sendgrid = new SendGridConfig();
        private SmtpConfig smtp = new SmtpConfig();
    }
    
    @Getter
    @Setter
    public static class SendGridConfig {
        private String apiKey;
        private String fromEmail;
        private String fromName;
    }
    
    @Getter
    @Setter
    public static class SmtpConfig {
        private String host;
        private int port = 587;
        private String username;
        private String password;
        private String from;
    }
    
    @Getter
    @Setter
    public static class WhatsAppProvider {
        private String type = "twilio";
        private TwilioConfig twilio = new TwilioConfig();
    }
    
    @Getter
    @Setter
    public static class SmsProvider {
        private String type = "twilio";
        private TwilioConfig twilio = new TwilioConfig();
    }
    
    @Getter
    @Setter
    public static class TwilioConfig {
        private String accountSid;
        private String authToken;
        private String fromNumber;
    }
}
