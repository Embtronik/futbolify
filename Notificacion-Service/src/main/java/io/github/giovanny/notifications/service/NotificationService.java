package io.github.giovanny.notifications.service;

import io.github.giovanny.notifications.domain.entity.NotificationLog;
import io.github.giovanny.notifications.domain.model.NotificationRequest;
import io.github.giovanny.notifications.domain.model.NotificationResponse;
import io.github.giovanny.notifications.domain.enums.Channel;
import io.github.giovanny.notifications.domain.enums.ProviderType;
import io.github.giovanny.notifications.exception.NotificationException;
import io.github.giovanny.notifications.exception.ProviderNotConfiguredException;
import io.github.giovanny.notifications.service.provider.NotificationProvider;
import io.github.giovanny.notifications.service.provider.factory.NotificationProviderFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Servicio principal para procesamiento de notificaciones.
 * Soporta envío por múltiples canales simultáneamente.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {
    
    private final NotificationProviderFactory providerFactory;
    private final NotificationPersistenceService persistenceService;
    private final TemplateService templateService;
    
    /**
     * Procesa y envía una notificación por uno o múltiples canales.
     * 
     * @param request Datos de la notificación con lista de canales
     * @return Respuesta con el resultado de cada canal
     */
    @Transactional
    public NotificationResponse processNotification(NotificationRequest request) {
        log.info("Procesando notificación multicanal: canales={}, destinatario={}, tipoTemplate={}", 
                request.getChannels(), 
                maskRecipient(request.getRecipient()),
                request.getTemplateType());
        
        List<NotificationResponse.ChannelResult> channelResults = new ArrayList<>();
        int successCount = 0;
        
        // Procesar cada canal
        for (Channel channel : request.getChannels()) {
            NotificationResponse.ChannelResult result = processChannel(request, channel);
            channelResults.add(result);
            
            if (result.isSuccess()) {
                successCount++;
            } else if (!request.isContinueOnError()) {
                log.warn("Deteniendo procesamiento por error en canal {} (continueOnError=false)", channel);
                break;
            }
        }
        
        boolean globalSuccess = successCount > 0;
        String message = String.format("Enviado exitosamente por %d de %d canales", 
                successCount, channelResults.size());
        
        log.info("Notificación procesada: éxito={}, canales procesados={}, canales exitosos={}", 
                globalSuccess, channelResults.size(), successCount);
        
        return NotificationResponse.builder()
                .success(globalSuccess)
                .message(message)
                .channelResults(channelResults)
                .timestamp(LocalDateTime.now())
                .build();
    }
    
    /**
     * Procesa el envío por un canal específico.
     * 
     * @param request Request original
     * @param channel Canal a procesar
     * @return Resultado del envío por este canal
     */
    private NotificationResponse.ChannelResult processChannel(NotificationRequest request, Channel channel) {
        log.debug("Procesando canal: {}", channel);
        
        try {
            // Renderizar template si se especifica
            String subject = request.getSubject();
            String body = request.getBody();
            
            if (request.getTemplateType() != null) {
                TemplateService.RenderedTemplate rendered = templateService.renderTemplate(
                        request.getTemplateType(),
                        channel,
                        request.getVariables()
                );
                
                subject = rendered.getSubject();
                body = rendered.getBody();
                
                // Agregar metadata del template
                if (request.getMetadata() == null) {
                    request.setMetadata(new java.util.HashMap<>());
                }
                request.getMetadata().put("templateId_" + channel, rendered.getTemplateId().toString());
            }
            
            // Validar body
            if (body == null || body.isBlank()) {
                throw new NotificationException("El body no puede estar vacío para canal " + channel);
            }
            
            // Determinar el destinatario según el canal
            String recipient = determineRecipient(request, channel);
            
            // Crear request específico para este canal
            NotificationRequest channelRequest = NotificationRequest.builder()
                    .channels(List.of(channel))
                    .recipient(recipient)
                    .recipientPhone(request.getRecipientPhone())
                    .subject(subject)
                    .body(body)
                    .metadata(request.getMetadata())
                    .build();
            
            // Persistir con estado PENDING
            NotificationLog notificationLog = persistenceService.createPending(channelRequest);
            
            try {
                // Obtener provider y enviar
                NotificationProvider provider = providerFactory.getProvider(channel);
                NotificationResponse singleResponse = provider.send(channelRequest);
                
                // Extraer el proveedor del primer resultado
                ProviderType providerType = ProviderType.NONE;
                if (singleResponse.getChannelResults() != null && !singleResponse.getChannelResults().isEmpty()) {
                    providerType = singleResponse.getChannelResults().get(0).getProvider();
                }
                
                // Marcar como enviado
                persistenceService.markAsSent(notificationLog.getId(), providerType);
                
                log.info("Notificación enviada por canal {}: id={}, proveedor={}", 
                        channel, notificationLog.getId(), providerType);
                
                return NotificationResponse.ChannelResult.builder()
                        .notificationId(notificationLog.getId())
                        .channel(channel)
                        .provider(providerType)
                        .status(io.github.giovanny.notifications.domain.enums.NotificationStatus.SENT)
                        .success(true)
                        .message("Enviado exitosamente por " + channel)
                        .build();
                
            } catch (ProviderNotConfiguredException e) {
                persistenceService.markAsFailed(notificationLog.getId(), e.getMessage());
                log.error("Proveedor no configurado para canal {}: {}", channel, e.getMessage());
                
                return NotificationResponse.ChannelResult.builder()
                        .notificationId(notificationLog.getId())
                        .channel(channel)
                        .provider(ProviderType.NONE)
                        .status(io.github.giovanny.notifications.domain.enums.NotificationStatus.FAILED)
                        .success(false)
                        .message("Proveedor no configurado")
                        .errorMessage(e.getMessage())
                        .build();
                
            } catch (Exception e) {
                persistenceService.markAsFailed(notificationLog.getId(), e.getMessage());
                log.error("Error al enviar por canal {}: {}", channel, e.getMessage(), e);
                
                return NotificationResponse.ChannelResult.builder()
                        .notificationId(notificationLog.getId())
                        .channel(channel)
                        .provider(ProviderType.NONE)
                        .status(io.github.giovanny.notifications.domain.enums.NotificationStatus.FAILED)
                        .success(false)
                        .message("Error al enviar")
                        .errorMessage(e.getMessage())
                        .build();
            }
            
        } catch (Exception e) {
            log.error("Error procesando canal {}: {}", channel, e.getMessage());
            
            return NotificationResponse.ChannelResult.builder()
                    .channel(channel)
                    .provider(ProviderType.NONE)
                    .status(io.github.giovanny.notifications.domain.enums.NotificationStatus.FAILED)
                    .success(false)
                    .message("Error en procesamiento")
                    .errorMessage(e.getMessage())
                    .build();
        }
    }
    
    /**
     * Enmascara el destinatario para logging (privacidad).
     */
    private String maskRecipient(String recipient) {
        if (recipient == null) {
            return "****";
        }
        if (recipient.contains("@")) {
            String[] parts = recipient.split("@");
            String localPart = parts[0];
            String maskedLocal = localPart.length() > 2 
                    ? localPart.substring(0, 2) + "****" 
                    : "****";
            return maskedLocal + "@" + parts[1];
        } else {
            String cleanNumber = recipient.replace("whatsapp:", "").replace("+", "");
            if (cleanNumber.length() < 4) {
                return "****";
            }
            return cleanNumber.substring(0, cleanNumber.length() - 4) + "****";
        }
    }
    
    /**
     * Determina el destinatario correcto según el canal.
     * - EMAIL: usa recipient (email)
     * - SMS/WhatsApp: usa recipientPhone si está disponible, sino recipient
     */
    private String determineRecipient(NotificationRequest request, Channel channel) {
        if (channel == Channel.EMAIL) {
            return request.getRecipient();
        }
        
        // Para SMS y WhatsApp, preferir recipientPhone
        if (request.getRecipientPhone() != null && !request.getRecipientPhone().isBlank()) {
            return request.getRecipientPhone();
        }
        
        // Fallback a recipient (por compatibilidad)
        return request.getRecipient();
    }
}
