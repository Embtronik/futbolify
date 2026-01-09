package io.github.giovanny.notifications.domain.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonInclude;
import io.github.giovanny.notifications.domain.enums.Channel;
import io.github.giovanny.notifications.domain.enums.TemplateType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NotificationRequest {
    
    /**
     * Canales de comunicación (EMAIL, WHATSAPP, SMS).
     * Puede ser uno o múltiples canales para envío simultáneo.
     */
    @NotEmpty(message = "At least one channel is required")
    private List<Channel> channels;
    
    /**
     * Destinatario de la notificación.
     * Para EMAIL: dirección de correo electrónico.
     * Para SMS/WhatsApp: usar recipientPhone en su lugar.
     * Si se envía solo por un canal, este campo es suficiente.
     */
    @NotBlank(message = "Recipient is required")
    private String recipient;
    
    /**
     * Número de teléfono del destinatario (opcional).
     * Requerido para SMS y WhatsApp en envíos multicanal.
     * Formato: +[código país][número] (ej: +573001234567)
     */
    private String recipientPhone;
    
    /**
     * Tipo de template a utilizar (opcional si se envía body directamente).
     */
    private TemplateType templateType;
    
    /**
     * Variables para renderizar el template.
     * Acepta tanto "variables" como "templateVariables" en el JSON.
     */
    @JsonAlias("templateVariables")
    private Map<String, Object> variables;
    
    /**
     * Subject (opcional si se usa template, requerido si se envía body directo para EMAIL).
     */
    private String subject;
    
    /**
     * Body directo (opcional si se usa templateType).
     */
    private String body;
    
    /**
     * Metadata adicional para auditoría.
     */
    private Map<String, Object> metadata;
    
    /**
     * Indica si se debe continuar enviando por otros canales si uno falla.
     * Default: true (envía por todos los canales disponibles).
     */
    @Builder.Default
    private boolean continueOnError = true;
}
