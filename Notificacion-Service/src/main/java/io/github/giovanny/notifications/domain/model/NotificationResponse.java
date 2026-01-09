package io.github.giovanny.notifications.domain.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.github.giovanny.notifications.domain.enums.Channel;
import io.github.giovanny.notifications.domain.enums.NotificationStatus;
import io.github.giovanny.notifications.domain.enums.ProviderType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NotificationResponse {
    
    /**
     * Indica si la operación fue exitosa globalmente.
     * true si al menos un canal fue exitoso.
     */
    private boolean success;
    
    /**
     * Mensaje general de la operación.
     */
    private String message;
    
    /**
     * Resultados por cada canal procesado.
     */
    private List<ChannelResult> channelResults;
    
    private LocalDateTime timestamp;
    
    /**
     * Resultado del envío por un canal específico.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ChannelResult {
        private UUID notificationId;
        private Channel channel;
        private ProviderType provider;
        private NotificationStatus status;
        private boolean success;
        private String message;
        private String errorMessage;
    }
}
