package io.github.giovanny.notifications.domain.enums;

/**
 * Tipos de templates de notificación disponibles en el sistema.
 * Cada tipo corresponde a un caso de uso específico de negocio.
 */
public enum TemplateType {
    /**
     * Email de bienvenida al registrarse en la plataforma
     */
    WELCOME_EMAIL,
    
    /**
     * Email de verificación de cuenta
     */
    EMAIL_VERIFICATION,
    
    /**
     * Email de recuperación de contraseña
     */
    PASSWORD_RESET,
    
    /**
     * Notificación de nueva orden/pedido
     */
    ORDER_CONFIRMATION,
    
    /**
     * Actualización de estado de orden
     */
    ORDER_STATUS_UPDATE,
    
    /**
     * Notificación de pago recibido
     */
    PAYMENT_RECEIVED,
    
    /**
     * Notificación de pago fallido
     */
    PAYMENT_FAILED,
    
    /**
     * Alerta de seguridad (login desde nuevo dispositivo, etc.)
     */
    SECURITY_ALERT,
    
    /**
     * Recordatorio de cita/evento
     */
    APPOINTMENT_REMINDER,
    
    /**
     * Notificación general personalizable
     */
    CUSTOM_NOTIFICATION
}
