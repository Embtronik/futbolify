package io.github.giovanny.notifications.service.provider;

import io.github.giovanny.notifications.domain.enums.Channel;
import io.github.giovanny.notifications.domain.model.NotificationRequest;
import io.github.giovanny.notifications.domain.model.NotificationResponse;
import io.github.giovanny.notifications.exception.NotificationException;

/**
 * Interface común para todos los proveedores de notificación.
 * Implementar esta interfaz permite intercambiar proveedores sin modificar código.
 */
public interface NotificationProvider {
    
    /**
     * Envía una notificación usando el proveedor específico
     * @param request Detalles de la notificación a enviar
     * @return Respuesta con el resultado del envío
     * @throws NotificationException si ocurre un error durante el envío
     */
    NotificationResponse send(NotificationRequest request) throws NotificationException;
    
    /**
     * Verifica si este proveedor soporta el canal especificado
     * @param channel Canal de comunicación (EMAIL, SMS, WHATSAPP)
     * @return true si el proveedor soporta este canal
     */
    boolean supports(Channel channel);
    
    /**
     * Retorna el nombre identificador del proveedor
     * @return Nombre del proveedor (ej: "TWILIO_SMS", "SENDGRID_EMAIL")
     */
    String getProviderName();
}
