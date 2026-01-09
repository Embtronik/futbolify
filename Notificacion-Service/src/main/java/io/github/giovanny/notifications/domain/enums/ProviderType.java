package io.github.giovanny.notifications.domain.enums;

public enum ProviderType {
    NONE,
    TWILIO_SMS,
    TWILIO_WHATSAPP,
    SENDGRID_EMAIL,
    SMTP_EMAIL,
    AWS_SES,
    AWS_SNS,
    VONAGE_SMS
}
