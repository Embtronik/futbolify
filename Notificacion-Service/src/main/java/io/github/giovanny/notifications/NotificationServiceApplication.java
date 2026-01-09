package io.github.giovanny.notifications;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Aplicación principal del servicio de notificaciones.
 * 
 * Microservicio multicanal para envío de notificaciones por:
 * - Email (SMTP, SendGrid)
 * - SMS (Twilio)
 * - WhatsApp (Twilio)
 * 
 * Características:
 * - API REST con autenticación JWT
 * - Sistema de templates dinámicos con Thymeleaf
 * - Persistencia en PostgreSQL
 * - Soporte multicanal
 */
@SpringBootApplication
public class NotificationServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(NotificationServiceApplication.class, args);
    }
}
